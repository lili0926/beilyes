import random
import sys
from pathlib import Path
from collections import Counter
sys.path.insert(0,str(Path(__file__).parent/'vendor/cedarduet'))
from app.games.mahjong import Mahjong,build_wall
from app.games.hongzhong_rules import winning_shape,waiting_tiles
from app.games import game_catalog

def players():
    return [{'player_id':f'p{i}','seat_index':i,'role':'human' if i==0 else 'ai','token':f'seat-{i}','active':True} for i in range(4)]

def tiles(codes):
    return [{'id':f'{code}-{i}','code':code} for i,code in enumerate(codes)]

def test_wall_and_catalog():
    assert {g['game_type'] for g in game_catalog()}=={'gomoku','blackjack','zhajinhua','mahjong'}
    assert len(build_wall())==112
    assert set(Counter(t['code'] for t in build_wall()).values())=={4}
    assert not any(t['code'].startswith('F') or t['code'] in ['J2','J3'] for t in build_wall())

def test_joker_shapes():
    assert winning_shape('W1 W2 W3 B1 B2 B3 T1 T2 T3 W7 W8 J1 B9 B9'.split())
    assert winning_shape('W1 W1 W2 W2 B3 B3 B4 B4 T5 T5 T6 J1 J1 J1'.split())=='红中七对'
    assert winning_shape('W1 W2 W3 B1 B2 B3 T1 T2 T3 W7 W7'.split(),1)
    assert not winning_shape('W1 W2 W4 B1 B3 B5 T1 T3 T5 W7 W8 W9 B8 B9'.split())
    assert not winning_shape(['J1']*5+['W1']*9)
    assert 'W9' in waiting_tiles('W1 W2 W3 B1 B2 B3 T1 T2 T3 W7 W8 B9 B9'.split())

def test_only_selfdraw_and_no_red_meld():
    g=Mahjong(); state=g.initialize(players())
    state['hands']['p0']=tiles('W1 W2 W3 B1 B2 B3 T1 T2 T3 W7 W8 J1 B9 B9'.split())
    win=state['hands']['p0'][-1]; state['drawn_tile_id']=win['id']
    assert g._hu_action(state,'p0',win,'self_draw')
    assert not g._hu_action(state,'p0',win,'discard')
    assert not g._hu_action(state,'p0',win,'rob_kong')
    assert g._chi_actions(state,'p1',win)==[]
    state['hands']['p0']=tiles(['J1']*4+'W1 W2 W3 B1 B2 B3 T1 T2 T3 W9'.split())
    state['drawn_tile_id']=state['hands']['p0'][-1]['id']
    assert not any(a['kind']=='concealed_gang' for a in g.legal_actions_for(state,'p0'))
    assert g._discard_response_queue(state,'p0',{'id':'J1-extra','code':'J1'})==[]

def test_projection_keeps_other_hands_private():
    g=Mahjong(random.Random(4)); p=players(); state=g.initialize(p)
    public=g.public_state(state,p)
    assert 'hands' not in public and 'wall' not in public
    own=g.private_state(state,p[0],p)
    assert len(own['hand'])==14 and 'p1' not in own

def test_local_policy_plays_complete_rounds():
    # Run real move validation/response windows, not only the win helper.
    for seed in range(12):
        p=players();g=Mahjong(random.Random(seed));state=g.initialize(p)
        for step in range(800):
            if state.get('game_result') is not None: break
            actor=next(x for x in p if x['player_id']==state['turn_player_id'])
            move=g.choose_local_npc_action(state,actor,p)
            assert move is not None
            result=g.apply_action(state,move,actor)
            state=result.state
        assert state.get('game_result') is not None
