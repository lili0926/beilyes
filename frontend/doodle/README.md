# 星光涂鸦壳（doodle）

在「外观 → 界面壳 → 星光涂鸦」启用，随时可以切回其它壳。来源是首页原型，排版不同的部分拆开接到 App 原有页面上：

| 原型里的部分 | 接到哪里 |
|---|---|
| 首页：像素时钟、文案、在一起天数、周历 | `coupleInfo`（startDate / statusMsg / 头像），改动写回原数据 |
| 游戏 / 工具转盘 | `FEAT_GROUPS` 全部功能，打开走原 `data-sub` 路由；工具里额外有「动态」 |
| 音乐插件、播放页、歌单 | 原播放器 `ensureAudio` / `musicNow` / `musicQueue` / 歌词；另可导入本地音乐（IndexedDB `doodle-music`） |
| 一起听 | 边听边聊直接发进当前聊天，走原发送与回复 |
| 信箱 | 读 `mcLetters` 里已投递的信，未到时间的不显示 |
| 聊天（气泡 / 剧本） | 原聊天页，只换顶栏与样式 |
| 设置 | 原型的几张卡片 + 原设置页全部内容 |
| 底栏 | 首页 / 聊天 / 设置，走原 `data-tab` 切换 |

- `doodle.js`：逻辑；`doodle-shadow.css`：首页与全屏层（Shadow DOM 内，选择器与原型一致）；`doodle.css`：App 原页面的外观。
- 外观偏好存在 `state.doodlePrefs`（沿用原持久化）。
- 原型里的「清空聊天记录」没有接：会删真实聊天记录，App 里也没有对应功能。

验证：`node --test frontend/tests/*.test.cjs`，`python3 frontend/build.py`。
