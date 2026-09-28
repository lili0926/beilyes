# Lilt Echo

**必有回响。**

**歌曲音高、歌曲理解、听后印象与跟唱反馈——可接入你自己的播放器和对话系统。**

这里开放的是音乐能力，**不包含“一起听”房间、多人同步、邀请系统、完整聊天应用或私人关系设定**。需要一起听外壳时，请自行选择其他项目，通过本仓库的输入／输出契约接入。

> 当前公开版已完成基础链路与合成测试；完整分析仍属实验能力，真实歌曲、模型供应商和完整人声分离组合仍需验收。见 [验证与发布状态](docs/RELEASE_CHECKLIST.md)。

## 先选一条路线

| | 简单体验 | 完整安装（按需启用） |
|---|---|---|
| 目的 | 看界面、试本地拾音、理解接口 | 分析自己的授权音频并生成真实结果 |
| 默认输入 | 合成时间轴和参考线，不播放真实歌曲 | 本地授权音频；曲源由外部系统提供 |
| 模型 Key | 不需要 | 听觉观察／文字印象分别配置 |
| 音乐账号 | 不需要 | 本地文件仍不需要，外部曲源自行处理 |
| 音高 | 本地麦克风 F0；可选基础混音参考 | 可选 Demucs 分离人声 + pYIN |
| 印象／对话 | 明确标注未生成／固定示例回复 | 显式调用模型，或实现自己的适配器 |
| 环境 | Python 3.11–3.12、Node 22.12+ | 按功能再添加 FFmpeg、科学计算／分离环境 |

两条路线共用代码和结果格式，不是两套产品。

**安装前请读 [使用前须知与内存预算](docs/BEFORE_USE.md)**：轻量体验估计 4–8 GB，完整人声分离估计 16–32 GB；尚未测得最低配置，不是硬件保证。

## 路线 A：先体验，不配 Key

仓库根目录：

```bash
python3 -m venv .venv
.venv/bin/pip install -r services/api/requirements.txt
.venv/bin/uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000
```

另开终端：

```bash
cd apps/web
npm ci
npm run dev -- --host 127.0.0.1
```

打开终端显示的地址。Windows 请使用 `.venv\Scripts\python` 等对应路径；Windows/macOS 尚未实测。

可以查看合成音高的实线、虚线过渡和长空白，试用本地麦克风检测，以及查看声学概览。**单独勾选共享**后才会发送稀疏 F0 点并生成跟唱回执；不发送录音或转写。

没有音频模型时，不假装听过歌；没有 writer 时，不伪造听后印象。选择本地音频只用于浏览器对照播放，不会自动分析或上传。

### 想先试一首自己的歌？

安装 FFmpeg 后，无需账号或 Key：

```bash
.venv/bin/python scripts/analyze_track.py \
  --input /path/to/authorized-song.mp3 --song-id my-song \
  --title "本地歌曲" --output data/reference-contours/my-song.json --basic
```

重启本地 API，指定派生结果目录：

```bash
REFERENCE_CONTOUR_DIRECTORY=./data/reference-contours \
  .venv/bin/uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000
```

刷新页面选择结果，再选择**同一首**本地音频对照。基础分析只有粗粒度声学证据与混音估计，不是分离人声，也不会生成模型听感。

## 路线 B：完整安装，逐项开启

见 **[完整安装指南](docs/FULL_INSTALL.md)**，不必一次装齐：

1. 科学计算 worker：节拍、起音密度、色度、结构与声音运动；
2. Demucs + pYIN：分离人声音高，保留不确定与留白；
3. 听觉模型：显式授权后发送短音频窗，记录听觉观察；
4. 印象 writer：根据观察、歌词与可选语境写自然语言印象；
5. 对话适配器：把歌曲证据／印象／跟唱结果接入自己的聊天系统。

`--hear` 会发短音频，`--write-impression` 会发证据和可选文字语境。**浏览器共享跟唱 F0 不等于授权上传录音。**

## 听歌印象 prompt 参考

作者反复打磨的规则保存在 [prompts/](prompts/README.md)：保留歌曲主线、声音触发、复杂歌词理解、译文忠实性、文气和避免套话的要求；只替换私人称呼与身份入口，不改写成通用音乐分析清单。

包含系统规则、最终请求、首次深听与融合深听规则，以及完全虚构的输入示例。人格、关系语境和历史表达样本都是可选输入，不提供真实实例。

## 架构与接入

```text
授权音频 ── 本地声学分析 ── 可选分离人声与 pYIN
                  │                 │
                  └── 派生结果 JSON ┘
                            │
授权短窗 ── 听觉模型 ── 听觉观察 ── 可选印象 writer
                            │                  │
                            └── 工作台／外部对话适配器
麦克风 ── 浏览器本地 F0 ── 明确勾选才共享跟唱回执 ──┘
```

- [架构与数据契约](docs/ARCHITECTURE.md) · [使用说明](docs/USAGE.zh-CN.md)
- [隐私](docs/PRIVACY.md) · [安全部署](docs/SECURITY.md)
- [线上迁移清单](docs/MIGRATION.md) · [验证与发布状态](docs/RELEASE_CHECKLIST.md)

## 测试

```bash
.venv/bin/python -m pytest
node --test services/audio-analysis/test/*.test.mjs
.venv/bin/python -m unittest discover -s services/audio-analysis/python -p 'test_*.py'
cd apps/web
npm test
npm run build
```

从根目录运行 `bash scripts/public-audit.sh` 检查待发布文件。单测不代替真实歌曲与手机听感验收。

## 限制与许可

分离人声不等于主旋律真值。说唱、气声、合唱和重叠人声可能漏检或出现八度误判；虚线只是视觉过渡，跟唱对比不是评分器；声学数字不能直接推导“快乐／悲伤”。

不附带歌曲、歌词、录音、账号、Key、权重或私人数据。派生 JSON 也默认不公开。代码采用 [MIT](LICENSE)；外部依赖、模型及音频内容有各自许可，安装者需分别核对。
