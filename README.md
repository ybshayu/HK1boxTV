<div align="center">

# 📺 HK1 Box TV 桌面

**专为 HK1 Box 等 Android 电视盒子打造的轻量级极简 TVOS 桌面与影视中心**

支持遥控器 D-pad 导航 · Infuse 美学海报墙 · 自定义视频源（IPTV / 网盘）· 断点续播 · 存储管理

</div>

---

## 一、项目简介

`HK1 Box TV 桌面` 是一个基于 **React 19 + Vite + TypeScript + Tailwind CSS** 的电视大屏 Web 应用，
目标是把 HK1 Box、外贸盒子等 Android TV 设备，变成一个像 Apple TV / Infuse 一样好看、好用的影视桌面。

> ⚠️ **重要说明（请先读）**
> 当前仓库是一个**纯前端演示工程**：影视数据（`mockMedia` / `mockApps` / `mockSources`）是内置的示例数据，
> 播放进度、收藏、存储等信息保存在浏览器 `localStorage` 中。
> 它**不是**一个能直接播放真实片源的成品，而是一个完整可运行、可二次开发的 UI 框架。
> 若要接入真实片源（豆瓣元数据、TVBox 多仓、运营商直播、WebDAV 网盘），需自行对接后端 / 接口。

---

## 二、功能特性

| 模块 | 说明 |
| --- | --- |
| 🏠 精选推荐首页 | 沉浸式动态模糊背景（Apple TV / Infuse 风格），多 shelf 横滑货架 |
| 📡 电视直播 | 央视与各省卫视超高清直播（示例为运营商 IPv6 源），点击即播 |
| 🎬 电影 / 📺 剧集 | 海报网格浏览，4K HDR / 杜比视界 / 杜比全景声标签展示 |
| 🔧 自定义源 | 支持 **M3U / M3U8 直播源、CatVod VOD 接口、WebDAV 媒体库**（如阿里云盘 / 夸克 / 115） |
| 📦 应用库 | 应用抽屉 + HK1 存储管理（安装 / 卸载应用、一键清理缓存） |
| ⭐ 我的收藏 | 星标电影、剧集、直播频道随时回看 |
| 🔍 全局搜索 | 带搜索历史记录 |
| ▶️ 断点续播 | 自动记录播放进度，下次跳转至上次位置 |
| 🎛️ 系统设置 | 多语言（简/繁/英/日）、三套主题、性能模式（硬解加速）、频道排序 |
| 🎮 遥控器导航 | 完整 D-pad 焦点系统，适配实体遥控器与 PC 键盘 |

---

## 三、技术栈

- **框架**：React 19 + TypeScript
- **构建**：Vite 8
- **样式**：Tailwind CSS v4（`@tailwindcss/vite`）
- **视频**：`hls.js`（HLS / M3U8 直播与点播）、原生 `<video>`
- **图标**：`lucide-react`
- **动效**：`motion`
- **AI（可选）**：`@google/genai`（Gemini，需自备 `GEMINI_API_KEY`，当前 UI 未默认启用）

---

## 四、环境要求

| 工具 | 版本要求 |
| --- | --- |
| Node.js | **20.x 或更高**（Vite 8 需要新版 Node） |
| 包管理器 | `bun`（推荐，仓库含 `bun.lock`）或 `npm` |
| 操作系统 | Windows / macOS / Linux 均可 |

---

## 五、本地运行

```bash
# 1. 进入项目目录
cd HK1boxTV

# 2. 安装依赖（二选一）
bun install        # 推荐：与 bun.lock 完全匹配
# 或（npm 请注意：vite@8 与 esbuild 存在 peer 冲突，需加 --legacy-peer-deps）
npm install --legacy-peer-deps

# 3. 启动开发服务器（默认端口 3000，已开启局域网访问）
npm run dev
# 打开浏览器访问 http://localhost:3000
# 盒子/手机同局域网可用 http://<你的电脑IP>:3000 访问
```

### 可用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器（端口 3000，`--host` 可局域网访问） |
| `npm run build` | 构建生产版本，产物输出到 `dist/` 目录 |
| `npm run preview` | 本地预览已构建的 `dist/` |
| `npm run lint` | TypeScript 类型检查（`tsc --noEmit`） |
| `npm run clean` | 清理 `dist/` 与临时文件 |

---

## 六、构建与部署（网页版）

```bash
npm run build      # 生成 dist/ 静态网站
```

`dist/` 是纯静态文件，可部署到任意静态托管（GitHub Pages、Vercel、Nginx、盒子本地 Web 服务等）。

**一键部署到 GitHub Pages**（可选）：在仓库 `Settings → Pages` 选择 `GitHub Actions` 来源，
或将 `dist/` 推到 `gh-pages` 分支即可。

---

## 七、遥控器 / 键盘操作

| 按键 | 功能 |
| --- | --- |
| 方向键 ↑ ↓ ← → | 焦点移动（D-pad 导航） |
| OK / Enter | 确认 / 播放 / 打开详情 |
| 返回 / Esc / Backspace | 返回上一级 |
| 菜单键 / `M` | 收藏当前影片 / 打开频道排序 |
| 数字键 / 字母 | 搜索页输入 |

---

## 八、环境变量（可选）

复制 `.env.example` 为 `.env.local` 并按需填写：

```bash
GEMINI_API_KEY="你的 Gemini API Key"   # 启用 Gemini AI 能力时使用
APP_URL="https://你的部署地址"         # 自引用链接 / 回调地址
```

> 当前演示版不依赖这些变量也能完整运行，AI 功能为可选扩展。

---

## 九、打包成 Android APK（电视盒子）⚠️ 必读

### 9.1 先说清楚一个关键点

本项目是 **Web 前端**，`npm run build` 产出的是**网站**（`dist/`），**不是 APK**。
Android 系统不能直接安装网页，必须把它"包"进一个安卓壳子里。常见三种方案：

| 方案 | 适合场景 | 难度 | 是否真 APK |
| --- | --- | --- | --- |
| **A. PWA 添加到主屏幕** | 临时用、不想打包 | ⭐ 最简单 | ❌（是网页书签） |
| **B. Capacitor 封装** ✅推荐 | 想装成真 App、稳定可用 | ⭐⭐⭐ | ✅ 真 APK |
| **C. TWA / Bubblewrap** | 想上架 Play 商店 | ⭐⭐⭐⭐ | ✅ 真 APK |

### 9.2 方案 A：PWA 添加到主屏幕（免打包）

1. 先把项目部署成可访问的 HTTPS 网址（见第六节）。
2. 在盒子的浏览器中打开该网址 → 菜单 → **"添加到主屏幕"**。
3. 桌面会出现一个图标，点开即是全屏网页。

> 优点：零成本。缺点：本质还是网页，重启/断网可能丢失入口，体验不如真 App。

### 9.3 方案 B：Capacitor 封装为 APK（推荐，本仓库已配置 ✅）

本仓库**已经是一个配好 Capacitor 的工程**：`capacitor.config.ts` + 已提交的 `android/` 原生工程 + 签名配置一应俱全。
Capacitor 会把 `dist/` 网页塞进 Android 的 WebView，生成一个可安装的 APK。

```bash
# 1. 先构建网页
npm run build

# 2. 同步网页资源到安卓工程（每次改了前端都要跑）
npm run cap:sync

# 3. 本地打包（需先装好 Android SDK + JDK 17）
cd android
./gradlew assembleDebug        # 测试版（免签名，可直接 adb install）
./gradlew assembleRelease      # 正式版（有签名密钥时自动签名）
```

产物位置：
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`

装到盒子：`adb connect <盒子IP>:5555 && adb install android/app/build/outputs/apk/debug/app-debug.apk`

> 📺 已针对 Android TV 优化：`AndroidManifest.xml` 加了 `LEANBACK_LAUNCHER`（出现在电视主页）、
> TV banner 横幅图标、`NoTitleBar` 全屏主题，遥控器 D-pad 事件由 WebView 自动转成键盘事件，与网页版操作一致。

#### 关于"和线上版 hk1-box-tv.ai.studio 保持一致"
本仓库就是该线上站点的同源前端代码，且**没有任何构建期注入的密钥会改变界面**
（`GEMINI_API_KEY` / `APP_URL` 在代码里未被消费，AI 功能当前 UI 未默认启用）。
因此用同一份源码构建出的 APK，界面与功能与线上版完全一致。

### 9.4 方案 C：TWA / Bubblewrap（官方可信 Web 活动）

适合上架 Google Play。前提：项目必须是**合规 PWA**（需 `manifest.json` + Service Worker + HTTPS）。
当前仓库**没有** PWA 清单，需先补齐，再用官方工具打包：

```bash
# 需先安装 Java 17 与 Android SDK，并安装 Bubblewrap CLI
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://你的网址/manifest.json
bubblewrap build
```

> 一般用户走方案 B（Capacitor）即可，无需 PWA。

---

## 十、在 GitHub 上自动构建并发布 APK（已配置 ✅）

本仓库已包含完整的自动化构建流程：`.github/workflows/build-apk.yml`。
它通过 **GitHub Actions 云端**构建，**不需要你本地装 Android SDK**。

### 10.1 你会拿到什么
- **debug 版 APK**：始终生成，免签名、可直接 `adb install` 到盒子测试。
- **release 签名版 APK**：当你在仓库配置了签名密钥 Secrets 后自动生成（见 10.3）。

### 10.2 怎么触发构建
两种办法：

**方法一：打 tag（推荐，会自动发 Release）**
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub 会自动构建，并在仓库 `Releases` 页面生成带 APK 的发布。

**方法二：手动触发**
仓库 `Actions → Build Android APK → Run workflow`，可选 `debug` 或 `release`，
构建完成后在 `Actions` 页面的 `Artifacts` 里下载 APK。

### 10.3 配置 release 签名（一次性，强烈建议）
要让线上发布的是**你自己签名的正式版**，需准备一把密钥并存入仓库 Secrets：

1. **生成密钥库**（在你的电脑上，任意目录）：
   ```bash
   keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias hk1boxtv
   ```
   牢记设置的**密钥库密码**与**别名(hk1boxtv)密码**。

2. **把密钥库转成 base64 字符串**：
   - macOS/Linux：`base64 -i release-key.jks -o keystore.b64 && cat keystore.b64`
   - Windows PowerShell：`[Convert]::ToBase64String([IO.File]::ReadAllBytes("release-key.jks"))`

3. **在 GitHub 仓库添加 4 个 Secrets**（`Settings → Secrets and variables → Actions → New repository secret`）：
   | Secret 名称 | 值 |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | 上面的 base64 整串 |
   | `ANDROID_KEYSTORE_PASSWORD` | 密钥库密码 |
   | `ANDROID_KEY_ALIAS` | `hk1boxtv` |
   | `ANDROID_KEY_PASSWORD` | 别名密码（通常与密钥库密码相同） |

4. 之后打 tag 触发构建，`app-release.apk` 即为你自己签名的正式版。
   > 若未配置 Secrets，release 构建会**自动回退使用 debug 签名**（仍可安装），不会失败。

> 🔒 密钥库文件（`*.jks`）**绝不入库**（已在 `.gitignore` 忽略）。一旦泄露，去仓库 Secrets 删掉重生成即可。

---

## 十一、目录结构

```
HK1boxTV/
├── index.html              # 入口 HTML
├── package.json            # 依赖与脚本（含 cap:sync 等）
├── capacitor.config.ts     # Capacitor 配置（包名 / 资源目录）✅新增
├── vite.config.ts          # Vite 配置（含 Tailwind 插件）
├── tsconfig.json           # TypeScript 配置
├── .env.example            # 环境变量示例
├── metadata.json           # AI Studio 应用元信息
├── bun.lock                # bun 锁文件
├── .github/
│   └── workflows/
│       └── build-apk.yml   # GitHub Actions 自动构建 APK ✅新增
├── android/                # Capacitor 安卓原生工程（由 CI 或本地 `npx cap add android` 生成，未入库以减小体积）
│   ├── app/
│   │   └── build.gradle    # 构建时由 scripts/patch-android-signing.py 注入 release 签名配置
│   └── gradlew
├── scripts/
│   └── patch-android-signing.py  # CI 中为 build.gradle 注入签名配置
└── src/
    ├── main.tsx            # React 入口
    ├── App.tsx             # 主应用（导航 / 状态 / 遥控器逻辑）
    ├── types.ts            # 类型定义
    ├── index.css           # 全局样式
    ├── i18n/               # 多语言翻译
    ├── hooks/              # 电视导航 Hook
    ├── data/               # 示例数据（mockMedia / mockApps / mockSources）
    └── components/         # 各界面组件
        ├── NavigationHeader.tsx
        ├── HomeShelvesView.tsx
        ├── MediaGridView.tsx
        ├── CustomSourcesManager.tsx
        ├── AppsLauncher.tsx
        ├── SearchPage.tsx
        ├── SettingsPage.tsx
        ├── MediaDetailModal.tsx
        ├── VideoPlayer.tsx
        ├── ChannelReorderModal.tsx
        └── UpdatePromptModal.tsx
```

---

## 十二、二次开发建议

- **接入真实片源**：替换 `src/data/mockMedia.ts` 与 `mockSources.ts`，改为从你的 API / TVBox 接口拉取。
- **真实播放**：`VideoPlayer.tsx` 已集成 `hls.js`，只要把 `streamUrl` 换成真实 M3U8 / MP4 地址即可播放。
- **持久化**：当前用 `localStorage`，多设备同步建议改为后端数据库。
- **上架适配**：电视端建议补充 Leanback  launcher 图标、横版布局与焦点高亮（已内置 `tv-focusable` 类）。

---

## 许可证

本项目为演示 / 学习用途，具体授权请参考仓库许可证文件（如有）。
第三方影视数据、直播源、网盘接口请遵守相关服务条款与当地法律法规。
