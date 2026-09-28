# 完整安装：只启用你需要的能力

先完成 README 基础安装。所有命令在仓库根目录运行，仅绑定本机。当前公开版采用**单任务本地 CLI + 派生结果 API**，不是线上宿主的后台队列系统。

## 依赖按能力区分

| 能力 | 附加依赖 | Key／登录 | 本机负担 |
|---|---|---|---|
| 预览／本地拾音 | 浏览器麦克风权限 | 无 | 不跑分离模型 |
| 基础混音 | FFmpeg | 无 | 解码与简单分析 |
| 完整声学证据 | librosa、NumPy、SciPy、SoundFile | 无 | 全曲科学计算 |
| 分离人声 F0 | 独立 Demucs／PyTorch、htdemucs 权重 | 无曲源登录；首次可能下载权重 | 最重的本地阶段 |
| 短窗听音 | 支持音频输入与流式输出的模型端点 | HEARING 配置 | 本地切片，远端推理 |
| 印象／文字反馈 | 支持流式 chat-completions 的端点 | WRITER 配置 | 远端推理，本地不跑语言模型 |

**公共组合尚未测得最低 RAM／显存与单曲耗时，不承诺某配置一定够。**先试短授权片段，再处理整曲；不要因为演示就先购买机器。CUDA 仅在已有兼容驱动与 PyTorch 时使用，否则选择 CPU。不要并行启动多个分离任务。

粗略预算：轻量体验 4–8 GB、无分离声学分析 8–16 GB、包含分离 16–32 GB 总内存；低值是尝试预算，高值是保守留余量，均非实测最低要求。完整声明和功能解说见 [使用前须知](BEFORE_USE.md)。

Node 22.12+ 是当前前端工具链要求。Python 使用 3.11+ 异步超时，基础测试用 3.12。建议分离环境独立，避免 PyTorch 与 API 依赖互相影响。

## 1. 完整声学证据

```bash
.venv/bin/pip install -r services/audio-analysis/requirements.txt
.venv/bin/python scripts/analyze_track.py \
  --input /path/to/authorized-song.mp3 --song-id my-song \
  --output data/reference-contours/my-song.json
```

不加 `--basic` 且依赖齐全时，启用完整分析。缺少依赖时 WAV 会降级，并在证据中标注；降级不是完整成功。

## 2. 分离人声

```bash
python3 -m venv .demucs-venv
.demucs-venv/bin/pip install demucs
.venv/bin/python scripts/analyze_track.py \
  --input /path/to/authorized-song.mp3 --song-id my-song \
  --output data/reference-contours/my-song.json \
  --separate-vocals --demucs-python .demucs-venv/bin/python --device cpu
```

Demucs 会引入 PyTorch 等较重依赖，首次运行可能下载 htdemucs 权重，仓库不分发权重。完整独立安装组合尚待真实片段验收，不能把宿主已经运行过当成本组合已验证。

临时解码音频与 stems 由任务临时目录管理，正常完成、异常或 Ctrl+C 退出会清理；强制杀进程／掉电可能留下临时目录，需检查系统临时目录。原始本地文件不会被删除。

## 3. 模型听音与印象

复制 `.env.example` 为本机 `.env`，填写自己的完整端点 URL、Key、模型名：

- `HEARING_URL / HEARING_KEY / HEARING_MODEL`：需支持 MP3 `input_audio` 与流式文本输出；
- `WRITER_URL / WRITER_KEY / WRITER_MODEL`：需支持文本流式输出。

没有默认供应商，不自动读取其他项目 Key，也不保证所有“兼容”端点支持音频字段。本轮只验证模拟传输，未消费真实 Key。

```bash
.venv/bin/python scripts/analyze_track.py \
  --input /path/to/authorized-song.mp3 --song-id my-song \
  --output data/reference-contours/my-song.json \
  --env-file .env --hear --windows 15,65,120 --write-impression
```

`--hear` 明确发送最多三个原混音短窗，每窗最多 20 秒。`--windows` 是起点秒数，必须落在歌曲内；省略时按均匀位置取窗，不保证自动选到最佳段落。没有真实短窗观察，writer 拒绝凭声学数字冒充听过。

可组合 `--separate-vocals`，但当前公共 CLI **不会额外上传分离 stems**：分离部分仅给本地测量，远端听音仍是原混音。线上自主选窗、额外分离人声见证和多轮融合编排没有原封不动移入。

可选 `--lyrics-json` 接收已授权的 `[{"at_ms":1000,"text":"...","translation":"..."}]`。可选 `--context-json` 接收人格、有限引用候选、历史表达和明确授权的语境，格式见 `prompts/examples/fictional-input.json`。这部分会发给 WRITER，真实文件不要提交到 Git。

已有输出默认不覆盖；显式加 `--replace` 才替换。全部成功后原子写入，失败保留旧结果。单次处理最多 12 分钟音频，超出部分不分析，结果记录 `input_limit_seconds`。各阶段有超时，模型失败不自动重复付费请求。

## 4. 对话接入

工作台默认固定演示回复。若授权本轮文字与歌曲上下文发送给 WRITER，在 `.env` 设置 `ENABLE_MODEL_CHAT=1`，然后：

```bash
.venv/bin/uvicorn app.main:app --app-dir services/api \
  --env-file .env --host 127.0.0.1 --port 8000
```

已有对话系统可实现 `ConversationGateway.reply(user_text, context, kind=...)`。本仓库不接管其人格、历史、数据库或一起听功能。

## 故障自查

- Node 太旧：换符合版本的解释器，不必修改生产机器的全局 Node。
- 缺可选平台绑定：用符合版本的 Node 重新 `npm ci`，检查网络与可选依赖；不要盲删锁文件。
- FFmpeg 失败：确认终端可执行，输入是本地授权音频而非 URL。
- 分离失败：检查解释器、权重和资源，先用短片段，不要并行重试。
- 模型失败：检查字段支持与配置；日志故意不打印供应商正文、URL 和 Key。
- 空 F0：可能是可信留白，不一定是程序崩溃，不能为有线而放开所有门槛。
