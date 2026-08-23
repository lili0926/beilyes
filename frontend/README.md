# 前端拆分说明

`dist/index.html` 仍是 App 唯一入口（Capacitor 加载它）。

源码按功能拆在 `frontend/parts/`，修改后执行：

```bash
python3 frontend/build.py
```

会重新组装 `dist/index.html`。

## 零件

| 文件 | 内容 |
|------|------|
| `00_prefix.html` | HTML 头、样式、外链 script |
| `10_core_boot.js` | 开屏登录、state 前半 |
| `20_feature_pr.js` | PR 世界书预设 + pr* API |
| `30_core_mid.js` | 中间核心 |
| `40_feature_mc_ui.js` | 机日记/纸条详情 UI（mcFindDetail 等） |
| `50_core_mid2.js` | 中间核心 2 |
| `60_feature_pocket_mc.js` | 小浏览器 + 日记/信 marker |
| `70_core_rest.js` | 其余（含 mcFetch 等） |
| `99_suffix.html` | `</script>` 与结尾 |

后续可把 `70` 里的 mc 网络层再挪到 `40` 旁独立文件。
