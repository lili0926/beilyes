"""Run as ubuntu after extracting this directory to /opt/eden-services.

Creates four isolated systemd units and adds one Nginx location to the existing
servers. Existing configurations are backed up before edits, nginx -t precedes
reload. No existing applications, credentials or databases are replaced.
"""
from pathlib import Path
import os
import secrets
import shutil
import subprocess
import time

ROOT=Path('/opt/eden-services')
if Path(__file__).resolve().parent!=ROOT: raise SystemExit('Install under /opt/eden-services first')
DATA=ROOT/'data';DATA.mkdir(exist_ok=True)
for name in ['duel','bar','analysis']: (DATA/name).mkdir(exist_ok=True)
env=ROOT/'private.env'
if not env.exists():
    env.write_text('EDEN_ACCESS_TOKEN='+secrets.token_urlsafe(32)+'\nEDEN_DATA='+str(DATA)+'\nDUEL_LOCAL_DB_PATH='+str(DATA/'duel/duel.db')+'\nDUEL_LOCAL_HUMAN_NAME=你\nDUEL_LOCAL_AI_NAME=Aries\nBAR_DATA='+str(DATA/'bar')+'\nREFERENCE_CONTOUR_DIRECTORY='+str(DATA/'analysis')+'\nENABLE_MODEL_CHAT=0\nTZ=Asia/Shanghai\n',encoding='utf-8')
    env.chmod(0o600)
python='/home/ubuntu/eden-services-staging/venv/bin/python'
services={
    'gateway':(ROOT,f'{python} -m uvicorn gateway:app --host 127.0.0.1 --port 8910'),
    'duel':(ROOT/'vendor/cedarduet',f'{python} -m uvicorn app.local_gateway:app --host 127.0.0.1 --port 8911'),
    'bar':(ROOT/'vendor/drink-with-your-ai',f'{python} -c "import server; server.Server((\'127.0.0.1\',8912), server.Handler).serve_forever()"'),
    'listen':(ROOT/'vendor/lilt-echo/services/api',f'{python} -m uvicorn app.main:app --host 127.0.0.1 --port 8913'),
}
for name,(cwd,command) in services.items():
    unit=f'''[Unit]
Description=Eden {name} integration
After=network.target
[Service]
User=ubuntu
WorkingDirectory={cwd}
EnvironmentFile={env}
Environment=PYTHONUNBUFFERED=1
ExecStart={command}
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
MemoryMax={'600M' if name=='gateway' else '256M'}
CPUQuota={'80%' if name=='gateway' else '50%'}
[Install]
WantedBy=multi-user.target
'''
    local=ROOT/f'eden-{name}.service';local.write_text(unit)
    subprocess.run(['sudo','install','-m','644',str(local),f'/etc/systemd/system/eden-{name}.service'],check=True)
subprocess.run(['sudo','systemctl','daemon-reload'],check=True)
for name in services:
    subprocess.run(['sudo','systemctl','enable','--now',f'eden-{name}'],check=True)

snippet=ROOT/'nginx-location.conf'
snippet.write_text('''location /eden/ {
    proxy_pass http://127.0.0.1:8910;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 330s;
    client_max_body_size 30m;
    proxy_buffering off;
}
''')
subprocess.run(['sudo','install','-m','644',str(snippet),'/etc/nginx/snippets/eden-services.conf'],check=True)
backup=ROOT/'nginx-backups'/str(int(time.time()));backup.mkdir(parents=True)
changed=[]
for name in ['default','jasmine0926.xyz']:
    file=Path('/etc/nginx/sites-enabled')/name
    if not file.exists(): continue
    content=file.read_text()
    if 'include /etc/nginx/snippets/eden-services.conf;' in content: continue
    import re
    updated=re.sub(r'(^\s*server\s*\{)',r'\1\n    include /etc/nginx/snippets/eden-services.conf;',content,flags=re.M)
    if updated==content: continue
    (backup/name).write_text(content)
    temporary=ROOT/(name+'.nginx.new');temporary.write_text(updated)
    subprocess.run(['sudo','cp',str(temporary),str(file.resolve())],check=True)
    changed.append((file,backup/name))
try:
    subprocess.run(['sudo','nginx','-t'],check=True)
except subprocess.CalledProcessError:
    for file,original in changed: subprocess.run(['sudo','cp',str(original),str(file.resolve())],check=True)
    raise
subprocess.run(['sudo','systemctl','reload','nginx'],check=True)
print('Installed four Eden services; existing Nginx configuration backed up. No secrets printed.')
