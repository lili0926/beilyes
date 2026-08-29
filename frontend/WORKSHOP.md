# 工作间协作约定（给 CC / 人类）

## ⚠️ 前端构建入口（最重要）

| 文件 | 是否进 dist | 说明 |
|------|:-----------:|------|
| `frontend/parts/10_core_all.js` | ✅ | **唯一构建入口**，`build.py` 只用它拼 `dist/index.html` |
| `10_core_boot.js` | ❌ | 死文件，改了 App 不会有任何变化 |
| `20_feature_pr.js` | ❌ | 同上 |
| `30_core_mid.js` | ❌ | 同上 |
| `50_core_mid2.js` | ❌ | 同上 |
| `60_feature_pocket_mc.js` | ❌ | 同上 |
| `70_core_rest.js` | ❌ | 同上 |

改前端功能 = 改 `10_core_all.js`。改错文件是最常见的事故，动手前先确认。

## 工作流

1. **工作间（Claude Code）** 直接在 `main` 分支改代码
2. `git add` → `git commit` → `git push origin main`
3. push 到 main 后 **GitHub Actions 自动重新构建 APK**
4. 回复中汇报：改了哪些文件、diff 摘要、push 是否成功

## 安全红线

- 只动 `frontend/` 下的文件
- 不碰 `data/`、`android/`、`.github/`、`dist/`、根目录配置
- 禁止 `git push --force`、`git reset --hard`、`git rebase`
