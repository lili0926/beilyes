#!/usr/bin/env python3
"""Local companion CLI. Credentials never enter chat arguments or tool output."""
import json
from pathlib import Path
import sys
import urllib.request
env={}
for line in Path('/opt/eden-services/private.env').read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        key,value=line.split('=',1);env[key]=value
action=sys.argv[1] if len(sys.argv)>1 else 'tools'
if action not in {'tools','call','context'}: raise SystemExit('Use tools, call or context')
payload=json.load(sys.stdin) if action=='call' else None
request=urllib.request.Request('http://127.0.0.1:8910/eden/'+('tool' if action=='call' else action),
    data=json.dumps(payload).encode() if payload is not None else None,
    headers={'Authorization':'Bearer '+env['EDEN_ACCESS_TOKEN'],'Content-Type':'application/json'})
try:
    with urllib.request.urlopen(request,timeout=40) as response:
        print(response.read().decode())
except Exception as error:
    print(json.dumps({'ok':False,'error':str(error)},ensure_ascii=False));sys.exit(1)
