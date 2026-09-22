import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TVApp, StorageInfo, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import {
  launchInstalledApp,
  uninstallInstalledApp,
} from '../services/appManager';
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  Folder,
  Gamepad2,
  Grid,
  HardDrive,
  Info,
  Loader2,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  Server,
  Settings,
  Sparkles,
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
}

type CategoryKey = 'all' | 'user' | 'media' | 'games' | 'tools' | 'system';

const CATEGORY_LABELS: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: '全部' },
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

/** 单个应用卡片：负责按需拉取真实图标并做 content-visibility 屏外优化 */
const AppCard: React.FC<{
  app: TVApp;
  iconUrl?: string;
  isFocused: boolean;
  onRequestIcon: (pkg: string) => void;
  onLaunch: (app: TVApp) => void;
  onAskUninstall: (app: TVApp) => void;
}> = ({ app, iconUrl, isFocused, onRequestIcon, onLaunch, onAskUninstall }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (iconUrl || requested.current) return;
    requested.current = true;
    onRequestIcon(app.packageName);
  }, [app.packageName, iconUrl, onRequestIcon]);

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
      onClick={() => onLaunch(app)}
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
      </div>

      {/* 卸载按钮：常显（手机没有 hover，不能靠 hover 露出） */}
      {canUninstall && (
        <button
          id={`btn-uninstall-${app.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onAskUninstall(app);
          }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/50 border border-white/10 text-white/50 hover:bg-red-500/25 hover:text-red-300 hover:border-red-400/40 transition cursor-pointer"
          title={`卸载 ${app.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {!app.launchable && (
        <div className="absolute top-2.5 left-2.5 p-1 rounded-lg bg-black/50 border border-white/10 text-white/40" title="该应用没有可打开的界面">
          <Info className="w-3 h-3" />
        </div>
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
}) => {
  const [appToUninstall, setAppToUninstall] = useState<TVApp | null>(null);
  const [isUninstalling, setIsUninstalling] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryKey>('all');
  const [keyword, setKeyword] = useState<string>('');

  const t = translations[language];

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

  // 各分类的真实数量
  const counts = useMemo(() => {
    const c: Record<CategoryKey, number> = {
      all: apps.length,
      user: 0,
      media: 0,
      games: 0,
      tools: 0,
      system: 0,
    };
    for (const a of apps) {
      if (!a.isSystem) c.user += 1;
      if (a.category === 'media') c.media += 1;
      else if (a.category === 'games') c.games += 1;
      else if (a.category === 'tools') c.tools += 1;
      else if (a.category === 'system') c.system += 1;
    }
    return c;
  }, [apps]);

  const visibleApps = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return apps.filter((a) => {
      if (category === 'user' && a.isSystem) return false;
      if (category === 'media' && a.category !== 'media') return false;
      if (category === 'games' && a.category !== 'games') return false;
      if (category === 'tools' && a.category !== 'tools') return false;
      if (category === 'system' && a.category !== 'system') return false;
      if (!kw) return true;
      return (
        a.name.toLowerCase().includes(kw) || a.packageName.toLowerCase().includes(kw)
      );
    });
  }, [apps, category, keyword]);

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
        // 静默卸载不会经过系统界面，主动刷新一次
        window.setTimeout(onRefresh, 400);
      } else {
        showToast('请在系统弹窗中确认卸载，完成后列表会自动刷新');
        // 系统界面返回后 appStateChange / 广播都会触发刷新，这里再兜一次底
        window.setTimeout(onRefresh, 3500);
      }
      setAppToUninstall(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '卸载失败');
    } finally {
      setIsUninstalling(false);
    }
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                category === c.key
                  ? 'bg-sky-500 text-white border-sky-400'
                  : 'bg-white/5 text-white/65 border-white/10 hover:bg-white/10'
              }`}
            >
              {c.label}
              <span className="ml-1.5 text-[10px] opacity-70">{counts[c.key]}</span>
            </button>
          ))}

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
          {keyword || category !== 'all' ? '没有符合筛选条件的应用' : '没有读取到应用'}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
          {visibleApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              iconUrl={icons[app.packageName]}
              isFocused={focusedId === `app-card-${app.id}`}
              onRequestIcon={onRequestIcon}
              onLaunch={handleLaunch}
              onAskUninstall={setAppToUninstall}
            />
          ))}
        </div>
      )}

      {visibleApps.length > 0 && (
        <p className="text-[11px] text-white/30 mt-4 text-center">
          点击图标启动应用 · 点右上角 🗑 卸载 · 系统应用不可卸载
        </p>
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
                <span className="text-white/45">占用空间</span>
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
