"""Private Eden adapters. Upstream apps stay bound to loopback.

Public routes serve only source-controlled UI files. Every state/model route
requires the installation's bearer token; no provider keys are stored here.
"""
import asyncio
import hashlib
import hmac
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sys
import tempfile
import time

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('EDEN_DATA', str(ROOT / '.local-data')))
DATA.mkdir(parents=True, exist_ok=True)
TOKEN = os.environ.get('EDEN_ACCESS_TOKEN', '')
ORIGINS = os.environ.get('EDEN_APP_ORIGINS', 'https://localhost,http://localhost,capacitor://localhost,http://127.0.0.1:4320,http://127.0.0.1:4321').split(',')
UPSTREAM = {'duel': 'http://127.0.0.1:8911', 'bar': 'http://127.0.0.1:8912', 'listen': 'http://127.0.0.1:8913'}
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=['GET','POST','OPTIONS'], allow_headers=['Authorization','Content-Type','X-Song-Title'], allow_credentials=False)
analysis_lock = asyncio.Lock()

def authorize(request):
    supplied = request.headers.get('authorization', '')
    if not TOKEN or not hmac.compare_digest(supplied, 'Bearer ' + TOKEN):
        raise HTTPException(401, '请在 App 输入服务连接码')

async def upstream(service, path, *, method='GET', data=None, raw=None, content_type=None, extra_headers=None):
    async with httpx.AsyncClient(timeout=35, follow_redirects=False, trust_env=False) as client:
        response = await client.request(method, UPSTREAM[service] + path,
            json=data, content=raw, headers={**({'content-type': content_type} if content_type else {}), **(extra_headers or {})})
    return response

@app.get('/eden/health')
async def health():
    return {'ok': True, 'service': 'eden', 'games': ['gomoku','blackjack','zhajinhua','mahjong']}

@app.get('/eden/status')
async def status(request: Request):
    authorize(request)
    result = {}
    for name,path in [('duel','/health'),('bar','/bar/tools'),('listen','/api/health')]:
        try: result[name] = (await upstream(name,path)).is_success
        except httpx.HTTPError: result[name] = False
    return {'ok':all(result.values()),'services':result}

GAMES = {'gomoku', 'blackjack', 'zhajinhua', 'mahjong'}

def game_response(response):
    # The Eden board only consumes its own projected room. Never forward the
    # Cedar timeline, internal identity metadata, or hidden deck/wall state.
    if not response.is_success:
        return Response(response.content, status_code=response.status_code, media_type='application/json')
    payload = response.json()
    room = payload.get('room') or {}
    projected = {
        key: room.get(key) for key in (
            'room_id', 'game_type', 'game_name', 'status', 'revision',
            'current_player_id',
            'viewer', 'board_state', 'private_state', 'winner',
            'winner_player_id', 'result', 'action_note')
    }
    projected['participants'] = [{key: person.get(key) for key in (
        'player_id', 'display_name', 'seat_index', 'token', 'game_metadata')}
        for person in room.get('participants', [])]
    actor = room.get('current_actor') or {}
    projected['current_actor'] = {key: actor.get(key) for key in ('player_id', 'display_name')}
    return JSONResponse({'ok': True, 'room': projected}, headers={'Cache-Control': 'no-store'})

@app.post('/eden/games/{game}/rooms')
async def create_game_room(game: str, request: Request):
    authorize(request)
    if game not in GAMES: raise HTTPException(404, '没有这个游戏')
    target = 4 if game == 'mahjong' else 2
    response = await upstream('duel', '/api/rooms', method='POST', data={
        'game_type': game, 'mode': 'human_first', 'stake': 0,
        'target_player_count': target, 'fill_with_npcs': target == 4,
        'managed_mode': True,
    }, extra_headers={'X-Eden-Managed': '1'})
    return game_response(response)

@app.get('/eden/games/rooms/{room_id}')
async def get_game_room(room_id: str, request: Request):
    authorize(request)
    if not re.fullmatch(r'[A-Za-z0-9_-]{8}', room_id): raise HTTPException(422, '房间编号无效')
    return game_response(await upstream('duel', f'/api/rooms/{room_id}'))

@app.post('/eden/games/rooms/{room_id}/move')
async def move_game_room(room_id: str, request: Request):
    authorize(request)
    if not re.fullmatch(r'[A-Za-z0-9_-]{8}', room_id): raise HTTPException(422, '房间编号无效')
    body = await bounded_json(request)
    move, revision = body.get('move'), body.get('revision')
    if not isinstance(move, dict) or not isinstance(revision, int) or isinstance(revision, bool):
        raise HTTPException(422, '需要服务端给出的动作和局面版本')
    response = await upstream('duel', f'/api/rooms/{room_id}/move', method='POST',
        data={'move': move, 'revision': revision})
    return game_response(response)

@app.get('/eden/tools')
async def tools(request: Request):
    authorize(request)
    response = await upstream('bar','/bar/tools')
    response.raise_for_status()
    definitions = [{'name':'eden_'+t['name'],'description':t['description'],'inputSchema':t['input_schema']} for t in response.json()['tools']]
    definitions.append({'name':'eden_listening','description':'读取用户明确上传歌曲的 Lilt Echo 声学分析。数据不是耳听，不能声称听到了未提供的歌词或演唱细节。',
        'inputSchema':{'type':'object','properties':{'song_id':{'type':'string'}},'required':['song_id']}})
    return {'tools':definitions}

@app.post('/eden/tool')
async def call_tool(request: Request):
    authorize(request)
    body=await bounded_json(request)
    name=body.get('name'); args=body.get('arguments') or {}
    if not isinstance(args,dict): raise HTTPException(422,'arguments 必须是对象')
    if name in {'eden_bar_look','eden_bar_drink','eden_bar_game'}:
        response=await upstream('bar','/bar/ai',method='POST',data={'tool':name.removeprefix('eden_'),'input':args})
    elif name=='eden_listening':
        sid=str(args.get('song_id',''))
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}',sid): raise HTTPException(422,'歌曲编号无效')
        response=await upstream('listen',f'/api/listen/songs/{sid}/understanding')
    else: raise HTTPException(404,'没有这个工具')
    return Response(response.content,status_code=response.status_code,media_type='application/json')

@app.get('/eden/context')
async def context(request: Request):
    authorize(request)
    response=await upstream('bar','/bar/context')
    return Response(response.content,status_code=response.status_code,media_type='application/json')

async def bounded_json(request):
    data=await read_bounded(request,200000)
    try: result=json.loads(data or b'{}')
    except ValueError: raise HTTPException(400,'JSON 无效')
    if not isinstance(result,dict): raise HTTPException(422,'需要对象')
    return result

async def read_bounded(request,limit):
    data=bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data)>limit: raise HTTPException(413,'文件过大')
    return bytes(data)

@app.post('/eden/analysis')
async def analyze(request: Request):
    authorize(request)
    if analysis_lock.locked(): raise HTTPException(409,'已有歌曲正在分析，请稍后再试')
    async with analysis_lock:
        data=await read_bounded(request,30*1024*1024)
        if not data: raise HTTPException(422,'请选择音频文件')
        sid='track_'+hashlib.sha256(data).hexdigest()[:24]
        output=DATA/'analysis'/f'{sid}.json'; output.parent.mkdir(exist_ok=True)
        if output.exists(): return {'song_id':sid,'cached':True}
        title=request.headers.get('x-song-title','')[:500]
        from urllib.parse import unquote
        title=unquote(title)[:100] or '上传的歌曲'
        with tempfile.TemporaryDirectory(prefix='eden-audio-') as tmp:
            source=Path(tmp)/'source'; source.write_bytes(data)
            command=[sys.executable,str(ROOT/'vendor/lilt-echo/scripts/analyze_track.py'),'--input',str(source),'--song-id',sid,'--title',title,'--output',str(output),'--basic']
            process=await asyncio.create_subprocess_exec(*command,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
            try: await asyncio.wait_for(process.communicate(),timeout=300)
            except (asyncio.TimeoutError,asyncio.CancelledError):
                process.kill(); await process.wait()
                raise HTTPException(504,'分析超时，请使用更短的音频')
            if process.returncode or not output.exists(): raise HTTPException(422,'音频分析失败，请换一个有效的 MP3/WAV 文件')
        return {'song_id':sid,'source':'authorized_local_audio_full_mix','heard_audio':False}

def static_file(service,path):
    roots={'duel':ROOT/'vendor/cedarduet/app/static','bar':ROOT/'vendor/drink-with-your-ai/web'}
    if service not in roots: return None
    root=roots[service].resolve()
    if service=='duel':
        rel='index.html' if path in {'','/'} else ('chips.html' if path=='chips' else path.removeprefix('static/'))
        if path not in {'','/','chips'} and not path.startswith('static/'): return None
    else: rel=path or 'index.html'
    file=(root/rel).resolve()
    return file if root in file.parents and file.is_file() else None

def transform(text,service):
    # Prefix root-relative UI references, including template literals and CSS.
    prefix='/eden/'+service
    text=re.sub(r'''(["'`(=])/(?!/|eden/)([A-Za-z0-9_?])''',lambda m:m[1]+prefix+'/'+m[2],text)
    if service=='duel':
        # The upstream home link points outside the mounted service. Its Google
        # font requests can stall page load where that domain is unreachable.
        text=text.replace('href="/"',f'href="{prefix}/"')
        text=re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com[^>]*>','',text)
    return text

def bridge(service):
    script=(ROOT/'frame-bridge.js').read_text(encoding='utf-8')
    config=json.dumps({'service':service,'prefix':'/eden/'+service,'origins':ORIGINS},ensure_ascii=True)
    return '<script>window.__edenFrame='+config+';</script><script>'+script+'</script>'

@app.api_route('/eden/{service}/{path:path}',methods=['GET','POST'])
async def proxy(service:str,path:str,request:Request):
    if service not in UPSTREAM: raise HTTPException(404)
    file=static_file(service,path) if request.method=='GET' else None
    if file:
        mime=mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        if file.suffix.lower() in {'.html','.js','.css','.svg','.json'}:
            text=transform(file.read_text(encoding='utf-8'),service)
            if file.suffix=='.html': text=text.replace('<head>','<head>'+bridge(service),1)
            return Response(text,media_type=mime,headers={'Referrer-Policy':'no-referrer','Cache-Control':'no-cache'})
        return FileResponse(file,headers={'Cache-Control':'public, max-age=86400'})
    authorize(request)
    if service=='duel' and path.startswith('mcp/'):
        raise HTTPException(403,'请使用专用 AI 工具入口')
    if path.startswith(('http:','https:')) or '..' in path.split('/'):
        raise HTTPException(400)
    raw=await read_bounded(request,200000) if request.method=='POST' else None
    query=('?'+request.url.query) if request.url.query else ''
    try: response=await upstream(service,'/'+path+query,method=request.method,raw=raw,content_type=request.headers.get('content-type'))
    except httpx.HTTPError: raise HTTPException(503,'服务暂时无法连接')
    return Response(response.content,status_code=response.status_code,media_type=response.headers.get('content-type','application/json'),headers={'Cache-Control':'no-store'})
