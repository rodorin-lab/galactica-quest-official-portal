#!/usr/bin/env python3
"""Watch GALACTICA's public-state JSON and relay changes to the official portal."""
from __future__ import annotations
import argparse, json, time, urllib.request
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('state_file', type=Path, help='JSON file continuously written by GALACTICA')
p.add_argument('--portal', default='http://127.0.0.1:8787')
p.add_argument('--token', default='')
p.add_argument('--interval', type=float, default=1.0)
a=p.parse_args()
last=-1
url=a.portal.rstrip('/')+'/api/world/state'
print(f'RELAY // {a.state_file} -> {url}')
while True:
    try:
        stamp=a.state_file.stat().st_mtime_ns
        if stamp!=last:
            payload=json.loads(a.state_file.read_text(encoding='utf-8'))
            req=urllib.request.Request(url,data=json.dumps(payload,ensure_ascii=False).encode(),method='POST',headers={'Content-Type':'application/json'})
            if a.token:req.add_header('Authorization','Bearer '+a.token)
            with urllib.request.urlopen(req,timeout=8) as r: r.read()
            last=stamp
            print('STATE PUSH',stamp)
    except KeyboardInterrupt: break
    except Exception as e: print('RELAY WARN',e)
    time.sleep(max(.25,a.interval))
