# 前端拆分说明

**重要：** APK 构建会执行 `python3 frontend/build.py`，用 `frontend/parts/` 生成 `dist/index.html`。

因此 **parts 必须与可用的 dist 同步**，否则打出来的包会丢功能（例如 Aries 相机）。

## 当前布局（防丢失）

| 文件 | 说明 |
|------|------|
| `parts/00_prefix.html` | HTML/CSS/外链 |
| `parts/10_core_all.js` | 完整应用脚本（含相机/PR/日记等） |
| `parts/99_suffix.html` | `</script>` 结尾 |
| `build.py` | 组装 → `dist/index.html` |

若存在 `10_core_all.js`，优先用三文件组装；否则回退旧的多 part 顺序。

## 修改流程

1. 改 `parts/10_core_all.js`（或改完 dist 后再同步回 parts）
2. `python3 frontend/build.py`
3. 提交 `frontend/parts` + `dist/index.html`
