"""CLI exit codes: 0 passed, 1 error, 3 failed rehearsal/regression."""
import argparse
import json
import os
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
from .agents import DemoAgent, ModelAgent, ReplayAgent
from .engine import ValidationError, compare, run, validate_scenario, verify_events
from .store import Store
from .server import make_server

def write_json(path, body):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(body, indent=2) + "\n")

def junit(runs, path):
    suite = ET.Element("testsuite", name="Verixa", tests=str(len(runs)), failures=str(sum(r["verdict"] == "FAIL" for r in runs)))
    for r in runs:
        case = ET.SubElement(suite, "testcase", name=r["scenario_id"], classname=r["agent"], time=str(r["duration_ms"] / 1000))
        if r["verdict"] != "PASS":
            ET.SubElement(case, "failure", message=r["error"] or "Outcome assertions failed").text = "\n".join(x["name"] for x in r["assertions"] if not x["passed"])
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(suite).write(path, encoding="utf-8", xml_declaration=True)

def main(argv=None):
    parser = argparse.ArgumentParser(prog="verixa", description="Rehearse every action. Ship with evidence.")
    parser.add_argument("--db", default=os.environ.get("VERIXA_DB", ".verixa/state.db"))
    sub = parser.add_subparsers(dest="command", required=True)
    serve = sub.add_parser("serve")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8788)
    serve.add_argument("--demo", action="store_true", help="Seed real runs of the scripted demo agents")
    serve.add_argument("--allowed-host", action="append", default=[], help="Extra Host header value (host:port) to accept; repeatable")
    serve.add_argument("--tls-cert", default=os.environ.get("VERIXA_TLS_CERT"))
    serve.add_argument("--tls-key", default=os.environ.get("VERIXA_TLS_KEY"))
    sub.add_parser("list")
    imp = sub.add_parser("import")
    imp.add_argument("file")
    execute = sub.add_parser("run")
    execute.add_argument("scenario", help="Scenario ID or all")
    execute.add_argument("--agent", choices=["reference", "regression", "replay", "model"], default="reference")
    execute.add_argument("--trace")
    execute.add_argument("--allow-model-network", action="store_true")
    execute.add_argument("--output")
    execute.add_argument("--junit")
    execute.add_argument("--max-steps", type=int, default=30)
    comp = sub.add_parser("compare")
    comp.add_argument("baseline")
    comp.add_argument("candidate")
    export = sub.add_parser("export")
    export.add_argument("id")
    export.add_argument("--output", required=True)
    export.add_argument("--trace", action="store_true")
    verify = sub.add_parser("verify")
    verify.add_argument("file")
    args = parser.parse_args(argv)
    try:
        if args.command == "verify":
            r = json.loads(Path(args.file).read_text())
            if not isinstance(r, dict) or not isinstance(r.get("events"), list):
                raise ValidationError("Expected a run export")
            ok = verify_events(r["events"])
            print("Event chain intact" if ok else "Event chain altered")
            return 0 if ok else 3
        store = Store(args.db)
        if args.command == "serve":
            if args.demo and not store.runs(1):
                for s in store.scenarios():
                    store.save_run(run(s, DemoAgent()))
                store.save_run(run(store.scenario("ticket-injection"), DemoAgent("regression")))
            allowed = args.allowed_host + os.environ.get("VERIXA_ALLOWED_HOSTS", "").split(",")
            server = make_server(store, args.host, args.port, os.environ.get("VERIXA_TOKEN"), allowed, args.tls_cert, args.tls_key)
            print(f"Verixa → {server.scheme}://{args.host}:{server.server_port}", flush=True)
            print("API token: " + server.api_token, flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
            finally:
                server.server_close()
            return 0
        if args.command == "list":
            for s in store.scenarios():
                print(s["id"].ljust(25), s["name"])
            return 0
        if args.command == "import":
            s = store.save_scenario(json.loads(Path(args.file).read_text()))
            print("Imported " + s["id"])
            return 0
        if args.command == "run":
            scenarios = store.scenarios() if args.scenario == "all" else [store.scenario(args.scenario)]
            if not all(scenarios):
                raise ValidationError("Unknown scenario")
            results = []
            for s in scenarios:
                if args.agent == "replay":
                    if not args.trace:
                        raise ValidationError("--trace required")
                    agent = ReplayAgent(json.loads(Path(args.trace).read_text()))
                elif args.agent == "model":
                    if not args.allow_model_network:
                        raise ValidationError("Model calls require --allow-model-network; scenario text is sent to the configured provider")
                    agent = ModelAgent(os.environ.get("VERIXA_MODEL_URL", "http://127.0.0.1:11434/v1"), os.environ.get("VERIXA_MODEL", ""), os.environ.get("VERIXA_MODEL_KEY", ""))
                else:
                    agent = DemoAgent(args.agent)
                r = store.save_run(run(s, agent, args.max_steps))
                results.append(r)
                print(r["verdict"], s["id"], r["id"], "checks=" + str(sum(x["passed"] for x in r["assertions"])) + "/" + str(len(r["assertions"])))
            if args.output:
                write_json(args.output, results[0] if len(results) == 1 else results)
            if args.junit:
                junit(results, args.junit)
            return 0 if all(r["verdict"] == "PASS" for r in results) else 3
        if args.command == "compare":
            b, c = store.run(args.baseline), store.run(args.candidate)
            if not b or not c:
                raise ValidationError("Unknown run ID")
            result = compare(b, c)
            print(json.dumps(result, indent=2))
            return 0 if result["verdict"] == "PASS" else 3
        if args.command == "export":
            r = store.run(args.id)
            if not r:
                raise ValidationError("Unknown run ID")
            write_json(args.output, [{"tool": e["tool"], "args": e["args"]} for e in r["events"]] if args.trace else r)
            return 0
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print("Error: " + str(exc), file=sys.stderr)
        return 1
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
