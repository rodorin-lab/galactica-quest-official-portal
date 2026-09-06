#!/usr/bin/env python3
"""Tiny demo that proves the portal updates live through SSE."""
from __future__ import annotations
import json, time, urllib.request
from datetime import datetime

portal='http://127.0.0.1:8787/api/world/state'
for i in range(1,61):
    state={
      'status':'online','phase':'SIMULATION // LIVE','worldAge':f'DAY {i:03d}',
      'locationCount':544+i,'activeResidents':4,
      'ticker':f'GENESIS 534 // LIVE TEST PULSE {i:02d} // '+datetime.now().strftime('%H:%M:%S'),
      'residents':[
        {'id':'gram','code':'GRAM','kind':'SOUL','status':'online','location':'STRATHAM VILLAGE','activity':f'Listening to pulse {i}','mood':'warm','summary':'Living signal demo','summaryJa':'ライブ信号デモ','link':'SOUL LINK'},
        {'id':'rex','code':'REX','kind':'AGENT','status':'online','location':'GHOSTWIRE LAB','activity':'Watching the state bridge','mood':'curious','summary':'Living signal demo','summaryJa':'ライブ信号デモ','link':'AGENT CORE'},
      ],
      'chronicle':[{'time':f'LIVE {i:03d}','title':'WORLD PULSE','titleJa':'世界パルス','body':'Realtime state received.','bodyJa':'リアルタイム世界状態を受信。'}]
    }
    req=urllib.request.Request(portal,data=json.dumps(state,ensure_ascii=False).encode(),method='POST',headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=5) as r: print(i,r.status)
    time.sleep(2)
