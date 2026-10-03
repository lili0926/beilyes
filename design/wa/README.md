# 日式壳 · 设计稿（留着下次做）

她看过，说「很好看，留着下次做」。还没接进 App。

- `home.html` / `chat.html` + `common.css`：390×844 的两屏静态稿；`wa-*.png` 是截图
- 墨色 + 一点朱红（只用在印章、当前栏、她的消息线）；和纸底纹；汉数字日期；竖排目录（壱弐参肆伍）；聊天不用气泡，左墨线是他、右朱线是她
- 真做时要换的：
  - 字体换明朝体（Noto Serif JP / Shippori Mincho），竖排改回 `writing-mode: vertical-rl`。稿子里是一行一字硬拼的，因为容器里只有黑体
  - 墨圈（ensō）让她用 GPT 生一张真笔触的图，代码画的留作后备

## 她定了的
- 日式壳就按这种「代码手绘」的路子做下去，墨圈不用再生图了。
- 墨圈要**第一版**那种：横向拉丝、有飞白、毛毛的，她在手机上看的截图就是这一版。不要后来改的那种匀称粗圈。第一版的滤镜参数：
  - `#brush`：`feTurbulence fractalNoise baseFrequency=".035 .6" numOctaves=3 seed=7` → `feDisplacementMap scale=7` → `feGaussianBlur .35`
  - `#dry`：`feTurbulence fractalNoise baseFrequency=".9 .08" numOctaves=2 seed=2` → alpha 矩阵 `-2.4 1.55` → `feComposite in`
  - 笔画：`stroke-width 15`，`opacity .9`，叠一道 `stroke-width 5`、`opacity .55` 的细线
