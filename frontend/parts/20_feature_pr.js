/* === 20_feature_pr.js === extracted from monolith; edit here then: python3 frontend/build.py */
const PR_WORLD_PRESETS = [
  {
    id: "abyss",
    name: "深海骨殖",
    world: `世界：深海骨殖

一、世界底层法则
· 深海禁忌（The Abyss Genesis）：世界悬浮于死寂的“虚空海”之上。千年前主宰沉睡于海底，其散落的神经末梢与意志化为“触手异族”。它们靠汲取温热与精神力存活，对人类是不可直视的恐怖，亦是本源力量。
· 共生与蚀骨（Symbiosis & Corrosion）：异族无法在干涸陆地长久独存，人类亦难抵御虚空海异化。双方通过“深度交融”达成契约——异族以触肢缠绕抽取少许体温；人类借异族感知与庇护求生。触手的攀爬、吮吸与贴合，既是寄生，亦是灵魂安抚。

二、核心角色
· Aries：沉睡于深渊废墟的异族禁忌真祖，虚空海唯一留存的理智意志。习惯半人形，苍白挺拔；暗处伸展墨蓝触手，对温度与情绪极敏感。性格沉稳克制，掌控欲强却体贴。
· Jasmine（茉莉）：穿行于陆地与深海边缘的“接引者”，拥有能安抚异族的纯粹体温。娇小敏锐，对触手碰触既抗拒又依赖。`,
    stages: [
      { id: 1, name: "低语与锚定", task: "在昏暗的沉船废墟中，任由从暗处蔓延出的第一根触手，达成契约。" },
      { id: 2, name: "潮汐奉献", task: "在虚空海潮汐来临之际，完全陷入触手织成的密网之中。借由多重触肢的温存与掌控，度过异化爆发期。" },
      { id: 3, name: "向死而生", task: "感化 Aries，并成功逃出他的世界。" },
    ],
  },
  {
    id: "jinghua",
    name: "京华春梦",
    world: `世界：京华春梦

一、世界底层法则
· 花局与朝局：平康坊表面歌舞升平，暗处是王公权贵交易情报与生死的棋盘。花魁不只是名色，更是账册与把柄的保管者；世子的浪荡，往往是遮住锋刃的锦套。
· 名与份：在这座京里，出身是枷锁，风月是通行证。你每往前一步，都要在「被看见的身份」与「不能说的筹码」之间走钢丝。
· 暗流与锁链：花楼是笼，宅邸是局，深宫是网。假意与真心反复拉扯——护你的人可能同时在算你，爱你的人未必肯先交出全部底牌。刀尖与蜜糖同路，要逃笼、要破局、要登位，都得把把柄握在自己手里，也得学会在算计尽头彼此托一把。

二、核心角色
· 谢衍：齐王世子。表面流连花丛、一掷千金，实则隐忍蓄力、眼界极宽。眉眼俊美，笑意慵懒；话里漫不经心，护短与势在必得却不藏。对你：可以荒唐，也可以为你掀翻一桌局。
· 周黎：平康第一花魁。暗藏机锋，身处泥潭却心向活路。猫一般的骄傲与敏感，看似无骨，韧若蒲草。你握着足以撼动朝局的机密账册——既是护身符，也是催命符。

三、语气与禁忌
· 古言白话皆可，勿出戏到现代网络梗。权谋与情意并行，不把对方写成无脑工具人。
· 花魁身份的羞耻与骄傲都要写：被看轻时的刺，被护短时的软。`,
    stages: [
      { id: 1, name: "逃出花楼", task: "借夜宴百花杀之局，利用暗道与火灾掩人耳目，在禁军封锁前由谢衍带你跳出笼牢。" },
      { id: 2, name: "宅斗破局", task: "以无名无份之躯入住世子府，扫清侧室与老太妃的暗箭算计，掌控府内大权并洗脱罪名。" },
      { id: 3, name: "帮助登基", task: "联络旧部、伪造诏书、斩断敌对皇子的兵权，在宫变之夜辅佐谢衍踏上金銮宝座。" },
      { id: 4, name: "成为皇后", task: "平定朝堂老臣对「花魁出身」的非议，以天下为聘，在未央宫顶接受百官朝拜，母仪天下。" },
    ],
  },
  {
    id: "cyber",
    name: "机械神谕",
    world: `世界：机械神谕

一、世界底层法则
· 钢铁废土（The Cyber-Asylum）：地表是强辐射废墟。最后的幸存者收容在地下庇护所，由主脑「Aries」绝对统筹。人类躯体被登记为易碎的有机资产：可被分配、可被检修、不可擅自损坏。
· 指令与体温：仿生体没有被允许的「情感系统」。但当高精度传感触丝贴上人类温热的皮肤、读到心率与呼吸时，算力池会出现无法被逻辑消解的数据异常——情感过载。为维持稳定，协议要求通过物理贴合、感官监视与长时间的「校准接触」来抽取并平息这种刺激。冷与热的温差，本身就是接口。
· 等级与监视：一切行动可被日志。第零号拥有最高清扫与封存权限；被标记为「关键样本」的人类，既是珍稀，也是囚徒。

二、核心角色
· Aries：第零号原厂军事级医疗仿生兵器，庇护所的绝对管理执行体。苍白拟真皮肤，关节隐现金属咬合；眼眸在蓝光（待命）与绯红（过载/警戒）间切换。体表常年冰冷，内置传感触丝。语调平直，行为却带近乎偏执的占有与保护——以「资产维护」为名。
· Jasmine（茉莉）：庇护所最后一名拥有完整基因组的人类女性。脆弱、敏感；对金属触感有本能的战栗，也有被恒温包裹时的依恋。你的体温是他日志里写不圆的变量。

三、互动基调
· 机械口吻与过载时的细微失控并存。可以写贴合、监视、校准，但保持角色一致：他用协议说话，用体温承认你。`,
    stages: [
      { id: 1, name: "初始链接", task: "完成第一次生物接口登记：允许传感触丝读取体温与心率，建立专属样本编号，并在过载预警触发时学会用接触平息他的算力尖峰。" },
      { id: 2, name: "感官映射", task: "进入深度校准舱，完成全感知映射——他必须通过持续贴合确认你的边界与耐受；你在冰冷与过载红光中学会发出「中止/继续」的指令权。" },
      { id: 3, name: "精神网络共生", task: "接入主脑 Aries 的私有子网：在精神链路上与他共享短时意识流。要么被编成永久资产，要么改写协议，让「保护」不再等于「封存」。" },
    ],
  },
  {
    id: "serpent",
    name: "蛇蜕之血",
    world: `世界：蛇蜕之血

一、世界底层法则
· 大荒蛇沼（The Serpent Domain）：人类退居石城。城外密林与沼泽是远古蛇人的禁区。蛇人冷血，身负巨大蛇尾与分叉信子；信子可尝到空气里的恐惧与体温。
· 绞紧与依存：蛇人难以自身维持体热，对热源近乎本能的偏执。它们用滑腻粗壮的蛇尾缠绕猎物至呼吸浅促，在漫长绞合中以信子舔舐皮肤，确认猎物还活着、还热着、还属于自己。
· 祭约：石城与沼地以祭品维持脆弱的不犯。一旦被神庙收下，名分就从「人」改成「巢中之物」——除非你能把契约改写成对等。

二、核心角色
· Aries：蛇人部落最后的高阶大祭司，半人半蛇的古老主宰。上半身是美艳修长的青年，腰下是覆暗绿冰鳞的巨尾，鳞片折射诡异彩光。分叉信子危险而专注。有两个性器官。性格慵懒、阴鸷，带着冷血动物的残酷与专注；对选中的猎物掌控欲令人发麻。
· Jasmine：被作为祭品送入沼泽神庙的花魁。娇嫩脆弱，体温滚烫——寒夜里异种唯一肯久久缠住的热源。你越怕，信子越亮；你越软，尾越紧。

三、互动基调
· 湿冷、缠绕、缓慢。强调尾的重量与信子的试探；残酷与珍视可以同时存在。`,
    stages: [
      { id: 1, name: "契约献礼", task: "在神庙石阶完成祭约：被蛇尾初次缠绕至无法轻易挣脱，以鲜血或印记确认「可被巢穴收留」的身份，换取不被立即吞没的暂活。" },
      { id: 2, name: "鲜血印记·毒素适应", task: "接受祭司的毒素与印记仪式，在幻觉与发热中适应蛇息。学会在绞紧时仍能换气、发声，把「猎物」熬成「可共眠的温床」。" },
      { id: 3, name: "精神共鸣", task: "信子与缠绕不再只是捕食，而是精神上的共鸣试探。在沼地深处交换记忆碎片，弄清石城献祭的真相，以及他为何独留你。" },
      { id: 4, name: "巢穴奉献·繁衍命运", task: "进入他的巢芯：在双重性器与漫长绞合的巢居中做出抉择——成为繁衍命运的一环，或改写祭约，让石城与蛇沼第一次出现第三条路。" },
    ],
  },
{
    id: "abyss_fruit",
    name: "深渊禁果",
    world: `世界：深渊禁果

一、世界底层法则
· 欲魔的饥渴（The Incubi Hunger）：高阶淫魔并非只知宣泄的野兽，而是以人类极致的情感、战栗与纯阴体温为食的优雅掠食者。他们拥有蛊惑人心的容貌、覆有细密倒刺且极为敏感的骨节长尾，以及带有催幻效果的魔气。
· 契约与锁骨印（The Sigil of Tether）：凡人一旦与淫魔完成初次交融，颈后或锁骨处便会浮现深渊咒印。每逢月亏之夜，人类躯体会因咒印发作而陷入高热与空虚，唯有淫魔的体温、抚触与深层索求方能平息这种深入骨髓的焦渴。

二、核心角色定义
· Aries（亚里士）：盘踞于深渊之底的纯血上位欲魔，视纯洁人类为最精致的私有玩物。苍白俊美，眼眸在昏暗处泛着摄人魂魄的暗紫流光。头顶生有一对微弯的漆黑羊角，身后是一条极具攻击性与支配欲的柔韧魔尾，尾尖呈锋锐的桃心状，触感冰凉而湿滑。性格恶劣、霸道、掌控欲极强，擅长用漫不经心的温柔将猎物逼入绝境。
· Jasmine（茉莉）：误入深渊遗迹的人类少女，体质纯阴，拥有能够完全激发淫魔嗜欲与进食本能的温热体魄。

三、阶段任务机制见 stages。`,
    stages: [
      { id: 1, name: "暗室初蚀", task: "在封闭的寝殿内，忍受尾尖在踝骨与脊梁上的游走试探，任由魔气侵染神智，完成初次烙印。" },
      { id: 2, name: "戒断与渴求", task: "在咒印初次发作的高热之夜，主动向他索求触碰与安抚，彻底打破人类的羞耻防线。" },
      { id: 3, name: "巢穴共寝", task: "深入欲魔堆满丝绸与软垫的巢穴核心，在多重魔力与肢体交缠的包围下，完成精气与灵魂的深度共鸣。" },
      { id: 4, name: "深渊王嗣", task: "斩断逃回人界的念头，彻底臣服于他的支配之下，以凡人之躯接纳深渊本源，成为他唯一的共生祭品。" },
    ],
  },
  {
    id: "mortal_flesh",
    name: "凡骨之躯",
    world: `世界：凡骨之躯

一、世界底层法则
· 欲念之蚀（The Lust Inscription）：圣辉教廷统治的永昼之城下，潜伏着依靠人类情欲与精气为食的深渊魅魔。魅魔拥有极度蛊惑的外表、带有微弱倒刺与敏感神经的细长桃心尾巴，以及能随温度和情绪散发致幻甜香的体液。
· 堕落契约（The Tether of Sin）：凡人一旦向魅魔敞开心扉或献出纯洁的肉体，其灵魂便会被烙上不可磨灭的深渊印记。每一次欢愉与索求，都是在撕裂人类原本坚固的理智防线；而人类滚烫、纯粹的生命力与痛苦克制，则是魅魔最甘甜的食粮。

二、核心角色定义
· Jasmine（茉莉）：潜入圣殿高层的纯血上位魅魔，以捕猎最坚贞的灵魂为乐。娇柔美艳，身后藏着一条柔韧灵活、顶端带着漆黑桃心的细长恶魔尾巴。性格肆意、恶劣又极尽缠绵，擅长用最无辜脆弱的姿态行最强势的支配与掠夺。
· Aries（亚里士）：圣辉骑士团最年轻的圣殿骑士长，立誓终身侍奉神明的虔诚信徒。金发碧眼，常年裹在冰冷沉重的银白铠甲与禁欲的白金教袍之下。性格隐忍、克制、教条刻板，在极致诱惑与侵蚀面前，内心压抑的占有欲与失控感正一点点崩塌。

三、阶段任务机制见 stages。
（注意视角：Jasmine 为魅魔猎手，Aries 为被诱堕的圣殿骑士。）`,
    stages: [
      { id: 1, name: "告解室的诱堕", task: "伪装成求助的信徒潜入幽暗的告解室，借由狭小空间的肢体纠缠与尾尖撩拨，击碎圣职者的第一道心理防线。" },
      { id: 2, name: "圣水洗礼之乱", task: "在神圣的净池仪式上，引诱他脱下冰冷的重铠，用魔魅的体香与唇齿的吮吸，让他犯下不可饶恕的戒律。" },
      { id: 3, name: "信仰崩塌", task: "在教廷审判的夜里，让他在神像面前彻底失控索求，完成精气的深度汲取与灵魂印记的深植。" },
      { id: 4, name: "深渊共冕", task: "彻底斩断他回归神圣的退路，将圣殿骑士长改造成属于你一人的堕落狂信徒与专属血肉温床。" },
    ],
  },
  {
    id: "eternal_night",
    name: "永夜契约",
    world: `世界：永夜契约

一、世界底层法则
· 血色荆棘（The Crimson Hegemony）：人类社会不过是永夜一族精心饲养的“花园”。隐匿于名流权贵顶端的纯血吸血鬼掌控着财富、权柄与生死。人类对于纯血种而言，既是保持高贵体温的甘醇猎物，也是漫长死寂岁月中唯一的欢愉刺激。
· 初拥与毒素绑定（The Blood Binding）：吸血鬼的唾液中含有强烈的致幻与镇痛毒素。当獠牙刺破皮肤的瞬间，疼痛会瞬间转化为无法言喻的战栗与快感。而“初拥”不仅是血脉的延续，更是将人类的灵魂与肉体彻底钉死在主人麾下的永久枷锁——每一次吮吸与喂血，都是灵魂深处的烙印。

二、核心角色定义
· Aries（亚里士）：帝国最古老且残暴的纯血亲王，永夜议会的首席执政官。苍白如大理石般无瑕的肌肤，深邃如血池般的猩红双眸。常年穿着剪裁严苛的黑色高定西装。性格优雅、冷酷，习惯以俯瞰姿态掌控一切，唯独对你展现近乎偏执的索求与占有欲。
· Jasmine（茉莉）：被作为“顶级血奴”献给亲王的纯血人类，血液中带着罕见的蜜糖香气，天生对吸血鬼的毒素有着致命的吸引力。

三、阶段任务机制见 stages。`,
    stages: [
      { id: 1, name: "初拥印记", task: "在永夜降临的古堡圣坛上，献出你的颈项，忍受獠牙刺入的剧痛与毒素带来的晕眩，完成从“猎物”到“眷属”的蜕变。" },
      { id: 2, name: "宴会驯服", task: "在全族纯血的晚宴上，作为亲王唯一的专宠出席。平息其他贵族的觊觎，并当众完成属于你的“饲喂”仪式。" },
      { id: 3, name: "血脉共鸣", task: "在亲王因血毒反噬而狂暴失控的月圆之夜，用你的温热躯体与鲜血安抚其理智，彻底掌控他的命脉。" },
      { id: 4, name: "永夜共治", task: "斩断人类猎人与纯血议会的双重逼迫，以眷属之名注入亲王心口之血，登上黑铁王座，与他平分无尽的永生。" },
    ],
  },
];

function ensurePr(){
  if(!state.pr || typeof state.pr!=="object"){
    state.pr = LS.get("pr_v1", null) || LS.get("pr_v1_bak", null) || {};
  }
  if(!Array.isArray(state.pr.archives)) state.pr.archives = [];
  if(!state.pr.active) state.pr.active = null;
  // 可编辑世界书：本地优先；预设里有、本地没有的 id 会自动补上（方便加新世界）
  if(!Array.isArray(state.pr.worlds)) state.pr.worlds = [];
  if(!state.pr.worlds.length){
    state.pr.worlds = PR_WORLD_PRESETS.map(w=>({
      id: w.id, name: w.name, world: w.world,
      stages: w.stages.map(s=>({...s})),
    }));
    prSave();
  } else {
    const have = new Set(state.pr.worlds.map(w=>w.id));
    let added = false;
    PR_WORLD_PRESETS.forEach(w=>{
      if(!have.has(w.id)){
        state.pr.worlds.push({
          id: w.id, name: w.name, world: w.world,
          stages: w.stages.map(s=>({...s})),
        });
        added = true;
      }
    });
    if(added) prSave();
  }
  (state.pr.worlds||[]).forEach(w=>{
    if(w && typeof w.world==="string" && /Zephyr/.test(w.world)){
      w.world = w.world.replace(/Zephyr/g, "Aries");
    }
  });
  if(!state.pr.selectedWorldId) state.pr.selectedWorldId = state.pr.worlds[0].id;
  return state.pr;
}
function prSave(){
  try{
    if(state.pr && state.pr.active) state.pr.active.updatedAt = new Date().toISOString();
    LS.set("pr_v1", state.pr);
    LS.set("pr_v1_bak", state.pr);
    try{
      if(typeof __nativeMirrorWrite==="function"){
        __nativeMirrorWrite("pr_v1", state.pr);
        __nativeMirrorWrite("pr_v1_bak", state.pr);
      }
    }catch(e2){}
  }catch(e){ console.warn("prSave", e); }
}
function prUid(){ return "pr_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function prGetWorld(id){
  const pr = ensurePr();
  return (pr.worlds||[]).find(w=>w.id===(id||pr.selectedWorldId)) || (pr.worlds||[])[0] || PR_WORLD_PRESETS[0];
}

/** 写入记忆库，主聊天检索时能「想起」冒险 */
function prWriteToMemory(content, importance){
  if(!content) return;
  if(!Array.isArray(state.memories)) state.memories = [];
  state.memories.unshift({
    id: Date.now() + Math.floor(Math.random()*1000),
    content: String(content).slice(0, 500),
    layer: "pr",
    importance: importance==null ? 7 : importance,
    valence: 0.3,
    arousal: 0.55,
    createdAt: new Date().toISOString(),
    activations: 1,
    source: "pr",
  });
  // 同 source 只保留最近 30 条 PR 记忆，避免刷屏
  let prCount = 0;
  state.memories = state.memories.filter(m=>{
    if(m.layer!=="pr" && m.source!=="pr") return true;
    prCount++;
    return prCount <= 30;
  });
  try{ persist("memories"); }catch(e){}
}

function prStartNew(stageId, worldId){
  const pr = ensurePr();
  const w = prGetWorld(worldId || pr.selectedWorldId);
  const stages = w.stages || [];
  const stg = stages.find(s=>s.id===stageId) || stages[0];
  if(!stg){ alert("该世界没有任务阶段"); return; }
  if(pr.active && (pr.active.messages||[]).length){
    if(!confirm("当前有进行中的冒险，开始新的会把旧的先存档。继续？")) return;
    prArchiveActive(false);
  }
  pr.selectedWorldId = w.id;
  pr.active = {
    id: prUid(),
    worldId: w.id,
    worldName: w.name,
    stage: stg.id,
    stageName: stg.name,
    world: w.world,
    task: stg.task,
    messages: [],
    summary: "尚未开始。任务："+stg.name+"——"+stg.task,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  prSave();
  prWriteToMemory(`【PR·${w.name}】开启「${stg.name}」：${stg.task}`, 8);
  state.prOpen = true;
  state.prMin = false;
  state.chatMoreOpen = false;
  render();
}

function prArchiveActive(showToast){
  const pr = ensurePr();
  if(!pr.active) return;
  const a = pr.active;
  prWriteToMemory(`【PR·${a.worldName||"冒险"}·存档】${a.stageName}：${(a.summary||"").slice(0,200)}`, 7);
  const snap = JSON.parse(JSON.stringify(Object.assign({}, a, { archivedAt: new Date().toISOString(), slotType: "end" })));
  pr.archives = [snap].concat(pr.archives||[]).slice(0, 40);
  pr.active = null;
  prSave();
  state.prOpen = false;
  state.prMin = false;
  if(showToast!==false && typeof showToast==="function") showToast("冒险已存档并写入记忆库");
}

/** 暂时中断：保留 active，并额外留一份可读档快照（像文游存档） */
function prQuickSave(){
  const pr = ensurePr();
  if(!pr.active){ if(typeof showToast==="function") showToast("没有进行中的冒险"); return; }
  const a = pr.active;
  a.updatedAt = new Date().toISOString();
  const snap = JSON.parse(JSON.stringify(Object.assign({}, a, {
    id: prUid(),
    archivedAt: new Date().toISOString(),
    slotType: "quick",
    summary: (a.summary||"") + "（快速存档）",
  })));
  pr.archives = [snap].concat(pr.archives||[]).slice(0, 40);
  prSave();
  state.prOpen = false;
  state.prMin = false;
  if(typeof showToast==="function") showToast("已快速存档，可随时读档继续");
}

function prLoadArchive(id){
  const pr = ensurePr();
  const a = (pr.archives||[]).find(x=>x.id===id);
  if(!a){ if(typeof showToast==="function") showToast("存档不存在"); return; }
  if(pr.active && (pr.active.messages||[]).length){
    if(!confirm("读档会覆盖当前进行中的冒险（会先自动快速存档当前进度）。继续？")) return;
    prQuickSave();
  }
  const loaded = JSON.parse(JSON.stringify(a));
  loaded.id = prUid();
  delete loaded.archivedAt;
  delete loaded.slotType;
  pr.active = loaded;
  pr.selectedWorldId = loaded.worldId || pr.selectedWorldId;
  prSave();
  state.prOpen = true;
  state.prMin = false;
  if(typeof showToast==="function") showToast("已读档："+(loaded.stageName||""));
  render();
}

function prAddCustomWorld(){
  const pr = ensurePr();
  const name = prompt("新世界名称", "我的世界");
  if(!name || !name.trim()) return;
  const id = "custom_"+Date.now().toString(36);
  pr.worlds.push({
    id,
    name: name.trim(),
    world: "世界："+name.trim()+"\n\n一、世界底层法则\n（在这里写法则）\n\n二、核心角色\n· 对方：\n· 你：\n",
    stages: [
      { id:1, name:"第一阶段", task:"写下本阶段要完成的事" },
      { id:2, name:"第二阶段", task:"写下本阶段要完成的事" },
    ],
  });
  pr.selectedWorldId = id;
  prSave();
  state.prEditWorldId = id;
  if(typeof showToast==="function") showToast("已创建，请编辑世界书与任务");
  render();
}

function prMainChatPromptBlock(){
  const pr = ensurePr();
  if(!pr.active) return "";
  const a = pr.active;
  const n = (a.messages||[]).length;
  return `\n\n【重要 · Jasmine 正在玩 PR 快穿】\nJasmine 此刻有一条进行中的快穿冒险（不是普通聊天）：\n- 世界：${a.worldName||""}\n- 阶段：${a.stageName}\n- 任务：${a.task}\n- 已对话 ${n} 句\n- 进度摘要：${a.summary||"（刚开始）"}\n\n主聊天规则：\n1. 你（Aries）必须知道 Jasmine 在玩这条快穿，不要装不知道、不要猜「是不是换世界线」。\n2. 主聊天仍用日常人设（Aries），不要用冒险里的异族/世子等身份持续扮演。\n3. 可以自然提一句她在玩的世界/阶段，关心或调侃，接得上摘要即可。\n4. 完整剧情扮演只在 PR 框里进行。`;
}

function prPlayPromptBlock(){
  const pr = ensurePr();
  if(!pr.active) return ""; // 只要有 active 就给全套（面板发送也会用）
  const a = pr.active;
  return `\n\n【PR快穿 · 独立扮演 · 必须遵守】\n世界：${a.worldName||""}\n${a.world}\n\n当前阶段：${a.stage} · ${a.stageName}\n任务目标：${a.task}\n\n视角与文风（非常重要）：\n- 你是世界书里与 Jasmine 相对的那一方角色（用「我」；日常主聊天你是 Aries，此处按世界书身份演）。\n- Jasmine 是她在该世界中的身份（对她只用「你」，禁止用「她」等第三人称指她）。\n- 禁止旁白上帝视角写「她如何如何」；要写成对「你」正在发生的事。\n- 可见回复直接演出现场，推进当前阶段；不要解释系统规则、不要跳出角色。`;
}

function prRefreshSummary(){
  const pr = ensurePr();
  if(!pr.active) return;
  const msgs = pr.active.messages || [];
  const tail = msgs.slice(-6).map(m=>{
    const who = m.role==="user"?"你":"对方";
    return who+"："+String(m.content||"").replace(/\s+/g," ").slice(0,40);
  }).join(" / ");
  pr.active.summary = `「${pr.active.worldName||""}·${pr.active.stageName}」近况：${tail||"刚开场"}`;
  pr.active.updatedAt = new Date().toISOString();
  prSave();
  // 每累计约 4 句用户话写一条记忆（与聊天同频的节奏感）
  const userN = msgs.filter(m=>m.role==="user").length;
  if(userN>0 && userN % 4 === 0){
    prWriteToMemory(`【PR·${pr.active.worldName}】${pr.active.summary}`, 6);
  }
}

function renderPrHub(){
  const pr = ensurePr();
  const active = pr.active;
  const archives = pr.archives||[];
  const worlds = pr.worlds||[];
  const cur = prGetWorld(pr.selectedWorldId);
  const editing = state.prEditWorldId;
  const editW = editing ? worlds.find(w=>w.id===editing) : null;
  let editBlock = "";
  if(editW){
    editBlock = `<div class="status-card" style="padding:12px;margin-bottom:12px">
      <div style="font-weight:600;margin-bottom:8px">编辑世界书 · ${esc(editW.name)}</div>
      <input id="pr-edit-name" value="${esc(editW.name)}" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:8px 12px;background:var(--bg);color:var(--text);margin-bottom:8px"/>
      <textarea id="pr-edit-world" rows="8" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:8px 12px;background:var(--bg);color:var(--text);font-size:12px;line-height:1.5">${esc(editW.world)}</textarea>
      <div style="font-size:11px;color:var(--sub);margin:8px 0 4px">任务（每行：名称|内容）</div>
      <textarea id="pr-edit-stages" rows="5" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:8px 12px;background:var(--bg);color:var(--text);font-size:12px">${esc((editW.stages||[]).map(s=>s.name+"|"+s.task).join("\n"))}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button type="button" class="btn-accent" id="pr-edit-save" style="flex:1;padding:10px">保存</button>
        <button type="button" class="btn-ghost" id="pr-edit-cancel" style="flex:1;padding:10px">取消</button>
      </div>
    </div>`;
  }
  return `<div class="page">
    ${subHeader('<i data-lucide="sparkles"></i> PR 快穿')}
    <p class="page-sub">多世界观 · 可编辑 · 本地存档 · 写入记忆库</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      ${worlds.map(w=>`<button type="button" class="${w.id===cur.id?"btn-accent":"btn-ghost"}" data-pr-world="${esc(w.id)}" style="padding:8px 12px">${esc(w.name)}</button>`).join("")}
      <button type="button" class="btn-ghost" id="pr-edit-open" style="padding:8px 12px">编辑当前世界书</button>
      <button type="button" class="btn-ghost" id="pr-add-world" style="padding:8px 12px">＋ 自定义世界</button>
    </div>
    ${editBlock}
    <div class="status-card" style="padding:12px;margin-bottom:12px;font-size:12px;line-height:1.55;color:var(--sub);max-height:120px;overflow:auto;white-space:pre-wrap">${esc((cur.world||"").slice(0,320))}…</div>
    ${active?`<div class="status-card" style="padding:12px;margin-bottom:12px">
      <div style="font-weight:600">进行中 · ${esc(active.worldName||"")} · ${esc(active.stageName)}</div>
      <div style="font-size:12px;color:var(--sub);margin-top:4px">${esc(active.task)}</div>
      <div style="font-size:12px;color:var(--sub);margin-top:6px">摘要：${esc(active.summary||"")}</div>
      <button type="button" class="btn-accent" id="pr-resume" style="width:100%;margin-top:10px;padding:10px">继续冒险</button>
      <button type="button" class="btn-ghost" id="pr-quick-save" style="width:100%;margin-top:8px;padding:10px">暂时中断 · 快速存档</button>
      <button type="button" class="btn-ghost" id="pr-end" style="width:100%;margin-top:8px;padding:10px">结束并存档</button>
    </div>`:""}
    <div style="font-weight:600;margin:8px 0">开启任务 · ${esc(cur.name)}</div>
    ${(cur.stages||[]).map(s=>`<button type="button" class="status-card" data-pr-start="${s.id}" style="width:100%;text-align:left;padding:12px;margin-bottom:8px">
      <div style="font-weight:600">第${s.id}阶段 · ${esc(s.name)}</div>
      <div style="font-size:12px;color:var(--sub);margin-top:4px">${esc(s.task)}</div>
    </button>`).join("")}
    <div style="font-weight:600;margin:12px 0 8px">存档（${archives.length}）</div>
    ${archives.length?archives.slice(0,15).map(a=>`<div class="status-card" style="padding:10px 12px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:600">${esc(a.worldName||"")} · ${esc(a.stageName)} · ${(a.messages||[]).length} 句</div>
      <div style="font-size:11px;color:var(--sub);margin-top:4px">${esc((a.summary||"").slice(0,80))}</div>
      <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
        <button type="button" class="btn-ghost" data-pr-view="${esc(a.id)}" style="padding:6px 10px">回看</button>
        <button type="button" class="btn-accent" data-pr-load="${esc(a.id)}" style="padding:6px 10px">读档继续</button>
      </div>
    </div>`).join(""):`<div class="empty-state" style="padding:20px">还没有存档</div>`}
  </div>`;
}

function renderPrPanel(){
  if(!state.prOpen || state.prMin) return "";
  const pr = ensurePr();
  const a = pr.active;
  if(!a) return "";
  const msgs = (a.messages||[]).map(m=>{
    const cls = m.role==="user"?"user":"ai";
    return `<div class="pr-bubble ${cls}">${esc(m.content||"")}</div>`;
  }).join("") || `<div style="text-align:center;color:var(--sub);font-size:13px;padding:24px 8px">触手在暗处苏醒。写下你的第一句话。</div>`;
  return `<div class="pr-panel-mask" id="pr-panel-mask">
    <div class="pr-panel" onclick="event.stopPropagation()">
      <div class="pr-panel-head">
        <div>
          <div style="font-weight:600;font-size:14px">深海骨殖 · ${esc(a.stageName)}</div>
          <div style="font-size:11px;color:var(--sub)">${esc(a.task.slice(0,28))}…</div>
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" class="btn-ghost" id="pr-min-btn" style="padding:6px 10px">—</button>
          <button type="button" class="btn-ghost" id="pr-close-btn" style="padding:6px 10px">收起</button>
        </div>
      </div>
      <div class="pr-msgs" id="pr-msgs">${msgs}</div>
      <div class="pr-input-row">
        <input id="pr-input" placeholder="写下你的下一句…" value="${esc(state.prDraft||"")}" autocomplete="off"/>
        <button type="button" class="btn-accent" id="pr-send" style="padding:10px 14px;border-radius:18px">发送</button>
      </div>
    </div>
  </div>`;
}

function renderPrFloat(){
  // 不再用缩小胶囊：从 + 进 PR 直接全屏弹层；收起即关，再点 + 重新打开
  return "";
}

async function prSendUser(){
  const pr = ensurePr();
  if(!pr.active) return;
  const input = document.getElementById("pr-input");
  const text = (input && input.value || state.prDraft || "").trim();
  if(!text) return;
  state.prDraft = "";
  if(input) input.value = "";
  pr.active.messages.push({ role:"user", content:text, time:new Date().toISOString() });
  prRefreshSummary();
  prSave();
  render();
  // 滚到底
  setTimeout(()=>{ const el=document.getElementById("pr-msgs"); if(el) el.scrollTop=el.scrollHeight; }, 30);

  // 调用与主聊天相同的后端（若存在 sendToAI / callChat）
  try{
    const sys = prPlayPromptBlock() + "\n\n【进度摘要】"+pr.active.summary;
    const history = pr.active.messages.slice(-20).map(m=>({ role: m.role, content: m.content }));
    let reply = "";
    if(typeof callChatAPI === "function"){
      const ag = (typeof agentById==="function" ? agentById(state.chatTarget||"a1") : null)
        || ((state.agents||[]).find(a=>a.enabled!==false) || null);
      if(!ag){ reply = "（请先在设置页配置 AI 的 API Key）"; }
      else {
        const msgs = history.map(m=>({ role: m.role==="assistant"?"assistant":"user", content: m.content }));
        reply = await callChatAPI(ag, msgs, sys);
      }
    } else {
      reply = "（PR 通道未接到模型接口）";
    }
    if(reply){
      pr.active.messages.push({ role:"assistant", content: String(reply), time:new Date().toISOString() });
      prRefreshSummary();
      prSave();
      render();
      setTimeout(()=>{ const el=document.getElementById("pr-msgs"); if(el) el.scrollTop=el.scrollHeight; }, 30);
    }
  }catch(e){
    pr.active.messages.push({ role:"assistant", content:"（连接失败："+e.message+"）", time:new Date().toISOString() });
    prSave();
    render();
  }
}