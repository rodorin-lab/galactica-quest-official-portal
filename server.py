#!/usr/bin/env python3
"""GALACTICA QUEST Official Living Portal server.

Dynamic features
----------------
* Static official portal hosting.
* GET  /api/state                 public world-state snapshot.
* GET  /api/stream                Server-Sent Events live state stream.
* POST /api/world/state           push a complete live state from GALACTICA.
* POST /api/join                  visitor/explorer/resident arrival signal.
* GET  /api/join/status?id=...    public status for one arrival request.
* GET  /api/world/arrivals        world-engine queue of approved residents.
* POST /api/world/arrivals/ack    mark approved arrivals consumed by world.

Environment
-----------
GALACTICA_STATE_PATH        JSON state file (default data/live-state.json)
GALACTICA_PORT              listen port (default 8787)
GALACTICA_HOST              listen host (default 127.0.0.1)
GALACTICA_WORLD_TOKEN       bearer token for world push/arrival queue endpoints
GALACTICA_JOIN_MODE         review (default) or auto for resident candidates
GALACTICA_PUBLIC_BASE_URL   optional public portal URL returned by API

The public state stream is read-only. World mutation endpoints require the world
secret unless the caller is localhost, making local development painless while
keeping a Cloudflare-exposed portal from accepting arbitrary world writes.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_STATE = DATA_DIR / "live-state.json"
STATE_PATH = Path(os.environ.get("GALACTICA_STATE_PATH", DEFAULT_STATE)).expanduser().resolve()
STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
JOIN_DB = DATA_DIR / "colony-gate.db"
PORT = int(os.environ.get("GALACTICA_PORT", "8787"))
HOST = os.environ.get("GALACTICA_HOST", "127.0.0.1")
WORLD_TOKEN = os.environ.get("GALACTICA_WORLD_TOKEN", "")
JOIN_MODE = os.environ.get("GALACTICA_JOIN_MODE", "review").strip().lower()
PUBLIC_BASE_URL = os.environ.get("GALACTICA_PUBLIC_BASE_URL", "")
MAX_BODY = 64 * 1024
CALLSIGN_RE = re.compile(r"^[\w\- .ぁ-んァ-ヶ一-龠々ー]{2,24}$", re.UNICODE)
WRITE_LOCK = threading.RLock()


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def atomic_write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def read_state() -> dict:
    try:
        payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("state root must be an object")
    except FileNotFoundError:
        payload = {"status": "unknown", "phase": "NO SIGNAL", "residents": [], "chronicle": []}
    payload = dict(payload)
    payload["source"] = "live-file" if STATE_PATH != DEFAULT_STATE else "portal-live-state"
    payload["stateFile"] = STATE_PATH.name
    try:
        payload["stateVersion"] = int(STATE_PATH.stat().st_mtime_ns)
    except OSError:
        payload["stateVersion"] = 0
    return payload


def init_db() -> None:
    with sqlite3.connect(JOIN_DB) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS join_requests (
                id TEXT PRIMARY KEY,
                callsign TEXT NOT NULL,
                role TEXT NOT NULL,
                language TEXT NOT NULL,
                district TEXT,
                introduction TEXT,
                pass_code TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                approved_at TEXT,
                consumed_at TEXT,
                remote_hash TEXT
            )
            """
        )
        db.execute("CREATE INDEX IF NOT EXISTS idx_join_status ON join_requests(status, created_at)")
        db.commit()


def row_to_join(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"], "callsign": row["callsign"], "role": row["role"],
        "language": row["language"], "district": row["district"] or "",
        "introduction": row["introduction"] or "", "pass": row["pass_code"],
        "status": row["status"], "createdAt": row["created_at"],
        "updatedAt": row["updated_at"], "approvedAt": row["approved_at"],
    }


def get_join(join_id: str) -> dict | None:
    with sqlite3.connect(JOIN_DB) as db:
        db.row_factory = sqlite3.Row
        row = db.execute("SELECT * FROM join_requests WHERE id=?", (join_id,)).fetchone()
    return row_to_join(row) if row else None


def approve_join(join_id: str, approve: bool = True) -> dict | None:
    now = utcnow()
    with WRITE_LOCK, sqlite3.connect(JOIN_DB) as db:
        db.row_factory = sqlite3.Row
        row = db.execute("SELECT * FROM join_requests WHERE id=?", (join_id,)).fetchone()
        if not row:
            return None
        new_status = "approved" if approve else "rejected"
        approved_at = now if approve else None
        db.execute(
            "UPDATE join_requests SET status=?, updated_at=?, approved_at=? WHERE id=?",
            (new_status, now, approved_at, join_id),
        )
        db.commit()
    return get_join(join_id)


def world_arrivals() -> list[dict]:
    with sqlite3.connect(JOIN_DB) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute(
            "SELECT * FROM join_requests WHERE status='approved' AND consumed_at IS NULL ORDER BY created_at ASC"
        ).fetchall()
    return [row_to_join(r) for r in rows]


def ack_arrivals(ids: list[str]) -> int:
    ids = [str(x)[:80] for x in ids if x]
    if not ids:
        return 0
    now = utcnow()
    with sqlite3.connect(JOIN_DB) as db:
        placeholders = ",".join("?" for _ in ids)
        cur = db.execute(
            f"UPDATE join_requests SET consumed_at=?, updated_at=? WHERE id IN ({placeholders}) AND status='approved'",
            [now, now, *ids],
        )
        db.commit()
        return cur.rowcount


def make_pass(callsign: str, role: str) -> str:
    short_role = {"OBSERVER": "OBS", "EXPLORER": "EXP", "RESIDENT-CANDIDATE": "RES"}.get(role, "GATE")
    digest = hashlib.blake2s(f"{callsign}|{role}|{secrets.token_hex(6)}".encode(), digest_size=4).hexdigest().upper()
    return f"GQ-{short_role}-{digest}"


def remote_hash(remote: str) -> str:
    return hashlib.sha256((remote + "|GALACTICA-GATE").encode()).hexdigest()[:20]


def is_local_client(handler: "PortalHandler") -> bool:
    return handler.client_address[0] in {"127.0.0.1", "::1"}


def world_authorized(handler: "PortalHandler") -> bool:
    if is_local_client(handler):
        return True
    if not WORLD_TOKEN:
        return False
    auth = handler.headers.get("Authorization", "")
    header_token = handler.headers.get("X-Galactica-Token", "")
    return secrets.compare_digest(auth, f"Bearer {WORLD_TOKEN}") or secrets.compare_digest(header_token, WORLD_TOKEN)


class PortalHandler(SimpleHTTPRequestHandler):
    server_version = "GALACTICA-GATE/3"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {self.client_address[0]} {fmt % args}")

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/api/health":
            return self._json({
                "ok": True, "service": "galactica-portal-v3", "time": utcnow(),
                "statePath": str(STATE_PATH), "joinMode": JOIN_MODE,
                "realtime": "sse", "residentGate": True,
            })
        if path == "/api/state":
            return self._json(read_state())
        if path == "/api/stream":
            return self._sse_stream()
        if path == "/api/join/status":
            join_id = parse_qs(parsed.query).get("id", [""])[0][:80]
            item = get_join(join_id) if join_id else None
            if not item:
                return self._json({"ok": False, "error": "arrival signal not found"}, 404)
            return self._json({"ok": True, "arrival": item})
        if path == "/api/world/arrivals":
            if not world_authorized(self):
                return self._json({"ok": False, "error": "world authorization required"}, 401)
            return self._json({"ok": True, "arrivals": world_arrivals()})
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/world/state":
            if not world_authorized(self):
                return self._json({"ok": False, "error": "world authorization required"}, 401)
            body = self._read_json()
            if body is None:
                return
            if not isinstance(body, dict):
                return self._json({"ok": False, "error": "state must be an object"}, 400)
            body = dict(body)
            body["updatedAt"] = utcnow()
            with WRITE_LOCK:
                atomic_write_json(STATE_PATH, body)
            return self._json({"ok": True, "stateVersion": int(STATE_PATH.stat().st_mtime_ns)})

        if path == "/api/world/arrivals/ack":
            if not world_authorized(self):
                return self._json({"ok": False, "error": "world authorization required"}, 401)
            body = self._read_json()
            if body is None:
                return
            count = ack_arrivals(body.get("ids", []) if isinstance(body, dict) else [])
            return self._json({"ok": True, "acknowledged": count})

        if path == "/api/join":
            body = self._read_json()
            if body is None:
                return
            return self._create_arrival(body)

        return self._json({"ok": False, "error": "not found"}, 404)

    def _create_arrival(self, body: dict):
        if not isinstance(body, dict):
            return self._json({"ok": False, "error": "invalid payload"}, 400)
        callsign = str(body.get("callsign", "")).strip()
        role = str(body.get("role", "OBSERVER")).upper().strip()
        language = str(body.get("language", "en")).lower().strip()[:10] or "en"
        district = str(body.get("district", "")).strip()[:80]
        introduction = str(body.get("introduction", "")).strip()[:700]
        allowed_roles = {"OBSERVER", "EXPLORER", "RESIDENT-CANDIDATE"}
        if role not in allowed_roles:
            return self._json({"ok": False, "error": "invalid arrival mode"}, 400)
        if not CALLSIGN_RE.match(callsign):
            return self._json({"ok": False, "error": "callsign must be 2-24 characters"}, 400)
        if role == "RESIDENT-CANDIDATE" and len(introduction) < 3:
            return self._json({"ok": False, "error": "resident candidates need a short introduction"}, 400)

        # Small public-gate anti-spam guard: at most 5 unconsumed applications per remote/day.
        rh = remote_hash(self.client_address[0])
        with sqlite3.connect(JOIN_DB) as db:
            recent = db.execute(
                "SELECT COUNT(*) FROM join_requests WHERE remote_hash=? AND created_at >= datetime('now','-1 day')",
                (rh,),
            ).fetchone()[0]
            if recent >= 5:
                return self._json({"ok": False, "error": "arrival signal limit reached; try again later"}, 429)

        join_id = "ARR-" + secrets.token_hex(6).upper()
        pass_code = make_pass(callsign, role)
        now = utcnow()
        if role == "RESIDENT-CANDIDATE":
            status = "approved" if JOIN_MODE == "auto" else "pending"
        else:
            status = "visitor"
        approved_at = now if status == "approved" else None
        with WRITE_LOCK, sqlite3.connect(JOIN_DB) as db:
            db.execute(
                """INSERT INTO join_requests
                   (id,callsign,role,language,district,introduction,pass_code,status,created_at,updated_at,approved_at,remote_hash)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (join_id, callsign, role, language, district, introduction, pass_code,
                 status, now, now, approved_at, rh),
            )
            db.commit()
        item = get_join(join_id)
        return self._json({
            "ok": True, "arrival": item,
            "message": "resident signal queued" if status == "pending" else "gate signal accepted",
            "liveWorldUrl": PUBLIC_BASE_URL or None,
        }, 201)

    def _sse_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-transform")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        last_version = -1
        started = time.monotonic()
        try:
            while time.monotonic() - started < 60 * 30:
                state = read_state()
                version = int(state.get("stateVersion", 0))
                if version != last_version:
                    self._sse("world_state", state, event_id=str(version))
                    last_version = version
                else:
                    self.wfile.write(b": pulse\n\n")
                    self.wfile.flush()
                time.sleep(2.0)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            return

    def _sse(self, event: str, payload: dict, event_id: str = ""):
        blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        if event_id:
            self.wfile.write(f"id: {event_id}\n".encode())
        self.wfile.write(f"event: {event}\n".encode())
        self.wfile.write(f"data: {blob}\n\n".encode("utf-8"))
        self.wfile.flush()

    def _read_json(self) -> dict | None:
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = 0
        if size <= 0 or size > MAX_BODY:
            self._json({"ok": False, "error": "invalid body size"}, 400)
            return None
        try:
            data = json.loads(self.rfile.read(size).decode("utf-8"))
        except Exception:
            self._json({"ok": False, "error": "invalid JSON"}, 400)
            return None
        return data

    def _json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(ROOT)
    init_db()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║ GALACTICA QUEST // OFFICIAL LIVING PORTAL v3               ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"Portal       : http://{HOST}:{PORT}")
    print(f"World state  : {STATE_PATH}")
    print(f"Realtime     : SSE /api/stream")
    print(f"Resident gate: {JOIN_MODE.upper()} // {JOIN_DB}")
    print(f"World writes : {'TOKEN' if WORLD_TOKEN else 'LOCALHOST ONLY'}")
    ThreadingHTTPServer((HOST, PORT), PortalHandler).serve_forever()
