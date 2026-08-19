// Memory Palace · 安卓后台生成 runner（@capacitor/background-runner 独立 JS 引擎）
// 收到 bgchat 事件：读任务（dispatch details 或 CapacitorKV 兜底）→ 调 LLM → 本地通知(onNotify) → 结果送 VPS pull 队列
addEventListener('bgchat', async (resolve, reject, args) => {
  try {
    let task = null;
    if (args && args.task) task = args.task;
    if (!task) {
      const kv = await CapacitorKV.get('mpBgTask');
      if (kv && kv.value) { try { task = JSON.parse(kv.value); } catch (e) {} }
    }
    if (!task || !task.messages || !task.messages.length) { resolve(); return; }
    // 落 KV：interval 定时重跑时也能兜底
    try { await CapacitorKV.set('mpBgTask', JSON.stringify(task)); } catch (e) {}
    let reply = '';
    try {
      reply = await callLLM(task);
    } catch (e) {
      reply = '【后台生成失败】' + (e && e.message ? e.message : String(e));
    }
    reply = String(reply || '').trim();
    if (!reply) { try { await CapacitorKV.remove('mpBgTask'); } catch (e) {} resolve(); return; }
    // onNotify：本地通知
    if (task.notify) {
      try {
        await CapacitorNotifications.schedule([{
          id: (Date.now() % 2147483647) || 1,
          title: task.agentName || 'TA',
          body: reply.replace(/\s+/g, ' ').trim().slice(0, 120),
          scheduleAt: new Date(),
        }]);
      } catch (e) {}
    }
    // 结果送 VPS pull 队列（带 threadId），回前台/点通知自动拉到原线程
    if (task.wakeBase) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (task.wakeToken) headers['X-Auth-Token'] = task.wakeToken;
        await fetch(String(task.wakeBase).replace(/\/$/, '') + '/proactive/push_bg', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ content: reply, threadId: task.threadId || 'a1', reason: 'bg' }),
        });
      } catch (e) {}
    }
    try { await CapacitorKV.remove('mpBgTask'); } catch (e) {}
    resolve(reply);
  } catch (e) {
    reject(e);
  }
});

async function callLLM(task) {
  const m = task.messages || [];
  const sys = task.sys || '';
  const c = task.cfg || {};
  if (c.channel === 'gemini') {
    const contents = [];
    if (sys) { contents.push({ role: 'user', parts: [{ text: sys }] }); contents.push({ role: 'model', parts: [{ text: '好的，我记住了。' }] }); }
    (m || []).forEach(function (x) {
      contents.push({ role: (x.role === 'assistant' ? 'model' : 'user'), parts: [{ text: x.content || '' }] });
    });
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(c.geminiModel || 'gemini-2.0-flash') + ':generateContent?key=' + encodeURIComponent(c.geminiKey || '');
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: contents, generationConfig: { temperature: 0.9, maxOutputTokens: 8192 } }) });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    return parts.map(function (p) { return p.text || ''; }).join('').trim() || '（无响应）';
  }
  if (c.channel === 'claude') {
    const sysMsgs = sys ? [{ role: 'user', content: sys }, { role: 'assistant', content: '好的，我记住了。' }] : [];
    const body = { model: 'claude-sonnet-4-6', max_tokens: 16000, messages: sysMsgs.concat(m), thinking: { type: 'enabled', budget_tokens: 8000 } };
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': c.claudeKey || '', 'anthropic-version': '2023-06-01', 'anthropic-beta': 'interleaved-thinking-2025-05-14' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const blocks = Array.isArray(data.content) ? data.content : [];
    const texts = [];
    blocks.forEach(function (b) { if (b && b.type === 'text' && b.text) texts.push(b.text); });
    return texts.join('\n').trim() || '（无响应）';
  }
  const base = String(c.openaiBase || 'https://api.openai.com/v1').replace(/\/$/, '');
  const body = { model: c.openaiModel || 'gpt-4o', messages: sys ? [{ role: 'system', content: sys }].concat(m) : m };
  const res = await fetch(base + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (c.openaiKey || '') }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  const msg = (data.choices && data.choices[0] && data.choices[0].message) || {};
  const reasoning = msg.reasoning_content || msg.reasoning || msg.thinking;
  const text = msg.content || '（无响应）';
  return reasoning ? '<thinking>\n' + reasoning + '\n</thinking>\n\n' + text : text;
}
