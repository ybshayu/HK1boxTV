import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hk1boxtv.app',
  appName: 'HK1 Box TV',
  // 网页构建产物目录（npm run build 的输出）
  webDir: 'dist',
  // Android WebView 使用 https scheme，兼容 HLS/存储等能力
  server: {
    androidScheme: 'https',
  },
  // 安卓特定配置
  android: {
    // 允许 WebView  Mixed Content（部分直播源为 http）
    allowMixedContent: true,
  },
};

export default config;
