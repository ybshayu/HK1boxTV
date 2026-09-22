import { Capacitor, registerPlugin } from '@capacitor/core';
import type { TVApp } from '../types';

/**
 * 应用管理器（原生插件封装）
 *
 * 背景：网页跑在 WebView 里，没有任何能力枚举设备已安装的应用、读应用图标、
 * 或发起卸载 —— 这些必须由原生 PackageManager 完成。
 * 原生侧实现见 native/android/AppManagerPlugin.java，
 * 由 scripts/patch-android-apps.py 在 CI 构建时注入到安卓工程。
 *
 * 在浏览器里跑（npm run dev）时这些能力不可用，本模块会给出 supported=false，
 * 上层据此展示「网页预览模式」提示，而不是假装有数据。
 */

export interface InstalledApp {
  packageName: string;
  name: string;
  versionName: string;
  versionCode: number;
  isSystem: boolean;
  isSelf: boolean;
  launchable: boolean;
  isTv: boolean;
  category: 'media' | 'tools' | 'games' | 'system';
  sizeBytes: number;
}

export interface AppsChangedEvent {
  action: string;
  packageName: string;
}

export interface RealStorage {
  totalBytes: number;
  freeBytes: number;
  appCacheBytes: number;
  appFilesBytes: number;
}

interface AppManagerNative {
  listApps(): Promise<{ apps: InstalledApp[]; count: number }>;
  getIcon(options: { packageName: string; size?: number }): Promise<{ packageName: string; dataUrl: string }>;
  launchApp(options: { packageName: string }): Promise<void>;
  uninstallApp(options: {
    packageName: string;
    allowRoot?: boolean;
  }): Promise<{ mode: 'silent' | 'system'; success: boolean }>;
  getStorage(): Promise<RealStorage>;
  startWatching(): Promise<void>;
  stopWatching(): Promise<void>;
  addListener(
    eventName: 'appsChanged',
    listener: (event: AppsChangedEvent) => void
  ): Promise<{ remove: () => void }>;
}

const Native = registerPlugin<AppManagerNative>('AppManager');

/** 只有装到真机上才具备这些能力 */
export function isAppManagerAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/** 读取设备真实已安装应用 */
export async function fetchInstalledApps(): Promise<InstalledApp[]> {
  if (!isAppManagerAvailable()) return [];
  const res = await Native.listApps();
  return res?.apps ?? [];
}

/** 按需取某个应用的真实图标（base64 PNG） */
export async function fetchAppIcon(packageName: string, size = 96): Promise<string> {
  if (!isAppManagerAvailable()) return '';
  const res = await Native.getIcon({ packageName, size });
  return res?.dataUrl ?? '';
}

/** 启动应用 */
export async function launchInstalledApp(packageName: string): Promise<void> {
  if (!isAppManagerAvailable()) {
    throw new Error('网页预览模式无法启动设备应用，请安装 APK 后使用');
  }
  await Native.launchApp({ packageName });
}

/**
 * 卸载应用。
 * 原生会优先尝试 root 静默卸载（装了 Magisk 的设备），
 * 不可用时自动回退到系统卸载确认界面。
 */
export async function uninstallInstalledApp(
  packageName: string,
  allowRoot = true
): Promise<{ mode: 'silent' | 'system'; success: boolean }> {
  if (!isAppManagerAvailable()) {
    throw new Error('网页预览模式无法卸载设备应用，请安装 APK 后使用');
  }
  return Native.uninstallApp({ packageName, allowRoot });
}

/** 设备真实存储信息 */
export async function fetchStorage(): Promise<RealStorage | null> {
  if (!isAppManagerAvailable()) return null;
  try {
    return await Native.getStorage();
  } catch {
    return null;
  }
}

/** 开始监听系统安装 / 卸载 / 更新广播 */
export async function startAppsWatch(
  onChange: (event: AppsChangedEvent) => void
): Promise<() => void> {
  if (!isAppManagerAvailable()) return () => {};
  try {
    await Native.startWatching();
    const handle = await Native.addListener('appsChanged', onChange);
    return () => {
      handle?.remove?.();
      Native.stopWatching().catch(() => {});
    };
  } catch {
    return () => {};
  }
}

/** 系统广播 action → 人话 */
export function describeAction(action: string): string {
  if (action.endsWith('PACKAGE_ADDED')) return '已安装';
  if (action.endsWith('PACKAGE_REMOVED')) return '已卸载';
  if (action.endsWith('PACKAGE_REPLACED')) return '已更新';
  if (action.endsWith('PACKAGE_CHANGED')) return '状态变化';
  return '有变化';
}

/** 原生数据类型 → 界面用的 TVApp */
export function toTVApp(raw: InstalledApp): TVApp {
  return {
    id: raw.packageName,
    name: raw.name,
    packageName: raw.packageName,
    icon: raw.isSystem ? 'settings' : raw.category === 'games' ? 'gamepad-2' : 'folder',
    sizeMB: Math.round((raw.sizeBytes / 1048576) * 10) / 10,
    version: raw.versionName ? `v${raw.versionName}` : '',
    category: raw.category,
    isSystem: raw.isSystem,
    launchable: raw.launchable,
    isSelf: raw.isSelf,
  };
}

/** 按「用户应用在前、系统应用在后」排序，组内按名称排 */
export function sortApps(list: TVApp[]): TVApp[] {
  return [...list].sort((a, b) => {
    if (!!a.isSystem !== !!b.isSystem) return a.isSystem ? 1 : -1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}
