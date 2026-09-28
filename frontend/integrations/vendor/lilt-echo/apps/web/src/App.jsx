import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "./api.js";
import { detectPitch, noteForHz } from "./pitchDetector.js";
import ReferencePitchView from "./ReferencePitchView.jsx";

function formatTime(value = 0) {
  const seconds = Math.max(0, Math.floor(value / 1_000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function activeLyric(lines, position) {
  if (!lines.length) return { current: null, next: null };
  const index = lines.findLastIndex((line) => line.at_ms <= position + 180);
  if (index < 0) return { current: lines[0], next: lines[1] || null };
  return { current: lines[index], next: lines[index + 1] || null };
}

function linePath(points, width, height, maximumX, minimumY, maximumY) {
  if (!points.length || maximumX <= 0 || maximumY <= minimumY) return "";
  return points.map((point, index) => {
    const x = (point.t_ms / maximumX) * width;
    const y = height - ((point.hz - minimumY) / (maximumY - minimumY)) * height;
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function PitchGraph({ localSamples, referenceFrames, referenceSource }) {
  const local = localSamples.map((sample) => ({ t_ms: sample.t_ms, hz: sample.hz }));
  const reference = referenceFrames.slice(0, 180).map((frame) => ({ t_ms: frame.t_ms, hz: frame.hz }));
  const all = [...local, ...reference];
  const minHz = Math.max(50, Math.min(...all.map((point) => point.hz), 120) - 20);
  const maxHz = Math.max(260, Math.max(...all.map((point) => point.hz), 260) + 20);
  const localDuration = Math.max(3_000, ...local.map((point) => point.t_ms));
  const referenceDuration = Math.max(1, ...reference.map((point) => point.t_ms));
  const localPath = linePath(local, 640, 148, localDuration, minHz, maxHz);
  const referencePath = linePath(reference, 640, 148, referenceDuration, minHz, maxHz);
  return (
    <div className="pitch-graph" aria-label="音高走势示意图">
      <svg viewBox="0 0 640 148" preserveAspectRatio="none" role="img">
        <line x1="0" x2="640" y1="37" y2="37" className="grid-line" />
        <line x1="0" x2="640" y1="74" y2="74" className="grid-line" />
        <line x1="0" x2="640" y1="111" y2="111" className="grid-line" />
        {referencePath && <path d={referencePath} className="reference-path" />}
        {localPath && <path d={localPath} className="local-path" />}
      </svg>
      <div className="graph-key"><span><i className="local-dot" />本地音高</span>{referencePath && <span><i className="reference-dot" />{referenceSource === "synthetic_demo" ? "示例参考线" : "原曲主导音高"}</span>}</div>
    </div>
  );
}

const ENERGY_LABEL = { low: "收着", medium: "平稳", high: "撑开" };
const MOTION_LABEL = {
  spacious: "舒展", moderate: "中等", active: "活跃",
  rising: "偏上行", falling: "偏回落", steady: "较平稳",
};
const TIMBRE_LABEL = {
  warm: "低频感较多", smooth: "平滑",
  balanced: "高低频较均衡", bright: "高频感较多", bright_or_noisy: "高频／噪声较多",
};
const ARC_LABEL = {
  rising: "一路往后抬升", falling: "从前段慢慢回落",
  arch: "中段拱起一个高点", valley: "中段收束后再展开", steady: "整体比较平稳",
};
const SECTION_LABEL = { early: "前段", opening: "前段", middle: "中段", late: "后段", closing: "后段" };

function SongInsightPanel({ profile, referenceSource }) {
  const energy = profile?.energy || {};
  const melody = profile?.melody || {};
  const segments = Array.isArray(energy.segments) ? energy.segments.slice(0, 12) : [];
  const range = Number(melody.range_semitones);
  const motion = MOTION_LABEL[profile?.motion?.label] || MOTION_LABEL[melody.movement] || "—";
  const timbre = TIMBRE_LABEL[profile?.timbre?.label] || "—";
  const melodyMotion = MOTION_LABEL[melody.movement] || "—";
  const source = referenceSource === "synthetic_demo" ? "合成演示数据" : "已授权原曲的派生轮廓";

  return (
    <section className="card insight-card" aria-labelledby="insight-title">
      <div className="section-heading">
        <div><p className="eyebrow">声音线索与变化</p><h2 id="insight-title">歌曲理解</h2></div>
        <span className="insight-source">{source}</span>
      </div>
      <p className="insight-summary">
        {profile ? `${motion}律动 · ${timbre} · ${ARC_LABEL[energy.movement] || "动态仍在整理"}` : "等待原曲分析"}
      </p>
      <div className="insight-energy" aria-label="整首歌曲能量走向">
        <div><span>能量走向</span><small>{ENERGY_LABEL[energy.start] || "—"} → {ENERGY_LABEL[energy.end] || "—"}</small></div>
        <div className="insight-bars">
          {(segments.length ? segments : Array.from({ length: 8 }, () => ({ level: 8 }))).map((segment, index) => (
            <i key={`${segment.start_ms || index}-${index}`} style={{ "--energy": `${Math.max(5, Math.min(100, Number(segment.level) || 0))}%` }} />
          ))}
        </div>
        <p>{ARC_LABEL[energy.movement] || "这首的动态暂时难以稳定判断"}{SECTION_LABEL[energy.peak] ? `，高点偏${SECTION_LABEL[energy.peak]}` : ""}。</p>
      </div>
      <div className="insight-grid">
        <div><span>律动密度</span><b>{motion}</b></div>
        <div><span>频段质地</span><b>{timbre}</b></div>
        <div><span>旋律走向</span><b>{melodyMotion}</b></div>
        <div><span>旋律音域</span><b>{Number.isFinite(range) ? `约 ${range.toFixed(1)} 半音` : "—"}</b></div>
      </div>
      <p className="insight-tip">从完整混音的能量、律动、频段和主导旋律估计；不把频段当情绪，也不宣称人声分离精度。</p>
    </section>
  );
}

function MessageList({ messages }) {
  if (!messages.length) return <p className="empty-copy">在这里问“现在唱到哪一句？”试试歌词上下文注入。</p>;
  return (
    <div className="messages">
      {messages.map((message) => (
        <article className={`message ${message.role}`} key={message.id}>
          <small>{message.role === "user" ? "你" : "歌曲反馈适配器"}{message.kind === "singing_receipt" ? " · 跟唱回执" : ""}</small>
          <p>{message.content}</p>
        </article>
      ))}
    </div>
  );
}

export default function App() {
  const [room, setRoom] = useState(null);
  const [lyrics, setLyrics] = useState([]);
  const [referenceFrames, setReferenceFrames] = useState([]);
  const [referenceSource, setReferenceSource] = useState("");
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sharePitch, setSharePitch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [localSamples, setLocalSamples] = useState([]);
  const [singing, setSinging] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [songs, setSongs] = useState([]);
  const [understanding, setUnderstanding] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);
  const clockRef = useRef({ position: 0, at: performance.now(), playing: false, duration: 42000 });
  const getPosition = useCallback(() => {
    const audio = audioRef.current;
    if (audio?.src) return audio.currentTime * 1000;
    const clock = clockRef.current;
    return Math.min(clock.duration, clock.position + (clock.playing ? performance.now() - clock.at : 0));
  }, []);

  const captureRef = useRef(null);
  const sessionRef = useRef(null);
  const pendingSamplesRef = useRef([]);
  const localSamplesRef = useRef([]);
  const queuedUpdateRef = useRef(Promise.resolve());

  const refreshMessages = useCallback(async () => {
    const result = await api.messages();
    setMessages(result.messages);
  }, []);

  const loadSongData = useCallback(async (songId) => {
    if (!songId) return;
    const [lyricResult, referenceResult, profileResult, understandingResult] = await Promise.all([
      api.lyrics(songId),
      api.referencePitch(songId),
      api.profile(songId),
      api.understanding(songId),
    ]);
    setLyrics(lyricResult.lines || []);
    setReferenceFrames(referenceResult.pitch?.frames || []);
    setReferenceSource(referenceResult.source || "");
    setProfile(profileResult.profile || null);
    setUnderstanding(understandingResult);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [roomResult] = await Promise.all([api.room(), refreshMessages()]);
      setRoom(roomResult.room);
      setSongs((await api.songs()).songs);
      await loadSongData(roomResult.room.current_song?.id);
    } catch (error) {
      setNotice(error.message || "无法连接演示 API");
    }
  }, [loadSongData, refreshMessages]);

  useEffect(() => { void refresh(); }, [refresh]);

  // This is a single-user analysis workbench, not shared playback or a room client.
  useEffect(() => {
    clockRef.current = { position: room?.position_ms || 0, at: performance.now(),
      playing: Boolean(room?.is_playing), duration: room?.current_song?.duration_ms || 42000 };
  }, [room?.current_song?.id, room?.is_playing]);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  useEffect(() => {
    if (!room?.is_playing || !room.current_song) return undefined;
    const duration = room.current_song.duration_ms;
    const timer = window.setInterval(() => {
      setRoom((previous) => {
        if (!previous?.is_playing) return previous;
        const position = Math.min(getPosition(), duration);
        if (position >= duration) {
          void api.controlRoom("pause", position).catch(() => {});
          return { ...previous, is_playing: false, position_ms: position };
        }
        return { ...previous, position_ms: position };
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [room?.current_song, room?.is_playing, getPosition]);

  const queueSharedSamples = useCallback((elapsedMs) => {
    const session = sessionRef.current;
    if (!session || !pendingSamplesRef.current.length) return queuedUpdateRef.current;
    const batch = pendingSamplesRef.current.splice(0, 32);
    queuedUpdateRef.current = queuedUpdateRef.current
      .catch(() => undefined)
      .then(async () => {
        const result = await api.updateSinging(session.session_id, elapsedMs, batch);
        if (sessionRef.current?.session_id === session.session_id) {
          sessionRef.current = result.session;
          setSinging(result.session);
        }
      });
    return queuedUpdateRef.current;
  }, []);

  const releaseMicrophone = useCallback(() => {
    const capture = captureRef.current;
    if (!capture) return;
    window.clearInterval(capture.pitchTimer);
    window.clearInterval(capture.shareTimer);
    capture.stream.getTracks().forEach((track) => track.stop());
    void capture.context.close();
    captureRef.current = null;
  }, []);

  const stopPitchCapture = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture) return;
    setCapturing(false);
    window.clearInterval(capture.pitchTimer);
    window.clearInterval(capture.shareTimer);
    const elapsedMs = Math.round(performance.now() - capture.startedAt);
    // Release the device immediately, even if an in-flight API request stalls.
    releaseMicrophone();
    await queueSharedSamples(elapsedMs).catch(() => setNotice("部分共享数据未送达，正在释放麦克风。"));
    await queuedUpdateRef.current.catch(() => undefined);
    const session = sessionRef.current;
    releaseMicrophone();
    sessionRef.current = null;
    pendingSamplesRef.current = [];
    if (!session) {
      setNotice("本地音高已停止；没有上传任何麦克风数据。");
      return;
    }
    try {
      const result = await api.stopSinging(session.session_id, elapsedMs);
      setSinging(result.session || null);
      if (result.reply) await refreshMessages();
      setNotice(result.reply ? "跟唱回执已作为主聊天中的一条回复加入。" : "跟唱片段太短，未写入聊天。");
    } catch (error) {
      setNotice(error.message || "停止跟唱时出错");
    }
  }, [queueSharedSamples, refreshMessages, releaseMicrophone]);

  useEffect(() => () => { releaseMicrophone(); }, [releaseMicrophone]);

  const startPitchCapture = useCallback(async () => {
    if (!room?.current_song || capturing) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("此浏览器不支持麦克风音高检测。");
      return;
    }
    setBusy(true);
    setNotice(sharePitch ? "正在请求麦克风；仅会共享稀疏音高点。" : "正在请求麦克风；音高将只留在此浏览器内存中。");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      captureRef.current = { stream, context, startedAt: performance.now() };
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2_048;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      const startedAt = performance.now();
      let session = null;
      if (sharePitch) {
        const result = await api.startSinging(room.current_song.id, getPosition());
        session = result.session;
        sessionRef.current = session;
        setSinging(session);
      }
      pendingSamplesRef.current = [];
      localSamplesRef.current = [];
      setLocalSamples([]);
      const buffer = new Float32Array(analyser.fftSize);
      const pitchTimer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const pitch = detectPitch(buffer, context.sampleRate);
        if (!pitch.hz || pitch.confidence < 0.55) return;
        const point = { t_ms: Math.round(performance.now() - startedAt), hz: Math.round(pitch.hz * 10) / 10 };
        localSamplesRef.current = [...localSamplesRef.current.slice(-80), point];
        setLocalSamples(localSamplesRef.current);
        if (sessionRef.current) pendingSamplesRef.current.push(point);
      }, 180);
      const shareTimer = window.setInterval(() => {
        const elapsedMs = Math.round(performance.now() - startedAt);
        void queueSharedSamples(elapsedMs).catch((error) => setNotice(error.message || "音高共享暂时中断"));
      }, 1_000);
      captureRef.current = { stream, context, pitchTimer, shareTimer, startedAt };
      setCapturing(true);
      setNotice(session ? "正在跟唱：浏览器只上传稀疏 F0 音高点，不上传录音。" : "正在本地检测音高，不会上传录音或音高点。");
    } catch (error) {
      releaseMicrophone();
      setNotice(error.message || "无法打开麦克风");
    } finally {
      setBusy(false);
    }
  }, [capturing, queueSharedSamples, releaseMicrophone, room, sharePitch, getPosition]);

  const controlPlayback = useCallback(async (action, position) => {
    try {
      const current = Number.isFinite(position) ? position : getPosition();
      clockRef.current = { ...clockRef.current, position: current, at: performance.now(),
        playing: action === 'play' ? true : action === 'pause' ? false : clockRef.current.playing };
      if (audioRef.current?.src) {
        if (action === 'seek') audioRef.current.currentTime = current / 1000;
        if (action === 'play') await audioRef.current.play();
        if (action === 'pause') audioRef.current.pause();
      }
      if (action !== 'seek') await api.controlRoom('seek', current);
      const result = await api.controlRoom(action, current);
      setRoom(result.room);
    } catch (error) {
      setNotice(error.message || "无法更新本地时间轴");
    }
  }, [getPosition]);

  const selectSong = async (id) => {
    try {
      const selected = songs.find(item => item.id === id);
      if (!selected) return;
      if (audioRef.current) audioRef.current.pause();
      setAudioUrl('');
      const result = await api.selectSong(selected);
      setRoom(result.room);
      setLocalSamples([]);
      setUnderstanding(null);
      await loadSongData(id);
    } catch (error) { setNotice(error.message); }
  };

  const sendMessage = useCallback(async (event) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      await api.controlRoom('seek', getPosition());
      const result = await api.sendMessage(clean);
      setMessages((previous) => [...previous, ...result.messages]);
      setText("");
      setNotice(result.listening_context_attached ? `已附带歌曲字段：${result.context_fields.join("、")}` : "未附带歌曲上下文。");
    } catch (error) {
      setNotice(error.message || "发送失败");
    } finally {
      setBusy(false);
    }
  }, [busy, text, getPosition]);

  const lyric = useMemo(() => activeLyric(lyrics, room?.position_ms || 0), [lyrics, room?.position_ms]);
  const song = room?.current_song;
  const currentHz = localSamples.at(-1)?.hz;

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">默认本地处理 · 按需接入模型</p>
        <h1>Lilt Echo</h1>
        <p className="brand-tagline">必有回响。</p>
        <p>歌曲音高 · 理解 · 印象 · 跟唱。单人分析工作台，不提供一起听。默认合成演示；模型反馈需显式配置，不内置歌曲、账号或私人设定。</p>
      </header>

      <div className="workspace">
        <section className="card listening-card" aria-labelledby="listen-title">
          <div className="section-heading">
            <div><p className="eyebrow">本地音乐工作台</p><h2 id="listen-title">{song?.title || "载入样例中"}</h2><p>{song?.artist || ""}</p></div>
            <span className={`status ${room?.is_playing ? "live" : ""}`}>{room?.is_playing ? (audioUrl ? "本地播放中" : "演示播放中") : "已暂停"}</span>
          </div>
          <label>分析结果 <select value={song?.id || ''} disabled={capturing || busy} onChange={event => void selectSong(event.target.value)}>{songs.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <p className="demo-note">先选择对应分析结果，再选择同一首本地音频对照。音频仅在浏览器播放，不上传；未选音频时只是无声时间轴演示。</p>
          <label>本地对照音频 <input type="file" accept="audio/*" disabled={capturing} onChange={event => {
            const file = event.target.files?.[0];
            if (file) { void controlPlayback('pause'); setAudioUrl(URL.createObjectURL(file)); }
          }} /></label>
          <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" onEnded={() => void controlPlayback('pause')} />
          <div className="transport">
            <button type="button" onClick={() => controlPlayback(room?.is_playing ? "pause" : "play")} disabled={!room || capturing}>{room?.is_playing ? "暂停" : "播放"}</button>
            <span>{formatTime(room?.position_ms)} / {formatTime(song?.duration_ms)}</span>
          </div>
          <input
            className="seek"
            type="range"
            min="0"
            max={song?.duration_ms || 1}
            value={room?.position_ms || 0}
            onChange={(event) => void controlPlayback("seek", Number(event.target.value))}
            disabled={!room || capturing}
            aria-label="播放位置"
          />
          <div className="lyrics">
            <p className="lyric-label">当前示例行</p>
            <p className="current-lyric">{lyric.current?.text || "等待时间轴开始"}</p>
            <p className="next-lyric">下一句：{lyric.next?.text || "—"}</p>
          </div>
          {profile && <div className="outline"><span>声学轮廓</span><span>{ARC_LABEL[profile.energy?.movement] || "—"} · 旋律{MOTION_LABEL[profile.melody?.movement] || "—"} · {TIMBRE_LABEL[profile.timbre?.label] || "—"}</span></div>}
        </section>

        <section className="card pitch-card" aria-labelledby="pitch-title">
          <div className="section-heading"><div><p className="eyebrow">麦克风音高</p><h2 id="pitch-title">本地音高与可选跟唱</h2></div><span className="pitch-reading">{currentHz ? `${currentHz.toFixed(1)} Hz · ${noteForHz(currentHz)}` : "等待声音"}</span></div>
          <PitchGraph localSamples={localSamples} referenceFrames={[]} referenceSource="" />
          <label className="consent">
            <input type="checkbox" checked={sharePitch} onChange={(event) => setSharePitch(event.target.checked)} disabled={capturing} />
            <span><strong>结束时写入跟唱回执</strong><small>明确同意后，才将稀疏 F0 点短暂发给服务器；不会上传音频或转写。</small></span>
          </label>
          <div className="capture-actions">
            {capturing ? <button type="button" className="danger" onClick={() => void stopPitchCapture()}>停止检测</button> : <button type="button" onClick={() => void startPitchCapture()} disabled={busy}>开始本地音高检测</button>}
            <span>{singing?.sample_count ? `已共享 ${singing.sample_count} 个音高点` : "默认只在本地显示"}</span>
          </div>
          <p className="privacy-line">麦克风仅由浏览器读取。未勾选时，音高点也不会离开浏览器。</p>
        </section>

        <ReferencePitchView frames={referenceFrames} source={referenceSource} durationMs={song?.duration_ms || 42000} getPosition={getPosition} />
        <SongInsightPanel profile={profile} referenceSource={referenceSource} />
        <section className="card"><h2>听歌印象</h2>
          <p className="impression-text">{understanding?.impression || '尚未生成。没有模型时不伪造听后感；完整安装可显式听音并生成印象。'}</p>
          <details><summary>歌曲理解与听觉观察（派生证据）</summary><pre>{JSON.stringify(understanding?.evidence || {}, null, 2)}</pre></details>
        </section>

        <section className="card chat-card" aria-labelledby="chat-title">
          <div className="section-heading"><div><p className="eyebrow">接入你自己的对话系统</p><h2 id="chat-title">歌曲评价与跟唱反馈接入</h2><p>默认是固定示例回复，不代表模型听过音频；启用模型会发送本轮文字与歌曲上下文。</p></div></div>
          <MessageList messages={messages} />
          <form className="chat-form" onSubmit={sendMessage}>
            <input value={text} onChange={(event) => setText(event.target.value)} maxLength="4000" placeholder="例如：现在唱到哪一句？" aria-label="聊天消息" />
            <button type="submit" disabled={busy || !text.trim()}>发送</button>
          </form>
        </section>
      </div>
      <p className={`notice ${notice ? "visible" : ""}`} role="status">{notice}</p>
    </main>
  );
}
