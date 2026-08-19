/**
 * Memory Palace · 后端桥（可选接入）
 * 用法：在 index.html 里 <script src="backend-bridge.js"></script>
 * 然后在设置里填 API 根地址与 token，或：
 *   localStorage.setItem('mp_api_base', 'https://your-vps:8787');
 *   localStorage.setItem('mp_api_token', '你的AUTH_TOKEN');
 *
 * 提供：
 *   window.MPBackend.reply({ threadId, messages, systemPrompt, ... })
 *   → 返回 job，并轮询直到 done/failed
 */
(function (global) {
  function base() {
    return (localStorage.getItem("mp_api_base") || "").replace(/\/$/, "");
  }
  function token() {
    return localStorage.getItem("mp_api_token") || "";
  }

  async function request(path, opts) {
    const b = base();
    if (!b) throw new Error("未设置 mp_api_base");
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      (opts && opts.headers) || {}
    );
    const t = token();
    if (t) headers.Authorization = "Bearer " + t;
    const res = await fetch(b + path, Object.assign({}, opts, { headers }));
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { raw: text };
    }
    if (!res.ok) {
      const msg = (data && (data.detail || data.error)) || res.statusText || "请求失败";
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
    return data;
  }

  async function health() {
    return request("/api/health", { method: "GET" });
  }

  async function startReply(payload) {
    return request("/api/chat/reply", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function getJob(jobId) {
    return request("/api/chat/jobs/" + encodeURIComponent(jobId), { method: "GET" });
  }

  /** 轮询直到完成，intervalMs 默认 1.2s，超时 3 分钟 */
  async function waitJob(jobId, onProgress, intervalMs, timeoutMs) {
    const start = Date.now();
    intervalMs = intervalMs || 1200;
    timeoutMs = timeoutMs || 180000;
    while (true) {
      const job = await getJob(jobId);
      if (onProgress) onProgress(job);
      if (job.status === "done" || job.status === "failed") return job;
      if (Date.now() - start > timeoutMs) throw new Error("等待回复超时");
      await new Promise(function (r) {
        setTimeout(r, intervalMs);
      });
    }
  }

  /**
   * 一键：提交异步回复并等到结果
   * payload 字段对齐后端 ReplyRequest
   */
  async function reply(opts) {
    const payload = {
      thread_id: opts.threadId || opts.thread_id || "default",
      user_message: opts.userMessage || opts.user_message || null,
      messages: opts.messages || [],
      system_prompt: opts.systemPrompt || opts.system_prompt || null,
      channel: opts.channel || null,
      model: opts.model || null,
      speaker_id: opts.speakerId || opts.speaker_id || "a1",
      speaker_name: opts.speakerName || opts.speaker_name || "AI",
      notify: opts.notify !== false,
      notify_title: opts.notifyTitle || "Memory Palace",
      notify_body: opts.notifyBody || "有新的回复",
    };
    const job = await startReply(payload);
    return waitJob(job.id, opts.onProgress);
  }

  async function registerPushToken(fcmToken, platform) {
    return request("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ token: fcmToken, platform: platform || "android" }),
    });
  }

  async function getMessages(threadId, limit) {
    const q = limit ? "?limit=" + limit : "";
    return request("/api/threads/" + encodeURIComponent(threadId) + "/messages" + q, {
      method: "GET",
    });
  }

  global.MPBackend = {
    request: request,
    health: health,
    startReply: startReply,
    getJob: getJob,
    waitJob: waitJob,
    reply: reply,
    registerPushToken: registerPushToken,
    getMessages: getMessages,
    setConfig: function (apiBase, apiToken) {
      if (apiBase != null) localStorage.setItem("mp_api_base", apiBase);
      if (apiToken != null) localStorage.setItem("mp_api_token", apiToken);
    },
  };
})(window);
