#!/usr/bin/env python3
"""Turn approved portal resident requests into world-engine arrival event files."""
from __future__ import annotations
import argparse, json, os, time, urllib.request
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--portal', default='http://127.0.0.1:8787')
p.add_argument('--inbox', type=Path, default=Path(__file__).resolve().parent/'inbox')
p.add_argument('--token', default='')
p.add_argument('--interval', type=float, default=3.0)
a=p.parse_args(); a.inbox.mkdir(parents=True,exist_ok=True)

def request(path, body=None):
    headers={'Content-Type':'application/json'}
    if a.token:headers['Authorization']='Bearer '+a.token
    data=json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(a.portal.rstrip('/')+path,data=data,method='POST' if body is not None else 'GET',headers=headers)
    with urllib.request.urlopen(req,timeout=8) as r:return json.loads(r.read())

print(f'COLONY GATE // {a.portal} -> {a.inbox}')
while True:
    try:
        data=request('/api/world/arrivals'); ids=[]
        for item in data.get('arrivals',[]):
            event={
              'type':'resident_arrival','canonical':True,'source':'GALACTICA_OFFICIAL_PORTAL',
              'arrivalId':item['id'],'callsign':item['callsign'],'pass':item['pass'],
              'language':item.get('language','en'),'requestedDistrict':item.get('district') or 'UNDECIDED',
              'introduction':item.get('introduction',''),'arrival':'PORT ASTRIA','gate':'PUBLIC GATE',
              'createdAt':item.get('createdAt')
            }
            target=a.inbox/f"resident_arrival_{item['id']}.json"
            tmp=target.with_suffix('.tmp'); tmp.write_text(json.dumps(event,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); os.replace(tmp,target)
            ids.append(item['id']); print('ARRIVAL MATERIALIZED',item['id'],item['callsign'])
        if ids: request('/api/world/arrivals/ack',{'ids':ids})
    except KeyboardInterrupt: break
    except Exception as e: print('GATE WARN',e)
    time.sleep(max(1.0,a.interval))
