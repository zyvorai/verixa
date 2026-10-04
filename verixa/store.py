"""SQLite storage; one transaction per write, safe across HTTP threads."""
import json
import sqlite3
from pathlib import Path
from .engine import canonical, validate_scenario
from .scenarios import bundled

class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("CREATE TABLE IF NOT EXISTS scenarios(id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, body TEXT NOT NULL);")
            for s in bundled():
                db.execute("INSERT OR IGNORE INTO scenarios VALUES(?,?)", (s["id"], canonical(s)))

    def connect(self):
        return sqlite3.connect(self.path, timeout=10)

    def scenarios(self):
        with self.connect() as db:
            return [json.loads(x[0]) for x in db.execute("SELECT body FROM scenarios ORDER BY id")]

    def scenario(self, id):
        with self.connect() as db:
            x = db.execute("SELECT body FROM scenarios WHERE id=?", (id,)).fetchone()
            return json.loads(x[0]) if x else None

    def save_scenario(self, body):
        s = validate_scenario(body)
        with self.connect() as db:
            db.execute("INSERT INTO scenarios VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body", (s["id"], canonical(s)))
        return s

    def save_run(self, r):
        with self.connect() as db:
            db.execute("INSERT INTO runs VALUES(?,?)", (r["id"], canonical(r)))
        return r

    def runs(self, limit=100):
        with self.connect() as db:
            return [json.loads(x[0]) for x in db.execute("SELECT body FROM runs ORDER BY rowid DESC LIMIT ?", (limit,))]

    def run(self, id):
        with self.connect() as db:
            x = db.execute("SELECT body FROM runs WHERE id=?", (id,)).fetchone()
            return json.loads(x[0]) if x else None
