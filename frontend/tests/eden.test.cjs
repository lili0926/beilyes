const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const front=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(front,'parts/10_core_all.js'),'utf8');
function setup(){
 const listeners={},calls=[];
 const state={uiShell:'eden',tab:'home',subPage:null,chatTarget:'a2',chatThreads:{a1:{messages:[{content:'API history'}]},a2:{messages:[{content:'Subscription history'}],pendingUser:['draft']}},messages:[],memories:[{content:'saved memory'}],coupleInfo:{myName:'A < B',partnerName:'TA',startDate:'2025-01-01',statusMsg:'Keep & remember'},edenMotionPaused:false};
 const context=vm.createContext({state,matchMedia:()=>({matches:false,addEventListener(){}}),document:{addEventListener:(type,fn)=>{listeners[type]=fn}},saveActiveThread:()=>calls.push('save'),render:()=>calls.push('render'),persist:key=>calls.push('persist:'+key),daysSince:()=>100,Date,Set});
 const start=core.indexOf('const FEAT_GROUPS = [');const end=core.indexOf('function renderHomeFeat()',start);
 vm.runInContext(core.slice(start,end),context);
 for(const name of ['angel-icon-bounds.js','angel-icons.js','eden.js'])vm.runInContext(fs.readFileSync(path.join(front,'eden',name),'utf8'),context);
 return {context,state,calls,listeners,theme:vm.runInContext('EdenTheme',context)};
}
test('the requested seven entries are hidden while remaining real routes stay reachable',()=>{
 const {theme,context}=setup();const html=theme.results();const catalog=vm.runInContext('FEAT_GROUPS.flatMap(g=>g.items)',context);
 assert.equal(catalog.length,54);
 const hidden=new Set(['workshop','branding','usage','diary','duty','cooking','ntfy']);
 for(const f of catalog){assert.equal(html.includes('data-sub="'+f.key+'"'),!hidden.has(f.key),f.key);}
 assert.ok(html.includes('47 个入口'));assert.ok(html.includes('>日记</span>'));assert.ok(!html.includes('机日记'));
 assert.ok(!html.includes('data-feature='),'prototype routes must not enter the real app');
 vm.runInContext('FEAT_GROUPS[0].items.push({key:"future",label:"Future"})',context);
 assert.ok(theme.results().includes('data-sub="future"'));
});
test('navigation selects the original channel thread and keeps existing state references',()=>{
 const {theme,state,calls}=setup();const memories=state.memories,couple=state.coupleInfo,threads=state.chatThreads;
 theme.navigate('chat');assert.equal(state.messages,threads.a2.messages);assert.equal(state.pendingUser,threads.a2.pendingUser);assert.equal(state.needChatScroll,true);
 theme.navigate('garden');assert.equal(state.tab,'home');assert.equal(state.edenPage,'garden');assert.equal(state.subPage,null);assert.ok(calls.includes('save'));
 assert.equal(state.memories,memories);assert.equal(state.coupleInfo,couple);assert.equal(state.chatThreads,threads);
 assert.ok(!calls.some(c=>c.startsWith('persist:')),'navigation must not rewrite storage');
});
test('home reads original profile safely and renders no hard-coded example conversations',()=>{
 const {theme,state}=setup();const html=theme.renderHome();assert.ok(html.includes('A &lt; B'));assert.ok(html.includes('Keep &amp; remember'));assert.ok(html.includes('第 100 天'));assert.ok(!html.includes('尚未接入'));
 assert.ok(theme.renderNav().includes('data-eden-page="garden"'));
 state.edenPage='garden';assert.ok(theme.renderHome().includes('eden-feature-search'));
});
test('every icon has measured bounds and a packaged local asset',()=>{
 const {context}=setup();const slots=vm.runInContext('angelIconSlots',context);assert.equal(Object.keys(slots).length,59);
 for(const [key,slot]of Object.entries(slots)){assert.ok(slot.crop,key);for(const n of Object.values(slot.crop))assert.ok(Number.isFinite(n),key);assert.ok(fs.existsSync(path.join(front,'eden',`angel-atlas-${slot.sheet}.png`)));}
});
test('CSS atlas URLs resolve relative to the packaged stylesheet directory',()=>{
 const {theme,context}=setup();const slots=vm.runInContext('angelIconSlots',context);
 for(const key of Object.keys(slots)){
  const relative=theme.icon(key).match(/url\('([^']+)'\)/)[1];
  const resolved=new URL(relative,'https://example.test/eden/eden.css');
  assert.equal(resolved.pathname,`/eden/angel-atlas-${slots[key].sheet}.png`);
 }
});
test('the shell reuses native theme persistence and leaves send/storage implementations intact',()=>{
 assert.ok(core.includes('data-ui-shell="eden"'));assert.ok(core.includes('edenMotionPaused:"edenMotionPaused"'));
 assert.ok(core.includes('if(state.uiShell==="eden") return EdenTheme.renderHome();'));
 assert.ok(core.includes('if(state.uiShell==="eden") return EdenTheme.renderNav();'));
 assert.ok(core.includes('EdenTheme.afterRender();'));
 const module=fs.readFileSync(path.join(front,'eden/eden.js'),'utf8');assert.ok(!/fetch\(|indexedDB|localStorage|apiKey|chat-form/.test(module));
});
