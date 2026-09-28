import os
import tempfile
os.environ['EDEN_ACCESS_TOKEN']='test-token-not-for-deployment'
os.environ['EDEN_DATA']=tempfile.mkdtemp(prefix='eden-gateway-test-')
from fastapi.testclient import TestClient
import gateway
client=TestClient(gateway.app)

def test_private_data_requires_token():
    for path in ['/eden/status','/eden/tools','/eden/context','/eden/bar/state','/eden/duel/api/rooms','/eden/listen/api/songs']:
        assert client.get(path).status_code==401
    assert client.post('/eden/tool',json={'name':'eden_play','arguments':{'action':'rooms'}}).status_code==401

def test_static_ui_contains_bridge_not_credentials():
    for service in ['duel','bar']:
        response=client.get(f'/eden/{service}/')
        assert response.status_code==200
        assert 'eden:connect' in response.text
        assert 'test-token-not-for-deployment' not in response.text
        assert f'/eden/{service}/' in response.text

def test_rejects_unknown_tools_and_direct_machine_endpoint():
    headers={'Authorization':'Bearer test-token-not-for-deployment'}
    assert client.post('/eden/tool',headers=headers,json={'name':'shell','arguments':{}}).status_code==404
    assert client.post('/eden/duel/mcp/play',headers=headers,json={}).status_code==403
    assert client.post('/eden/tool',headers=headers,json={'name':'eden_play','arguments':{'action':'chips'}}).status_code==422

def test_static_traversal_does_not_expose_vendor_source():
    assert gateway.static_file('bar','../server.py') is None
    assert gateway.static_file('duel','static/../../database.py') is None

def test_cors_only_approved_app_origins():
    assert client.options('/eden/tools',headers={'Origin':'https://evil.example','Access-Control-Request-Method':'GET'}).status_code==400
    assert client.options('/eden/tools',headers={'Origin':'http://localhost','Access-Control-Request-Method':'GET'}).status_code==200
