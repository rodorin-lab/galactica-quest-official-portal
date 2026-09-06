#!/usr/bin/env python3
"""Push a GALACTICA public-state JSON into the portal in one command."""
from __future__ import annotations
import argparse, json, urllib.request
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('state', type=Path)
p.add_argument('--portal', default='http://127.0.0.1:8787')
p.add_argument('--token', default='')
a=p.parse_args()
payload=a.state.read_bytes()
req=urllib.request.Request(a.portal.rstrip('/')+'/api/world/state', data=payload, method='POST', headers={'Content-Type':'application/json'})
if a.token: req.add_header('Authorization','Bearer '+a.token)
with urllib.request.urlopen(req, timeout=10) as r:
    print(r.read().decode())
