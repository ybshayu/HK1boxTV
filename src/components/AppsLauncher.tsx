import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TVApp, StorageInfo, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import {
  fetchAppInfo,
  forceStopApp,
  launchInstalledApp,
  openAppSettings,
  uninstallInstalledApp,
  type AppInfo,
} from '../services/appManager';
import {
  AlertTriangle,
  AppWindow,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Film,
  Folder,
  Gamepad2,
  Grid,
  HardDrive,
  Info,
  Loader2,
  MoreVertical,
  Package,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Tv,
  Video,
  X,
} from 'lucide-react';

interface AppsLauncherProps {
  apps: TVApp[];
  /** 真实应用图标（base64 dataURL），key 为包名 */
  icons: Record<string, string>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  /** 是否具备原生能力（浏览器预览时为 false） */
  supported: boolean;
  onRefresh: () => void;
  onRequestIcon: (packageName: string) => void;
  storage: StorageInfo;
  onCleanCache: () => void;
  isCleaningCache: boolean;
  focusedId: string;
  language: SupportedLanguage;
  /** 常用应用（收藏）的包名列表，顺序即排序 */
  favorites: string[];
  /** 已隐藏应用的包名列表 */
  hiddenApps: string[];
  onToggleFavorite: (packageName: string, name: string) => void;
  onToggleHidden: (packageName: string, name: string) => void;
  /** 当前打开操作菜单的应用包名（由父组件统一管理，便于遥控器 MENU 键触发） */
  menuPackage: string | null;
  onAskMenu: (packageName: string) => void;
  onCloseMenu: () => void;
  /** 焦点变化回写父组件（原生 D-pad 移动后同步 focusedId） */
  onFocusItem: (id: string) => void;
  /** 原生 D-pad 方向键导航句柄：父组件把方向交给本组件计算下一焦点 */
  navRef?: React.MutableRefObject<((dir: 'up' | 'down' | 'left' | 'right') => void) | null>;
  /** v1.6.0：BACK 键先关本组件浮层（应用信息/卸载弹窗），返回 true 表示已消费 */
  backRef?: React.MutableRefObject<(() => boolean) | null>;
}

type CategoryKey = 'all' | 'fav' | 'user' | 'media' | 'games' | 'tools' | 'system';

const CATEGORY_LABELS: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'fav', label: '常用' },
  { key: 'user', label: '用户应用' },
  { key: 'media', label: '影音' },
  { key: 'games', label: '游戏' },
  { key: 'tools', label: '其它' },
  { key: 'system', label: '系统' },
];

function formatSize(mb: number): string {
  if (!mb || mb <= 0) return '—';
  if (mb < 1) return `${Math.max(1, Math.round(mb * 1024))} KB`;
  if (mb < 1024) return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatGB(mb: number): string {
  return (mb / 1024).toFixed(1);
}

function formatTime(ts: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatDate(ts: number | undefined | null): string {
  if (!ts) return '未知';
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 运行时读取 CSS grid 实际列数（响应式断点不同，列数会变） */
function gridColumnCount(el: HTMLElement | null): number {
  if (!el) return 1;
  const cols = getComputedStyle(el).gridTemplateColumns;
  if (cols && cols.trim() !== '') return cols.split(' ').filter(Boolean).length;
  return 1;
}

/** 单个应用卡片：负责按需拉取真实图标并做 content-visibility 屏外优化 */
const AppCard: React.FC<{
  app: TVApp;
  iconUrl?: string;
  isFocused: boolean;
  onRequestIcon: (pkg: string) => void;
  onLaunch: (app: TVApp) => void;
  /** 改为传包名：菜单状态由父组件统一管理，AppCard 只负责「请求打开某应用的菜单」 */
  onAskMenu: (packageName: string) => void;
}> = ({ app, iconUrl, isFocused, onRequestIcon, onLaunch, onAskMenu }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  // 长按（触屏）计时器；触发后标记 longPressed，避免松手时又触发一次点击启动
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef<boolean>(false);

  // 图标懒加载：只有接近视口的卡片才去原生取图标。
  useEffect(() => {
    if (iconUrl) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      onRequestIcon(app.packageName);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onRequestIcon(app.packageName);
          io.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [app.packageName, iconUrl, onRequestIcon]);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = () => {
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onAskMenu(app.packageName);
    }, 500);
  };

  const FallbackIcon = () => {
    switch (app.icon) {
      case 'film':
        return <Film className="w-7 h-7" />;
      case 'server':
        return <Server className="w-7 h-7" />;
      case 'play-circle':
        return <PlayCircle className="w-7 h-7" />;
      case 'video':
        return <Video className="w-7 h-7" />;
      case 'folder':
        return <Folder className="w-7 h-7" />;
      case 'gamepad-2':
        return <Gamepad2 className="w-7 h-7" />;
      case 'settings':
        return <Settings className="w-7 h-7" />;
      default:
        return <Tv className="w-7 h-7" />;
    }
  };

  const canUninstall = !app.isSystem && !app.isSelf;

  return (
    <div
      ref={ref}
      id={`app-card-${app.id}`}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onLaunch(app);
      }}
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '150px' }}
      className={`group relative p-3.5 rounded-3xl border transition-colors duration-200 cursor-pointer tv-focusable bg-neutral-900/90 text-left ${
        isFocused
          ? 'tv-focus-active border-white ring-2 ring-white/90 bg-neutral-800 z-20'
          : 'border-white/10 hover:border-white/25 hover:bg-neutral-800/80'
      }`}
    >
      <div className="w-14 h-14 p-1 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-2.5 mx-auto overflow-hidden">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={app.name}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <FallbackIcon />
        )}
      </div>

      <div className="text-center">
        <h4 className="text-xs font-bold text-white truncate" title={app.name}>
          {app.name}
        </h4>
        <div className="text-[10px] text-white/40 font-mono truncate mt-0.5" title={app.packageName}>
          {app.packageName}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/35 mt-1.5">
          {app.version && <span>{app.version}</span>}
          {app.version && <span>•</span>}
          <span>{formatSize(app.sizeMB)}</span>
          {app.isSystem && (
            <>
              <span>•</span>
              <span className="text-white/50">系统</span>
            </>
          )}
        </div>
        {!app.launchable && (
          <div className="text-[9px] text-amber-400/70 mt-0.5">无独立界面</div>
        )}
      </div>

      {/* 操作菜单按钮（长按 / 遥控器聚焦后按 OK 打开菜单） */}
      <button
        id={`btn-appmenu-${app.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onAskMenu(app.packageName);
        }}
        className="absolute top-2.5 left-2.5 p-1.5 rounded-xl bg-black/50 border border-white/10 text-white/50 hover:bg-white/15 hover:text-white transition cursor-pointer"
        title={`${app.name} 操作菜单`}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {/* 卸载按钮：常显（手机没有 hover，不能靠 hover 露出） */}
      {canUninstall && (
        <button
          id={`btn-uninstall-${app.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onAskMenu(app.packageName);
          }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/50 border border-white/10 text-white/50 hover:bg-red-500/25 hover:text-red-300 hover:border-red-400/40 transition cursor-pointer"
          title={`卸载 ${app.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export const AppsLauncher: React.FC<AppsLauncherProps> = ({
  apps,
  icons,
  loading,
  error,
  lastUpdated,
  supported,
  onRefresh,
  onRequestIcon,
  storage,
  onCleanCache,
  isCleaningCache,
  focusedId,
  language,
  favorites,
  hiddenApps,
  onToggleFavorite,
  onToggleHidden,
  menuPackage,
  onAskMenu,
  onCloseMenu,
  onFocusItem,
  navRef,
  /** v1.6.0：父组件返回键用 —— 关闭本组件的应用信息/卸载弹窗，返回 true 表示已消费 */
  backRef,
}) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [appToUninstall, setAppToUninstall] = useState<TVApp | null>(null);
  const [appInfo, setAppInfo] = useState<{ app: TVApp; info: AppInfo | null; loading: boolean } | null>(null);

  // v1.6.0：BACK 键先关浮层。应用信息 / 卸载确认弹窗是本组件的局部状态，
  // 父组件看不到 → 通过 backRef 注册「关闭浮层」回调，返回是否消费了这次返回键。
  useEffect(() => {
    if (!backRef) return;
    backRef.current = () => {
      if (appInfo) {
        setAppInfo(null);
        return true;
      }
      if (appToUninstall) {
        setAppToUninstall(null);
        return true;
      }
      return false;
    };
    return () => {
      backRef.current = null;
    };
  }, [appInfo, appToUninstall, backRef]);

  // 操作菜单由父组件统一管理（menuPackage），便于遥控器 MENU 键与卡片长按/「⋯」按钮共用
  const appToMenu = useMemo(
    () => (menuPackage ? apps.find((a) => a.packageName === menuPackage) ?? null : null),
    [menuPackage, apps]
  );
  const [isUninstalling, setIsUninstalling] = useState<boolean>(false);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [showHidden, setShowHidden] = useState<boolean>(false);

  const t = translations[language];

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const hiddenSet = useMemo(() => new Set(hiddenApps), [hiddenApps]);
  const favOrder = useMemo(() => {
    const m = new Map<string, number>();
    favorites.forEach((pkg, i) => m.set(pkg, i));
    return m;
  }, [favorites]);

  const totalGB = formatGB(storage.totalMB);
  const systemGB = formatGB(storage.systemMB);
  const appsGB = formatGB(storage.appsMB);
  const cacheGB = (storage.cacheMB / 1024).toFixed(2);
  const freeGB = formatGB(storage.freeMB);
  const usedPercent =
    storage.totalMB > 0
      ? Math.round(((storage.totalMB - storage.freeMB) / storage.totalMB) * 100)
      : 0;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  // 各分类的真实数量（隐藏的不计入总数）
  const counts = useMemo(() => {
    const c: Record<CategoryKey, number> = {
      all: 0,
      fav: 0,
      user: 0,
      media: 0,
      games: 0,
      tools: 0,
      system: 0,
    };
    for (const a of apps) {
      if (hiddenSet.has(a.packageName)) continue;
      c.all += 1;
      if (favoritesSet.has(a.packageName)) c.fav += 1;
      if (!a.isSystem) c.user += 1;
      if (a.category === 'media') c.media += 1;
      else if (a.category === 'games') c.games += 1;
      else if (a.category === 'tools') c.tools += 1;
      else if (a.category === 'system') c.system += 1;
    }
    return c;
  }, [apps, hiddenSet, favoritesSet]);

  const visibleApps = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let list = apps.filter((a) => {
      // 已隐藏且未开启「显示已隐藏」时，不显示
      if (hiddenSet.has(a.packageName) && !showHidden) return false;
      if (category === 'fav') {
        // 常用：只显示收藏的，且未隐藏（除非 showHidden）
        if (!favoritesSet.has(a.packageName)) return false;
        if (hiddenSet.has(a.packageName)) return false;
      } else if (category === 'user' && a.isSystem) return false;
      else if (category === 'media' && a.category !== 'media') return false;
      else if (category === 'games' && a.category !== 'games') return false;
      else if (category === 'tools' && a.category !== 'tools') return false;
      else if (category === 'system' && a.category !== 'system') return false;
      if (!kw) return true;
      return (
        a.name.toLowerCase().includes(kw) || a.packageName.toLowerCase().includes(kw)
      );
    });
    // 常用分类：按收藏顺序排序
    if (category === 'fav') {
      list = [...list].sort((a, b) => {
        const ia = favOrder.has(a.packageName) ? favOrder.get(a.packageName)! : 9999;
        const ib = favOrder.has(b.packageName) ? favOrder.get(b.packageName)! : 9999;
        return ia - ib;
      });
    }
    return list;
  }, [apps, category, keyword, hiddenSet, showHidden, favoritesSet, favOrder]);

  // 把「应用网格」的 D-pad 方向键导航交给父组件调用：
  // 父组件的 handleRemoteDirection 在 focusedId 以 app-card- 开头时，
  // 直接调用 navRef.current(dir)，由本组件依据真实 visibleApps 与列数计算下一焦点。
  useEffect(() => {
    if (!navRef) return;
    navRef.current = (dir: 'up' | 'down' | 'left' | 'right') => {
      if (!focusedId.startsWith('app-card-')) return;
      const id = focusedId.slice('app-card-'.length);
      const idx = visibleApps.findIndex((a) => a.id === id);
      if (idx < 0) return;
      const len = visibleApps.length;
      const cols = gridColumnCount(gridRef.current);
      let next = idx;
      if (dir === 'left') {
        if (idx % cols !== 0) next = idx - 1;
        else return;
      } else if (dir === 'right') {
        if ((idx + 1) % cols !== 0 && idx + 1 < len) next = idx + 1;
        else return;
      } else if (dir === 'up') {
        if (idx - cols >= 0) next = idx - cols;
        else {
          onFocusItem('nav-tab-5');
          return;
        }
      } else if (dir === 'down') {
        if (idx + cols < len) next = idx + cols;
        else return;
      }
      if (next !== idx) onFocusItem(`app-card-${visibleApps[next].id}`);
    };
    return () => {
      navRef.current = null;
    };
  }, [visibleApps, focusedId, navRef, onFocusItem]);

  const handleLaunch = async (app: TVApp) => {
    if (!app.launchable) {
      showToast(`「${app.name}」没有可打开的界面（可能是系统组件）`);
      return;
    }
    try {
      await launchInstalledApp(app.packageName);
    } catch (e) {
      showToast(e instanceof Error ? e.message : `无法启动「${app.name}」`);
    }
  };

  const handleConfirmUninstall = async () => {
    if (!appToUninstall) return;
    const target = appToUninstall;
    setIsUninstalling(true);
    try {
      const res = await uninstallInstalledApp(target.packageName);
      if (res.mode === 'silent') {
        showToast(`已卸载「${target.name}」`);
        window.setTimeout(onRefresh, 400);
      } else {
        showToast('请在系统弹窗中确认卸载，完成后列表会自动刷新');
        window.setTimeout(onRefresh, 3500);
      }
      setAppToUninstall(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '卸载失败');
    } finally {
      setIsUninstalling(false);
    }
  };

  const openAppInfo = async (app: TVApp) => {
    onCloseMenu();
    setAppInfo({ app, info: null, loading: true });
    try {
      const info = await fetchAppInfo(app.packageName);
      setAppInfo({ app, info, loading: false });
    } catch {
      setAppInfo({ app, info: null, loading: false });
    }
  };

  const handleForceStop = async (app: TVApp) => {
    onCloseMenu();
    setActionBusy(true);
    try {
      const res = await forceStopApp(app.packageName);
      if (res.mode === 'root') showToast(`已强制停止「${app.name}」`);
      else showToast(`已打开「${app.name}」的应用信息页，可在此手动强制停止`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActionBusy(false);
    }
  };

  const handleOpenSettings = async (app: TVApp) => {
    onCloseMenu();
    setAppInfo(null);
    try {
      await openAppSettings(app.packageName);
      showToast(`已打开「${app.name}」的应用信息页`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '打开失败');
    }
  };

  const isFav = (app: TVApp) => favoritesSet.has(app.packageName);
  const isHidden = (app: TVApp) => hiddenSet.has(app.packageName);

  const toggleFav = (app: TVApp) => {
    onToggleFavorite(app.packageName, app.name);
    onCloseMenu();
    showToast(isFav(app) ? `已从常用移除「${app.name}」` : `已加入常用「${app.name}」`);
  };

  const toggleHide = (app: TVApp) => {
    onToggleHidden(app.packageName, app.name);
    onCloseMenu();
    showToast(isHidden(app) ? `已取消隐藏「${app.name}」` : `已隐藏「${app.name}」`);
  };

  return (
    <div className="px-4 md:px-10 py-6 max-w-7xl mx-auto text-left">
      {/* Toast */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-emerald-500/40 text-emerald-400 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      {/* 存储卡片（真实数据） */}
      <div className="bg-neutral-900/80 border border-white/10 rounded-3xl p-5 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>设备存储</span>
                <span className="text-xs font-normal text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                  已用 {usedPercent}%
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                已用 {formatGB(storage.totalMB - storage.freeMB)} GB / 共 {totalGB} GB
              </p>
            </div>
          </div>

          <button
            id="btn-clean-cache-action"
            onClick={onCleanCache}
            disabled={isCleaningCache || storage.cacheMB <= 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer tv-focusable disabled:opacity-50 ${
              focusedId === 'btn-clean-cache-action'
                ? 'bg-white text-black ring-4 ring-sky-400'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isCleaningCache ? 'animate-spin' : ''}`} />
            <span>{isCleaningCache ? '正在清理…' : '清理本应用缓存'}</span>
          </button>
        </div>

        <div className="h-3.5 bg-white/10 rounded-full overflow-hidden flex gap-1 p-0.5 border border-white/10">
          <div
            style={{ width: `${storage.totalMB ? (storage.systemMB / storage.totalMB) * 100 : 0}%` }}
            className="h-full bg-indigo-500 rounded-full"
            title={`系统与其他: ${systemGB} GB`}
          />
          <div
            style={{ width: `${storage.totalMB ? (storage.appsMB / storage.totalMB) * 100 : 0}%` }}
            className="h-full bg-sky-400 rounded-full"
            title={`已装应用: ${appsGB} GB`}
          />
          <div
            style={{ width: `${storage.totalMB ? (storage.cacheMB / storage.totalMB) * 100 : 0}%` }}
            className="h-full bg-amber-400 rounded-full"
            title={`本应用缓存: ${cacheGB} GB`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs mt-3 pt-2 text-white/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>系统与其他 ({systemGB} GB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>已装应用 ({appsGB} GB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>本应用缓存 ({cacheGB} GB)</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <span>可用空间: {freeGB} GB</span>
          </div>
        </div>
      </div>

      {/* 标题 + 刷新 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Grid className="w-6 h-6 text-sky-400" />
            <span>应用库</span>
            <span className="text-xs font-normal text-white/40">({apps.length} 个应用)</span>
          </h2>
          <p className="text-xs text-white/50 mt-1">
            {supported
              ? lastUpdated
                ? `读取设备真实已安装应用 · 上次刷新 ${formatTime(lastUpdated)}`
                : '正在读取设备已安装应用…'
              : '网页预览模式：需安装 APK 后才能读取设备应用'}
          </p>
        </div>

        <button
          id="btn-refresh-apps"
          onClick={onRefresh}
          disabled={loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer tv-focusable disabled:opacity-60 ${
            focusedId === 'btn-refresh-apps'
              ? 'bg-white text-black ring-4 ring-sky-400'
              : 'bg-sky-500 hover:bg-sky-400 text-white'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>{loading ? '刷新中…' : '刷新列表'}</span>
        </button>
      </div>

      {/* 分类 chips（数量按真实数据统计） */}
      {supported && apps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {CATEGORY_LABELS.filter((c) => counts[c.key] > 0).map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                category === c.key
                  ? 'bg-sky-500 text-white border-sky-400'
                  : 'bg-white/5 text-white/65 border-white/10 hover:bg-white/10'
              }`}
            >
              {c.key === 'fav' && <Star className="w-3 h-3" />}
              {c.label}
              <span className="ml-0.5 text-[10px] opacity-70">{counts[c.key]}</span>
            </button>
          ))}

          {hiddenSet.size > 0 && (
            <button
              onClick={() => setShowHidden((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                showHidden
                  ? 'bg-white/15 text-white border-white/30'
                  : 'bg-white/5 text-white/65 border-white/10 hover:bg-white/10'
              }`}
            >
              {showHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showHidden ? '隐藏已显示' : `显示已隐藏(${hiddenSet.size})`}
            </button>
          )}

          <div className="relative ml-auto w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索应用名或包名"
              className="w-full pl-8 pr-8 py-1.5 rounded-full bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 错误 / 空态 */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!supported ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-4">
            <Info className="w-6 h-6" />
          </div>
          <p className="text-sm text-white/70 font-semibold mb-1">网页预览模式</p>
          <p className="text-xs text-white/45 leading-relaxed max-w-md mx-auto">
            浏览器没有读取设备已安装应用的权限。这个功能需要把应用装到设备上（APK）
            后才能使用 —— 届时会显示真实的已装应用、真实图标，并支持一键卸载。
          </p>
        </div>
      ) : loading && apps.length === 0 ? (
        <div className="py-20 text-center text-white/50 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>正在读取应用列表…</span>
        </div>
      ) : visibleApps.length === 0 ? (
        <div className="py-20 text-center text-white/45 text-sm">
          {keyword || category !== 'all'
            ? '没有符合筛选条件的应用'
            : '没有读取到应用'}
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
          {visibleApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              iconUrl={icons[app.packageName]}
              isFocused={focusedId === `app-card-${app.id}`}
              onRequestIcon={onRequestIcon}
              onLaunch={handleLaunch}
              onAskMenu={onAskMenu}
            />
          ))}
        </div>
      )}

      {visibleApps.length > 0 && (
        <p className="text-[11px] text-white/30 mt-4 text-center">
          点击图标启动 · 点 ⋯ 或长按打开菜单（信息/强制停止/常用/隐藏） · 系统应用不可卸载
        </p>
      )}

      {/* 操作菜单 */}
      {appToMenu && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden text-white shrink-0">
                {icons[appToMenu.packageName] ? (
                  <img src={icons[appToMenu.packageName]} alt="" className="w-full h-full object-contain" />
                ) : (
                  <AppWindow className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">{appToMenu.name}</h3>
                <p className="text-[11px] text-white/40 font-mono truncate">{appToMenu.packageName}</p>
              </div>
              <button
                onClick={onCloseMenu}
                className="ml-auto p-2 rounded-xl text-white/50 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => openAppInfo(appToMenu)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition cursor-pointer"
              >
                <Info className="w-4 h-4 text-sky-400" />
                <span>应用信息</span>
              </button>
              <button
                onClick={() => handleForceStop(appToMenu)}
                disabled={actionBusy}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>{actionBusy ? '处理中…' : '强制停止'}</span>
              </button>
              <button
                onClick={() => toggleFav(appToMenu)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition cursor-pointer"
              >
                {isFav(appToMenu) ? (
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                ) : (
                  <Star className="w-4 h-4 text-white/60" />
                )}
                <span>{isFav(appToMenu) ? '取消常用' : '加入常用'}</span>
              </button>
              <button
                onClick={() => toggleHide(appToMenu)}
                disabled={appToMenu.isSystem}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition cursor-pointer disabled:opacity-40"
              >
                {isHidden(appToMenu) ? (
                  <Eye className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Ban className="w-4 h-4 text-white/60" />
                )}
                <span>{isHidden(appToMenu) ? '取消隐藏' : '隐藏应用'}</span>
                {appToMenu.isSystem && <span className="ml-auto text-[10px] text-white/30">系统应用不可隐藏</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 应用信息弹窗 */}
      {appInfo && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-sky-400 mb-4">
              <Info className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">应用信息</h3>
              <button
                onClick={() => setAppInfo(null)}
                className="ml-auto p-2 rounded-xl text-white/50 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {appInfo.loading ? (
              <div className="py-10 text-center text-white/50 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>正在读取详情…</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden text-white shrink-0">
                    {icons[appInfo.app.packageName] ? (
                      <img src={icons[appInfo.app.packageName]} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <AppWindow className="w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white truncate">{appInfo.app.name}</h4>
                    <p className="text-[11px] text-white/40 font-mono truncate">{appInfo.app.packageName}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
                  <Row label="版本" value={appInfo.info?.versionName ? `v${appInfo.info.versionName}` : (appInfo.app.version || '未知')} icon={<Package className="w-3.5 h-3.5" />} />
                  <Row label="安装时间" value={formatDate(appInfo.info?.firstInstallTime)} icon={<Calendar className="w-3.5 h-3.5" />} />
                  <Row label="更新时间" value={formatDate(appInfo.info?.lastUpdateTime)} icon={<Clock className="w-3.5 h-3.5" />} />
                  <Row label="权限数量" value={`${appInfo.info?.permissionsCount ?? 0} 项`} icon={<ShieldCheck className="w-3.5 h-3.5" />} />
                  <Row label="安装包大小" value={formatSize(appInfo.app.sizeMB)} icon={<HardDrive className="w-3.5 h-3.5" />} />
                  <Row
                    label="类型"
                    value={
                      appInfo.app.isSystem
                        ? '系统应用'
                        : appInfo.app.launchable
                        ? '可启动'
                        : '无独立界面'
                    }
                    icon={<AppWindow className="w-3.5 h-3.5" />}
                  />
                  {appInfo.info?.sourceDir && (
                    <div className="flex items-start justify-between gap-3 text-xs pt-1 border-t border-white/10">
                      <span className="text-white/45 flex items-center gap-1.5 shrink-0">
                        <Folder className="w-3.5 h-3.5" /> 路径
                      </span>
                      <span className="font-mono text-white/60 text-right break-all">{appInfo.info.sourceDir}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={() => handleOpenSettings(appInfo.app)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>打开应用信息页</span>
                  </button>
                  <button
                    onClick={() => handleForceStop(appInfo.app)}
                    disabled={actionBusy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition cursor-pointer disabled:opacity-50"
                  >
                    {actionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                    <span>强制停止</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 卸载确认弹窗 */}
      {appToUninstall && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">
                {t['apps.uninstallTitle'] || '确认卸载应用'}
              </h3>
            </div>
            <p className="text-sm text-white/70 leading-relaxed mb-4">
              {`确定要卸载「${appToUninstall.name}」吗？该应用的数据会被一并清除。`}
            </p>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 mb-6 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/45">包名</span>
                <span className="font-mono text-white/80 truncate ml-3">
                  {appToUninstall.packageName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/45">版本</span>
                <span className="text-white/80">{appToUninstall.version || '未知'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/45">安装包大小</span>
                <span className="text-white/80">{formatSize(appToUninstall.sizeMB)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAppToUninstall(null)}
                disabled={isUninstalling}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
              >
                {t['sources.cancelBtn'] || '取消'}
              </button>
              <button
                type="button"
                onClick={handleConfirmUninstall}
                disabled={isUninstalling}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition cursor-pointer disabled:opacity-60"
              >
                {isUninstalling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isUninstalling ? '正在卸载…' : '卸载'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-white/45 flex items-center gap-1.5">
      {icon} {label}
    </span>
    <span className="text-white/80 truncate ml-3">{value}</span>
  </div>
);
