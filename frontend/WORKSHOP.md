# 工作间协作约定（给 CC / 人类）

## 源码真相
- **打包入口**：`frontend/parts/10_core_all.js`（`build.py` 优先用它）
- 仓库里还有 `10_core_boot.js` 等拆分文件，**当前不会进 dist**，不要只改 boot 却以为 App 会更新

## 推荐分工
1. **Claude Code（工作间）**：查 bug、读代码、写方案与补丁草稿（可以本地改着玩）
2. **Grok / 主开发**：审方案 → 改 `10_core_all.js`（或约定文件）→ commit / push `main` → 触发 APK

## 推送
若 CC 推 GitHub 失败：把 diff/方案贴给 Grok，由 Grok 落地，勿反复空耗额度。

## 安全
- 只动 `frontend/parts`
- 不碰 `data/`
- 禁止 force push
