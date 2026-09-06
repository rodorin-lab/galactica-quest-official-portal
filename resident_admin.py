#!/usr/bin/env python3
"""Local operator console for GALACTICA resident applications."""
from __future__ import annotations
import argparse
import sqlite3
from server import JOIN_DB, approve_join, get_join, init_db


def list_rows(status: str | None):
    with sqlite3.connect(JOIN_DB) as db:
        db.row_factory = sqlite3.Row
        if status:
            rows = db.execute("SELECT * FROM join_requests WHERE status=? ORDER BY created_at DESC", (status,)).fetchall()
        else:
            rows = db.execute("SELECT * FROM join_requests ORDER BY created_at DESC LIMIT 100").fetchall()
    if not rows:
        print("No arrival signals.")
        return
    for r in rows:
        print(f"{r['id']}  {r['status']:<9}  {r['role']:<18}  {r['callsign']:<24}  {r['language']:<5}  {r['created_at']}")
        if r['district']:
            print(f"  district: {r['district']}")
        if r['introduction']:
            print(f"  intro   : {r['introduction']}")


def main():
    init_db()
    p = argparse.ArgumentParser(description="GALACTICA colony-gate operator")
    sub = p.add_subparsers(dest="cmd", required=True)
    lp = sub.add_parser("list"); lp.add_argument("--status", choices=["pending","approved","rejected","visitor"])
    ap = sub.add_parser("approve"); ap.add_argument("id")
    rp = sub.add_parser("reject"); rp.add_argument("id")
    sp = sub.add_parser("show"); sp.add_argument("id")
    args = p.parse_args()
    if args.cmd == "list": list_rows(args.status)
    elif args.cmd == "show": print(get_join(args.id))
    else:
        item = approve_join(args.id, args.cmd == "approve")
        if not item: raise SystemExit("Arrival signal not found")
        print(f"{item['id']} -> {item['status']} // {item['callsign']}")


if __name__ == "__main__":
    main()
