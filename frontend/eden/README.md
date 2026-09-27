# 伊甸天使主题

在「外观 → 界面壳 → 伊甸天使」启用。原主题可以随时切回；新主题不是另一个账号或数据库。

- 首页读取 `state.coupleInfo`，今日心语仍使用原状态编辑与保存处理器。
- 花园从 `FEAT_GROUPS` 读取全部功能，并使用原 `data-sub` 路由；纸牌等特殊入口继续走原委托处理器。以后新增功能会出现在「新的相遇」。
- 私语进入当前 `chatTarget` 的原会话，继续使用原聊天渲染器、输入、发送、API、订阅、记忆与存储；没有新增聊天服务或数据副本。
- 回响、设置与功能子页复用原页面和事件，统一主题色、卡片与聊天样式。
- `uiShell` 沿用原持久化机制。新增 `edenMotionPaused` 只保存动态偏好；遵循系统减少动态，后台暂停装饰动画。
- 四张图集包含 54 个功能符号与 5 个导航符号。羽翼光环、白十字架蕾丝、白玫瑰藤蔓分组搭配，使用内置 imagegen 生成。完整提示词在 `image-prompts.txt`。
- `angel-icon-bounds.js` 记录按透明轮廓测量的裁切窗口；CSS 展示原图局部，原始 PNG 未经改写。用于避免生成留白造成的偏移。

## 构建与验证

```sh
node --test frontend/tests/eden.test.cjs
node --check frontend/eden/eden.js
node --check frontend/parts/10_core_all.js
python3 frontend/build.py
```

`build.py` 将本目录复制到 `dist/eden/`，由既有 Capacitor / GitHub Actions 流程打包进 APK，素材不依赖外部图片站。不会修改原 App ID、签名、数据库名、账号前缀或备份格式。安装同签名更新并切换主题即可沿用原有数据；独立网页无法直接读取手机 App 的本地数据库。

当前是独立首页、花园和导航布局，加上原功能页面的统一外观。原功能复杂子页的业务结构保持原样。测试不会向真实 AI / VPS 发送消息；这些连接的在线可用性由原配置决定。
