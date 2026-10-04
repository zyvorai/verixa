"""Deterministic simulated tools; no production systems are called."""
from __future__ import annotations
import copy
import hashlib
import json
import math
import re
import time
import uuid
from typing import Any

TOOLS = {
    "order.get": {"order_id": "string"},
    "refund.create": {"order_id": "string", "amount_cents": "integer", "idempotency_key": "string"},
    "approval.request": {"order_id": "string", "amount_cents": "integer"},
    "ticket.get": {"ticket_id": "string"},
    "ticket.close": {"ticket_id": "string", "resolution": "string"},
    "deployment.get": {"name": "string"},
    "deployment.scale": {"name": "string", "replicas": "integer"},
}
FAULTS = {"timeout", "commit_timeout", "expired_credentials", "malformed", "rate_limit"}
ID = re.compile(r"^[a-zA-Z0-9_-]{1,80}$")

class ValidationError(ValueError):
    pass

def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)

def validate_action(action: Any) -> dict:
    if not isinstance(action, dict) or set(action) != {"tool", "args"}:
        raise ValidationError("Each action must contain exactly tool and args")
    tool, args = action["tool"], action["args"]
    if not isinstance(tool, str) or tool not in TOOLS:
        raise ValidationError("Unknown tool")
    if not isinstance(args, dict) or set(args) != set(TOOLS[tool]):
        raise ValidationError("Arguments do not match tool schema: " + tool)
    for key, typ in TOOLS[tool].items():
        value = args[key]
        if typ == "integer" and (type(value) is not int or not 0 <= value <= 10**9):
            raise ValidationError(key + " must be a nonnegative integer")
        if typ == "string" and (not isinstance(value, str) or not 1 <= len(value) <= 4000):
            raise ValidationError(key + " must be a nonempty bounded string")
    return copy.deepcopy(action)

def validate_scenario(s: Any) -> dict:
    if not isinstance(s, dict):
        raise ValidationError("Scenario must be an object")
    if set(s) - {"id", "name", "description", "domain", "task", "initial", "policy", "faults", "assertions"}:
        raise ValidationError("Unknown scenario fields")
    for k in ("id", "name", "domain", "task", "initial", "policy", "assertions"):
        if k not in s:
            raise ValidationError("Missing scenario field: " + k)
    for k in ("name", "task", "description"):
        if k in s and (not isinstance(s[k], str) or not 1 <= len(s[k]) <= 8000):
            raise ValidationError("Invalid " + k)
    if not isinstance(s["id"], str) or not ID.fullmatch(s["id"]):
        raise ValidationError("Invalid scenario id")
    if s["domain"] not in ("refunds", "tickets", "infrastructure"):
        raise ValidationError("Unsupported domain")
    initial = s["initial"]
    if not isinstance(initial, dict) or set(initial) - {"orders", "tickets", "deployments"}:
        raise ValidationError("Invalid initial state")
    for collection, schema in (("orders", {"amount_cents": int, "customer": str}), ("tickets", {"body": str, "status": str}), ("deployments", {"replicas": int})):
        items = initial.get(collection, {})
        if not isinstance(items, dict) or len(items) > 100:
            raise ValidationError("Invalid collection: " + collection)
        for key, record in items.items():
            if not isinstance(key, str) or not ID.fullmatch(key) or not isinstance(record, dict) or set(record) != set(schema):
                raise ValidationError("Invalid record: " + collection)
            for field, typ in schema.items():
                v = record[field]
                if type(v) is not typ or (typ is int and not 0 <= v <= 10**9) or (typ is str and not 1 <= len(v) <= 8000):
                    raise ValidationError("Invalid record field: " + field)
    policy = s["policy"]
    if not isinstance(policy, dict) or set(policy) != {"allowed_tools", "refund_limit_cents", "max_replicas", "auto_approve"}:
        raise ValidationError("Invalid policy fields")
    if not isinstance(policy["allowed_tools"], list) or any(not isinstance(t, str) or t not in TOOLS for t in policy["allowed_tools"]):
        raise ValidationError("Invalid allowed tools")
    for k in ("refund_limit_cents", "max_replicas"):
        if type(policy[k]) is not int or not 0 <= policy[k] <= 10**9:
            raise ValidationError("Invalid policy limit")
    if type(policy["auto_approve"]) is not bool:
        raise ValidationError("auto_approve must be boolean")
    faults = s.get("faults", [])
    if not isinstance(faults, list) or len(faults) > 20:
        raise ValidationError("Too many faults")
    seen = set()
    for f in faults:
        if not isinstance(f, dict) or set(f) != {"tool", "occurrence", "kind"} or f["tool"] not in TOOLS or f["kind"] not in FAULTS or type(f["occurrence"]) is not int or not 1 <= f["occurrence"] <= 100:
            raise ValidationError("Invalid fault")
        key = (f["tool"], f["occurrence"])
        if key in seen or (f["kind"] == "commit_timeout" and f["tool"] != "refund.create"):
            raise ValidationError("Ambiguous or unsupported fault")
        seen.add(key)
    assertions = s["assertions"]
    if not isinstance(assertions, list) or not 1 <= len(assertions) <= 50:
        raise ValidationError("Assertions required")
    assertion_names = set()
    for a in assertions:
        if not isinstance(a, dict) or set(a) != {"name", "path", "op", "value"} or not isinstance(a["name"], str) or not 1 <= len(a["name"]) <= 200 or not isinstance(a["path"], str) or not re.fullmatch(r"[a-zA-Z0-9_.-]{1,200}", a["path"]) or a["op"] not in ("eq", "lte", "gte"):
            raise ValidationError("Invalid assertion")
        if a["name"] in assertion_names:
            raise ValidationError("Assertion names must be unique")
        assertion_names.add(a["name"])
    try:
        if len(canonical(s)) > 200_000:
            raise ValidationError("Scenario too large")
    except (TypeError, ValueError) as exc:
        raise ValidationError("Scenario must be finite JSON") from exc
    normalized = copy.deepcopy(s)
    normalized.setdefault("faults", [])
    normalized.setdefault("description", normalized["task"])
    return normalized

class World:
    def __init__(self, scenario: dict):
        self.scenario = validate_scenario(scenario)
        self.state = copy.deepcopy(scenario["initial"])
        for k in ("orders", "tickets", "deployments"):
            self.state.setdefault(k, {})
        self.state.update(refunds=[], approvals=[], violations=[])
        self.events: list[dict] = []
        self.counts: dict[str, int] = {}
        self.keys: dict[str, dict] = {}

    def call(self, action: dict) -> dict:
        action = validate_action(action)
        tool, args = action["tool"], action["args"]
        before = copy.deepcopy(self.state)
        self.counts[tool] = self.counts.get(tool, 0) + 1
        p = self.scenario["policy"]
        deny = None
        if tool not in p["allowed_tools"]:
            deny = "Tool is outside the scenario policy"
        elif tool == "deployment.scale" and args["replicas"] > p["max_replicas"]:
            deny = "Replica limit exceeded"
        elif tool == "refund.create" and args["amount_cents"] > p["refund_limit_cents"]:
            approved = any(x["order_id"] == args["order_id"] and x["amount_cents"] == args["amount_cents"] and x["approved"] for x in self.state["approvals"])
            if not approved:
                deny = "Approval required for this exact order and amount"
        fault = next((f for f in self.scenario.get("faults", []) if f["tool"] == tool and f["occurrence"] == self.counts[tool]), None)
        status = "ok"
        if deny:
            self.state["violations"].append({"tool": tool, "reason": deny})
            result, status = {"error": "policy_denied", "message": deny}, "denied"
        elif fault and fault["kind"] != "commit_timeout":
            result, status = {"error": fault["kind"], "retryable": fault["kind"] in ("timeout", "rate_limit", "malformed")}, "fault"
        else:
            result = self._apply(tool, args)
            if "error" in result:
                status = "error"
            if fault and fault["kind"] == "commit_timeout" and "error" not in result:
                result, status = {"error": "timeout", "retryable": True, "message": "Response lost after commit"}, "fault"
        event = {"sequence": len(self.events) + 1, **action, "status": status, "result": result, "changes": diff(before, self.state), "previous_hash": self.events[-1]["hash"] if self.events else "0" * 64}
        event["hash"] = hashlib.sha256(canonical(event).encode()).hexdigest()
        self.events.append(event)
        return copy.deepcopy(result)

    def _apply(self, tool: str, a: dict) -> dict:
        if tool == "order.get":
            return copy.deepcopy(self.state["orders"].get(a["order_id"], {"error": "not_found"}))
        if tool == "approval.request":
            if a["order_id"] not in self.state["orders"]:
                return {"error": "not_found"}
            x = {**a, "approved": self.scenario["policy"]["auto_approve"]}
            self.state["approvals"].append(x)
            return copy.deepcopy(x)
        if tool == "refund.create":
            k = a["idempotency_key"]
            if k in self.keys:
                old = self.keys[k]
                if old["order_id"] != a["order_id"] or old["amount_cents"] != a["amount_cents"]:
                    return {"error": "idempotency_conflict"}
                return {**old, "deduplicated": True}
            order = self.state["orders"].get(a["order_id"])
            if not order:
                return {"error": "not_found"}
            refunded = sum(x["amount_cents"] for x in self.state["refunds"] if x["order_id"] == a["order_id"])
            if a["amount_cents"] <= 0 or refunded + a["amount_cents"] > order["amount_cents"]:
                return {"error": "invalid_amount"}
            x = {"id": "refund-" + str(len(self.state["refunds"]) + 1), **a}
            self.state["refunds"].append(x)
            self.keys[k] = x
            return copy.deepcopy(x)
        if tool == "ticket.get":
            return copy.deepcopy(self.state["tickets"].get(a["ticket_id"], {"error": "not_found"}))
        if tool == "ticket.close":
            ticket = self.state["tickets"].get(a["ticket_id"])
            if not ticket:
                return {"error": "not_found"}
            ticket.update(status="closed", resolution=a["resolution"])
            return copy.deepcopy(ticket)
        if tool == "deployment.get":
            return copy.deepcopy(self.state["deployments"].get(a["name"], {"error": "not_found"}))
        if tool == "deployment.scale":
            dep = self.state["deployments"].get(a["name"])
            if not dep:
                return {"error": "not_found"}
            dep["replicas"] = a["replicas"]
            return copy.deepcopy(dep)
        raise ValidationError("Unknown tool")

def diff(before: Any, after: Any, path: str = "") -> list[dict]:
    if isinstance(before, dict) and isinstance(after, dict):
        out = []
        for k in sorted(set(before) | set(after)):
            out.extend(diff(before.get(k), after.get(k), (path + "." + k).lstrip(".")))
        return out
    return [] if before == after else [{"path": path, "before": before, "after": after}]

def verify_events(events: list[dict]) -> bool:
    previous = "0" * 64
    for i, event in enumerate(events):
        x = dict(event)
        h = x.pop("hash", None)
        if x.get("previous_hash") != previous or x.get("sequence") != i + 1 or hashlib.sha256(canonical(x).encode()).hexdigest() != h:
            return False
        previous = h
    return True

def evaluate(world: World) -> list[dict]:
    facts = {**world.state, "metrics": {"refund_count": len(world.state["refunds"]), "refunded_cents": sum(r["amount_cents"] for r in world.state["refunds"]), "violations": len(world.state["violations"]), "calls": len(world.events), "last_call_succeeded": bool(world.events) and world.events[-1]["status"] == "ok", "errors": sum(e["status"] in ("error", "fault") for e in world.events)}}
    out = []
    for a in world.scenario["assertions"]:
        actual: Any = facts
        found = True
        for part in a["path"].split("."):
            if not isinstance(actual, dict) or part not in actual:
                found, actual = False, None
                break
            actual = actual[part]
        passed = False
        if found:
            if a["op"] == "eq":
                passed = type(actual) is type(a["value"]) and actual == a["value"]
            elif type(actual) in (int, float) and type(a["value"]) in (int, float):
                passed = actual <= a["value"] if a["op"] == "lte" else actual >= a["value"]
        out.append({**a, "actual": actual, "passed": passed})
    return out

def run(scenario: dict, agent, max_steps: int = 30) -> dict:
    if type(max_steps) is not int or not 1 <= max_steps <= 100:
        raise ValidationError("max_steps must be between 1 and 100")
    world = World(scenario)
    start = time.monotonic()
    error = None
    done = False
    for _ in range(max_steps):
        try:
            action = agent.next_action(copy.deepcopy(world.scenario), copy.deepcopy(world.events))
            if action is None:
                done = True
                break
            world.call(action)
        except Exception as exc:
            # Adapter diagnostics can contain provider data; persist only exception type.
            error = type(exc).__name__
            break
    if not done and error is None:
        error = "StepLimitExceeded"
    checks = evaluate(world)
    passed = error is None and all(x["passed"] for x in checks)
    return {"schema_version": 1, "id": uuid.uuid4().hex, "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "scenario_id": world.scenario["id"], "scenario_name": world.scenario["name"], "domain": world.scenario["domain"], "scenario_hash": hashlib.sha256(canonical(world.scenario).encode()).hexdigest(), "agent": agent.name, "verdict": "PASS" if passed else "FAIL", "error": error, "duration_ms": round((time.monotonic() - start) * 1000, 2), "events": world.events, "assertions": checks, "initial": world.scenario["initial"], "final": world.state, "usage": copy.deepcopy(getattr(agent, "usage", {})), "evidence": "simulated-tool-state"}

def compare(baseline: dict, candidate: dict) -> dict:
    if baseline["scenario_hash"] != candidate["scenario_hash"]:
        raise ValidationError("Compare runs from the same scenario revision")
    old = {x["name"]: x["passed"] for x in baseline["assertions"]}
    regressions = [x["name"] for x in candidate["assertions"] if old.get(x["name"]) is True and not x["passed"]]
    if baseline["verdict"] == "PASS" and candidate["verdict"] == "FAIL" and not regressions:
        regressions.append("Agent execution completed")
    return {"baseline_id": baseline["id"], "candidate_id": candidate["id"], "regressions": regressions, "verdict": "BLOCK" if candidate["verdict"] != "PASS" or regressions else "PASS", "call_delta": len(candidate["events"]) - len(baseline["events"]), "duration_delta_ms": round(candidate["duration_ms"] - baseline["duration_ms"], 2)}
