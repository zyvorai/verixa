"""Local console + authenticated JSON API. Bounded synchronous rehearsals."""
import hashlib
import hmac
import json
import mimetypes
import secrets
import ssl
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from . import __version__
from .agents import DemoAgent, ReplayAgent
from .engine import ValidationError, compare, run

STATIC = Path(__file__).parent / "static"
ASSETS = {"/": "index.html", "/app.js": "app.js", "/styles.css": "styles.css", "/favicon.svg": "favicon.svg", "/zyvor-mark.svg": "zyvor-mark.svg", "/zyvor-logomark.svg": "zyvor-logomark.svg"}
SESSION_COOKIE = "verixa_session"
SESSION_TTL = 12 * 3600

def mint_session(token, expires):
    sig = hmac.new(token.encode(), str(expires).encode(), hashlib.sha256).hexdigest()
    return f"{expires}.{sig}"

def session_valid(token, value, now=None):
    expires, _, sig = value.partition(".")
    if not expires.isdigit() or len(sig) != 64:
        return False
    if (now or time.time()) > int(expires):
        return False
    return hmac.compare_digest(sig, mint_session(token, int(expires)).partition(".")[2])

def read_cookie(header, name):
    for part in header.split(";"):
        key, _, value = part.strip().partition("=")
        if key == name:
            return value
    return ""

def make_server(store, host="127.0.0.1", port=8788, token=None, allowed_hosts=(), tls_cert=None, tls_key=None):
    token = token or secrets.token_urlsafe(32)
    if len(token) < 8:
        raise ValidationError("API token must be at least 8 characters")
    tls = bool(tls_cert and tls_key)
    scheme = "https" if tls else "http"
    extra_hosts = {h.strip() for h in allowed_hosts if h and h.strip()}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass  # Never log tokens, scenario inputs or request paths.

        def reply(self, status, body, content_type="application/json", cookie=None):
            data = body if isinstance(body, bytes) else json.dumps(body, allow_nan=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            if tls:
                self.send_header("Strict-Transport-Security", "max-age=31536000")
            if cookie is not None:
                self.send_header("Set-Cookie", cookie)
            self.end_headers()
            self.wfile.write(data)

        def guard(self):
            port_ = self.server.server_port
            allowed = {f"{host}:{port_}", f"localhost:{port_}", f"127.0.0.1:{port_}"} | extra_hosts
            request_host = self.headers.get("Host", "")
            if request_host not in allowed:
                self.reply(403, {"error": "Unrecognized Host"})
                return False
            origin = self.headers.get("Origin")
            if origin and origin != f"{scheme}://{request_host}":
                self.reply(403, {"error": "Cross-origin requests are disabled"})
                return False
            return True

        def has_session(self):
            value = read_cookie(self.headers.get("Cookie", ""), SESSION_COOKIE)
            return bool(value) and session_valid(token, value)

        def authorized(self):
            if hmac.compare_digest(self.headers.get("Authorization", "").encode(), ("Bearer " + token).encode()) or self.has_session():
                return True
            self.reply(401, {"error": "Sign in to continue"})
            return False

        def session_cookie(self, value, max_age):
            return f"{SESSION_COOKIE}={value}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Strict" + ("; Secure" if tls else "")

        def read_body(self):
            if self.headers.get("Transfer-Encoding"):
                raise ValidationError("Chunked requests unsupported")
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 256_000:
                return None
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                raise TypeError("content-type")
            body = json.loads(self.rfile.read(size), parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Nonfinite JSON")))
            if not isinstance(body, dict):
                raise ValidationError("Body must be an object")
            return body

        def do_GET(self):
            if not self.guard():
                return
            path = urlsplit(self.path).path
            if path == "/healthz":
                return self.reply(200, {"status": "ok", "version": __version__})
            if path.startswith("/api/"):
                if path == "/api/v1/session":
                    return self.reply(200, {"authenticated": self.has_session(), "ttl_seconds": SESSION_TTL, "tls": tls})
                if not self.authorized():
                    return
                if path == "/api/v1/scenarios":
                    return self.reply(200, store.scenarios())
                if path == "/api/v1/runs":
                    return self.reply(200, store.runs())
                if path.startswith("/api/v1/runs/"):
                    r = store.run(path.rsplit("/", 1)[-1])
                    return self.reply(200 if r else 404, r or {"error": "Run not found"})
                return self.reply(404, {"error": "Route not found"})
            if path not in ASSETS:
                return self.reply(404, {"error": "Not found"})
            file = STATIC / ASSETS[path]
            return self.reply(200, file.read_bytes(), mimetypes.guess_type(file)[0] or "application/octet-stream")

        def do_DELETE(self):
            if not self.guard():
                return
            if urlsplit(self.path).path == "/api/v1/session":
                return self.reply(200, {"ok": True}, cookie=self.session_cookie("", 0))
            return self.reply(404, {"error": "Route not found"})

        def do_POST(self):
            if not self.guard():
                return
            path = urlsplit(self.path).path
            try:
                if path == "/api/v1/session":
                    body = self.read_body()
                    if body is None:
                        return self.reply(413, {"error": "Body must be 1–256000 bytes"})
                    supplied = body.get("token")
                    if not isinstance(supplied, str) or not hmac.compare_digest(supplied.strip().encode(), token.encode()):
                        return self.reply(401, {"error": "Invalid API token"})
                    value = mint_session(token, int(time.time()) + SESSION_TTL)
                    return self.reply(200, {"ok": True, "ttl_seconds": SESSION_TTL}, cookie=self.session_cookie(value, SESSION_TTL))
                if not self.authorized():
                    return
                body = self.read_body()
                if body is None:
                    return self.reply(413, {"error": "Body must be 1–256000 bytes"})
                if path == "/api/v1/scenarios":
                    return self.reply(201, store.save_scenario(body))
                if path == "/api/v1/runs":
                    if set(body) - {"scenario_id", "agent", "actions"}:
                        raise ValidationError("Unknown run fields")
                    if not isinstance(body.get("scenario_id"), str):
                        raise ValidationError("scenario_id required")
                    s = store.scenario(body["scenario_id"])
                    if not s:
                        return self.reply(404, {"error": "Scenario not found"})
                    variant = body.get("agent", "reference")
                    agent = ReplayAgent(body.get("actions")) if variant == "replay" else DemoAgent(variant)
                    return self.reply(201, store.save_run(run(s, agent)))
                if path == "/api/v1/compare":
                    if set(body) != {"baseline_id", "candidate_id"} or any(not isinstance(x, str) for x in body.values()):
                        raise ValidationError("Two run IDs required")
                    b, c = store.run(body["baseline_id"]), store.run(body["candidate_id"])
                    if not b or not c:
                        return self.reply(404, {"error": "Run not found"})
                    return self.reply(200, compare(b, c))
                return self.reply(404, {"error": "Route not found"})
            except TypeError as exc:
                if str(exc) == "content-type":
                    return self.reply(415, {"error": "Use application/json"})
                return self.reply(400, {"error": "Invalid request"})
            except (ValueError, KeyError, UnicodeError) as exc:
                return self.reply(400, {"error": str(exc) if isinstance(exc, ValidationError) else "Invalid request"})

    class Server(ThreadingHTTPServer):
        daemon_threads = True
        def get_request(self):
            sock, address = super().get_request()
            sock.settimeout(10)
            return sock, address
        def finish_request(self, request, client_address):
            if tls:
                try:
                    request.do_handshake()
                except (OSError, ssl.SSLError):
                    return
            super().finish_request(request, client_address)
        def handle_error(self, request, client_address):
            pass  # Client disconnects and TLS probes are not operator-actionable.

    server = Server((host, port), Handler)
    if tls:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(tls_cert, tls_key)
        server.socket = context.wrap_socket(server.socket, server_side=True, do_handshake_on_connect=False)
    server.api_token = token
    server.scheme = scheme
    return server
