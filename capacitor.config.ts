import type { CapacitorConfig } from '@capacitor/cli';

/**
 * 本地打包（无域名）：页面在 dist/ 内，不写 server.url。
 * 以后有 HTTPS 域名想热更新时，取消注释 server 段，并改 url。
 */
const config: CapacitorConfig = {
  appId: 'com.personal.memorypalace',
  appName: 'Memory Palace',
  webDir: 'dist',
  // server: {
  //   url: 'https://your-domain.com/',
  //   cleartext: false,
  //   errorPath: 'offline.html',
  // },
  android: {
    allowMixedContent: true, // 调试期允许 http 后端；上线建议全程 https 后改为 false
  },
  plugins: {
    BackgroundRunner: {
      label: "mp.bgchat",
      src: "runner.js",
      event: "bgchat",
      repeat: true,
      interval: 15,
      autoStart: true,
    },
  },
};

export default config;
