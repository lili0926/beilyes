const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const front=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(front,'parts/10_core_all.js'),'utf8');
const shell=fs.readFileSync(path.join(front,'doodle/doodle.js'),'utf8');
test('doodle shell is wired into the native render, theme, chat and music paths',()=>{
 for(const hook of ['data-ui-shell="doodle"','doodlePrefs:"doodlePrefs"','if(state.uiShell==="doodle") return DoodleShell.palette();','if(state.uiShell==="doodle") return DoodleShell.renderNav();','if(state.uiShell==="doodle") return DoodleShell.renderHomeSpacer();','DoodleShell.afterRender();','DoodleShell.renderSettings(renderSettings())','DoodleShell.chatHeader()','DoodleShell.sidebarTop()','DoodleShell.playLocal(song)','DoodleShell.onEnded()'])
  assert.ok(core.includes(hook),hook);
 assert.ok(fs.readFileSync(path.join(front,'parts/00_prefix.html'),'utf8').includes('<script src="doodle/doodle.js"></script>'));
 assert.ok(fs.readFileSync(path.join(front,'build.py'),'utf8').includes('"doodle"'));
});
test('every native feature has a doodle icon and the shell never fetches or reads API keys',()=>{
 const start=core.indexOf('const FEAT_GROUPS = [');const end=core.indexOf('function renderHomeFeat()',start);
 const ctx=vm.createContext({});vm.runInContext(core.slice(start,end)+';this.keys=FEAT_GROUPS.flatMap(g=>g.items.map(f=>f.key));',ctx);
 const icons=shell.match(/const ICON_OF = \{([\s\S]*?)\};/)[1];
 for(const k of ctx.keys) assert.ok(new RegExp('(^|[,{\\s])\'?'+k+'\'?:').test(icons),k);
 assert.ok(!/fetch\(|XMLHttpRequest|apiKey|localStorage/.test(shell));
});
test('layer hosts do not reuse the dd- prefix that icon <path id> definitions use',()=>{
 assert.ok(!/makeLayer\('dd-/.test(shell));
 for(const id of ['doodle-back','doodle-home','doodle-over']) assert.ok(shell.includes("makeLayer('"+id+"'"),id);
});
