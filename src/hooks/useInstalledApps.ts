import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import type { StorageInfo, TVApp } from '../types';
import {
  fetchAppIcon,
  fetchInstalledApps,
  fetchStorage,
  isAppManagerAvailable,
  sortApps,
  startAppsWatch,
  toTVApp,
  type RealStorage,
} from '../services/appManager';

/** 图标并发上限，避免老设备一次性打太多 PackageManager 查询 */
const ICON_CONCURRENCY = 4;

/** 系统一次安装/卸载可能连发多个广播，做个防抖再刷新 */
const REFRESH_DEBOUNCE_MS = 1200;

const MB = 1048576;

interface IconLoader {
  request: (packageName: string) => void;
}

export interface UseInstalledAppsResult {
  apps: TVApp[];
  icons: Record<string, string>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  /** 是否具备原生能力（浏览器预览时为 false） */
  supported: boolean;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  requestIcon: (packageName: string) => void;
  /** 由真实数据换算出来的存储信息 */
  storageInfo: StorageInfo | null;
}

/**
 * 读取设备真实已安装应用，并在系统安装 / 卸载 / 更新后自动刷新。
 *
 * 刷新触发点：
 *  1. 首次挂载
 *  2. 每次进入应用页（enabled 变化）
 *  3. 系统安装/卸载/更新广播（原生日志 → appsChanged 事件，带防抖）
 *  4. 应用从后台回到前台
 *  5. 上层主动调用 refresh（下拉或点刷新按钮）
 */
export function useInstalledApps(enabled: boolean): UseInstalledAppsResult {
  const [apps, setApps] = useState<TVApp[]>([]);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [realStorage, setRealStorage] = useState<RealStorage | null>(null);
  const [supported] = useState(() => isAppManagerAvailable());

  const inFlightRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 图标加载器：带缓存 + 并发上限 + 失败静默（某张图标取不到不影响整体）
  const loaderRef = useRef<IconLoader | null>(null);
  if (!loaderRef.current) {
    const cache: Record<string, string> = {};
    const queue: string[] = [];
    const queued = new Set<string>();
    let active = 0;

    const pump = () => {
      while (active < ICON_CONCURRENCY && queue.length > 0) {
        const pkg = queue.shift() as string;
        active += 1;
        fetchAppIcon(pkg, 96)
          .then((url) => {
            if (!url) return;
            cache[pkg] = url;
            setIcons((prev) => (prev[pkg] ? prev : { ...prev, [pkg]: url }));
          })
          .catch(() => {
            /* 单个图标失败无所谓 */
          })
          .finally(() => {
            active -= 1;
            queued.delete(pkg);
            pump();
          });
      }
    };

    loaderRef.current = {
      request(packageName: string) {
        if (!packageName) return;
        if (cache[packageName] || queued.has(packageName)) return;
        queued.add(packageName);
        queue.push(packageName);
        pump();
      },
    };
  }

  const requestIcon = useCallback((packageName: string) => {
    loaderRef.current?.request(packageName);
  }, []);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!supported) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (!opts?.silent) setLoading(true);
      setError(null);

      try {
        const raw = await fetchInstalledApps();
        const list = sortApps(raw.map(toTVApp));
        setApps(list);
        setLastUpdated(Date.now());
        // 只请求当前列表里还没有图标的（loader 内部还有缓存，重复调用无成本）
        for (const app of list) loaderRef.current?.request(app.packageName);

        const st = await fetchStorage();
        if (st) setRealStorage(st);
      } catch (e) {
        setError(e instanceof Error ? e.message : '读取应用列表失败');
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [supported]
  );

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refresh({ silent: true });
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  // 进入应用页时加载一次
  useEffect(() => {
    if (!supported || !enabled) return;
    void refresh();
  }, [supported, enabled, refresh]);

  // 监听系统安装 / 卸载 / 更新广播
  useEffect(() => {
    if (!supported) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;

    startAppsWatch(() => scheduleRefresh()).then((fn) => {
      if (cancelled) fn();
      else dispose = fn;
    });

    return () => {
      cancelled = true;
      if (dispose) dispose();
    };
  }, [supported, scheduleRefresh]);

  // 应用回到前台时补一次刷新（覆盖从系统卸载界面返回的场景）
  useEffect(() => {
    if (!supported) return;
    let handle: PluginListenerHandle | null = null;
    let cancelled = false;

    CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) scheduleRefresh();
    })
      .then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [supported, scheduleRefresh]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 真实存储 → 界面用的 StorageInfo
  const storageInfo: StorageInfo | null = realStorage
    ? (() => {
        const totalMB = realStorage.totalBytes / MB;
        const freeMB = realStorage.freeBytes / MB;
        const appsMB = apps.reduce((sum, a) => sum + (a.sizeMB || 0), 0);
        const cacheMB = realStorage.appCacheBytes / MB;
        const usedMB = totalMB - freeMB;
        // 系统与其他 = 已用 - 已装应用 - 本应用缓存（推导值，负值归零）
        const systemMB = Math.max(0, usedMB - appsMB - cacheMB);
        return { totalMB, systemMB, appsMB, cacheMB, freeMB };
      })()
    : null;

  return {
    apps,
    icons,
    loading,
    error,
    lastUpdated,
    supported,
    refresh,
    requestIcon,
    storageInfo,
  };
}
