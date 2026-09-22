import React, { useState } from 'react';
import { TVApp, StorageInfo, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { 
  Grid, 
  HardDrive, 
  Trash2, 
  Plus, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Play, 
  Layers, 
  Film, 
  Tv, 
  Server, 
  Folder, 
  Gamepad2, 
  Settings,
  PlayCircle,
  Video
} from 'lucide-react';

interface AppsLauncherProps {
  apps: TVApp[];
  storage: StorageInfo;
  onInstallApp: (app: TVApp) => void;
  onUninstallApp: (appId: string) => void;
  onCleanCache: () => void;
  isCleaningCache: boolean;
  focusedId: string;
  language: SupportedLanguage;
}

export const AppsLauncher: React.FC<AppsLauncherProps> = ({
  apps,
  storage,
  onInstallApp,
  onUninstallApp,
  onCleanCache,
  isCleaningCache,
  focusedId,
  language,
}) => {
  const [appToUninstall, setAppToUninstall] = useState<TVApp | null>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [newAppName, setNewAppName] = useState<string>('');
  const [newPkgName, setNewPkgName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'media' | 'tools' | 'games'>('media');
  const [launchedAppToast, setLaunchedAppToast] = useState<string | null>(null);

  const t = translations[language];

  // Storage calculation in GB
  const totalGB = (storage.totalMB / 1024).toFixed(1);
  const systemGB = (storage.systemMB / 1024).toFixed(1);
  const appsGB = (storage.appsMB / 1024).toFixed(1);
  const cacheGB = (storage.cacheMB / 1024).toFixed(2);
  const freeGB = (storage.freeMB / 1024).toFixed(1);

  const usedPercent = Math.round(((storage.totalMB - storage.freeMB) / storage.totalMB) * 100);

  const getAppIcon = (iconName: string) => {
    switch (iconName) {
      case 'film': return Film;
      case 'server': return Server;
      case 'play-circle': return PlayCircle;
      case 'video': return Video;
      case 'folder': return Folder;
      case 'gamepad-2': return Gamepad2;
      case 'settings': return Settings;
      default: return Tv;
    }
  };

  const handleLaunchApp = (app: TVApp) => {
    setLaunchedAppToast(`已启动「${app.name}」(${app.packageName})`);
    setTimeout(() => setLaunchedAppToast(null), 3000);
  };

  const handleConfirmInstall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName) return;

    const newApp: TVApp = {
      id: `app-${Date.now()}`,
      name: newAppName,
      packageName: newPkgName || `com.tv.${newAppName.toLowerCase().replace(/\s+/g, '')}`,
      icon: newCategory === 'games' ? 'gamepad-2' : newCategory === 'tools' ? 'folder' : 'video',
      sizeMB: Math.floor(Math.random() * 80) + 25,
      version: 'v1.0.0-tv',
      category: newCategory,
    };

    onInstallApp(newApp);
    setIsInstallModalOpen(false);
    setNewAppName('');
    setNewPkgName('');
  };

  const handleConfirmUninstall = () => {
    if (appToUninstall) {
      onUninstallApp(appToUninstall.id);
      setAppToUninstall(null);
    }
  };

  return (
    <div className="px-10 py-6 max-w-7xl mx-auto text-left">
      {/* Toast popup when app launched */}
      {launchedAppToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-emerald-500/40 text-emerald-400 px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <Play className="w-4 h-4 fill-current" />
          <span>{launchedAppToast}</span>
        </div>
      )}

      {/* Top Section: HK1 Box Storage Card */}
      <div className="bg-neutral-900/80 border border-white/10 rounded-3xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t['storage.title']}</span>
                <span className="text-xs font-normal text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                  已用 {usedPercent}%
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                {t['storage.used']}: {((storage.totalMB - storage.freeMB) / 1024).toFixed(1)} GB / 共 {totalGB} GB eMMC 5.1
              </p>
            </div>
          </div>

          <button
            id="btn-clean-cache-action"
            onClick={onCleanCache}
            disabled={isCleaningCache || storage.cacheMB === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer tv-focusable ${
              focusedId === 'btn-clean-cache-action'
                ? 'bg-white text-black ring-4 ring-sky-400 scale-105 shadow-xl'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 disabled:opacity-50'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isCleaningCache ? 'animate-spin' : ''}`} />
            <span>{isCleaningCache ? t['storage.cleaning'] : t['storage.cleanBtn']}</span>
          </button>
        </div>

        {/* Multi-segment Storage Bar */}
        <div className="h-3.5 bg-white/10 rounded-full overflow-hidden flex gap-1 p-0.5 border border-white/10">
          {/* OS Firmare */}
          <div 
            style={{ width: `${(storage.systemMB / storage.totalMB) * 100}%` }}
            className="h-full bg-indigo-500 rounded-full" 
            title={`系统固件: ${systemGB} GB`}
          />
          {/* Apps */}
          <div 
            style={{ width: `${(storage.appsMB / storage.totalMB) * 100}%` }}
            className="h-full bg-sky-400 rounded-full" 
            title={`已装应用: ${appsGB} GB`}
          />
          {/* Cache */}
          <div 
            style={{ width: `${(storage.cacheMB / storage.totalMB) * 100}%` }}
            className="h-full bg-amber-400 rounded-full" 
            title={`影视缓存: ${cacheGB} GB`}
          />
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center gap-4 text-xs mt-3 pt-2 text-white/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>{t['storage.system']} ({systemGB} GB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>{t['storage.apps']} ({appsGB} GB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>{t['storage.cache']} ({cacheGB} GB)</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/90 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <span>{t['storage.free']}: {freeGB} GB</span>
          </div>
        </div>
      </div>

      {/* Apps Grid Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Grid className="w-6 h-6 text-sky-400" />
            <span>{t['apps.title']}</span>
            <span className="text-xs font-normal text-white/40">({apps.length} 个应用)</span>
          </h2>
          <p className="text-xs text-white/50 mt-1">{t['apps.subtitle']}</p>
        </div>

        <button
          id="btn-open-install-modal"
          onClick={() => setIsInstallModalOpen(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer tv-focusable ${
            focusedId === 'btn-open-install-modal'
              ? 'bg-white text-black ring-4 ring-sky-400 scale-105 shadow-xl'
              : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{t['apps.installBtn']}</span>
        </button>
      </div>

      {/* Apps Grid (tvOS Flat App Icon Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {apps.map((app) => {
          const IconComp = getAppIcon(app.icon);
          const isFocused = focusedId === `app-card-${app.id}`;

          return (
            <div
              key={app.id}
              id={`app-card-${app.id}`}
              onClick={() => handleLaunchApp(app)}
              className={`group relative p-5 rounded-3xl border transition-all duration-200 cursor-pointer tv-focusable bg-neutral-900/90 text-left ${
                isFocused
                  ? 'tv-focus-active border-white ring-2 ring-white/90 scale-105 shadow-2xl bg-neutral-800 z-20'
                  : 'border-white/10 hover:border-white/25 hover:bg-neutral-800/80'
              }`}
            >
              {/* App Icon (Apple TV Squircle) */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg mb-3 mx-auto group-hover:scale-105 transition-transform">
                <IconComp className="w-8 h-8" />
              </div>

              {/* Name & Package */}
              <div className="text-center">
                <h4 className="text-sm font-bold text-white truncate">{app.name}</h4>
                <div className="text-[11px] text-white/50 font-mono truncate mt-0.5">{app.packageName}</div>
                <div className="flex items-center justify-center gap-2 text-[10px] text-white/40 mt-1.5">
                  <span>{app.version}</span>
                  <span>•</span>
                  <span>{app.sizeMB} MB</span>
                </div>
              </div>

              {/* Uninstall button (not available for system apps) */}
              {!app.isSystem && (
                <button
                  id={`btn-uninstall-${app.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAppToUninstall(app);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                  title="卸载应用"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal: Uninstall App */}
      {appToUninstall && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">{t['apps.uninstallTitle']}</h3>
            </div>
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              {t['apps.uninstallConfirm'].replace('{name}', appToUninstall.name)}
              <br />
              <span className="text-xs text-white/40 font-mono mt-1 block">
                将释放空间: {appToUninstall.sizeMB} MB
              </span>
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAppToUninstall(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10 transition cursor-pointer"
              >
                {t['sources.cancelBtn']}
              </button>
              <button
                type="button"
                onClick={handleConfirmUninstall}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition cursor-pointer"
              >
                {t['apps.uninstall']}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Install/Add TV App */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-left">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              <span>{t['apps.installTitle']}</span>
            </h3>

            <form onSubmit={handleConfirmInstall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">{t['apps.appName']}</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 腾讯视频TV / 极光TV / Plex"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">{t['apps.pkgName']}</label>
                <input
                  type="text"
                  placeholder="com.tencent.qqlivetv (可选，留空自动生成)"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">{t['apps.category']}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['media', 'tools', 'games'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`py-2 rounded-xl text-xs font-medium border transition cursor-pointer capitalize ${
                        newCategory === cat
                          ? 'bg-sky-500 text-white border-sky-400 shadow'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {cat === 'media' ? '影音媒体' : cat === 'tools' ? '工具应用' : '游戏娱乐'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsInstallModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition cursor-pointer"
                >
                  {t['sources.cancelBtn']}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg transition cursor-pointer"
                >
                  确认安装
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
