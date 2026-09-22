import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  MediaItem, 
  CustomVideoSource, 
  StorageInfo, 
  PlaybackProgress, 
  ChannelShelfConfig, 
  SupportedLanguage, 
  DisplayTheme 
} from './types';
import { mockMediaList } from './data/mockMedia';
import { initialVideoSources } from './data/mockSources';
import { defaultStorageInfo } from './data/mockApps';
import { translations } from './i18n/translations';
import { ambientColor } from './utils/theme';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { fetchM3U, ONLINE_SOURCE, toSource } from './services/iptv';
import { useDouban } from './hooks/useDouban';
import { useInstalledApps } from './hooks/useInstalledApps';
import { doubanListToMedia } from './utils/mediaMapper';
import { MOVIE_LISTS, SERIES_LISTS } from './services/douban';
import { useDeviceMode } from './hooks/useDeviceMode';
import { MobileTabBar } from './components/MobileTabBar';

// Components
import { NavigationHeader } from './components/NavigationHeader';
import { HomeShelvesView } from './components/HomeShelvesView';
import { MediaGridView } from './components/MediaGridView';
import { CustomSourcesManager } from './components/CustomSourcesManager';
import { AppsLauncher } from './components/AppsLauncher';
import { SearchPage } from './components/SearchPage';
import { SettingsPage } from './components/SettingsPage';
import { MediaDetailModal } from './components/MediaDetailModal';
import { VideoPlayer } from './components/VideoPlayer';
import { ChannelReorderModal } from './components/ChannelReorderModal';
import { UpdatePromptModal } from './components/UpdatePromptModal';

export default function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [focusedId, setFocusedId] = useState<string>('nav-tab-0');

  // Media & Data State
  const [mediaList, setMediaList] = useState<MediaItem[]>(mockMediaList);
  const [sources, setSources] = useState<CustomVideoSource[]>(initialVideoSources);
  const [isLoadingSources, setIsLoadingSources] = useState<boolean>(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  // 应用库：读取设备「真实」已安装应用（走原生插件），
  // 并在系统安装 / 卸载 / 更新后自动刷新（广播 + 回前台双保险）
  const installed = useInstalledApps(currentTab === 5);
  const apps = installed.apps;
  // 真实存储信息优先；浏览器预览（无原生能力）时退回占位数据
  const storage: StorageInfo = installed.storageInfo ?? defaultStorageInfo;

  // Playback Progress (Breakpoint Resume)
  const [progressMap, setProgressMap] = useState<Record<string, PlaybackProgress>>(() => {
    const saved = localStorage.getItem('hk1_progress');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return {}; }
    }
    // Seed initial progress for demonstration
    return {
      'm-oppenheimer': {
        mediaId: 'm-oppenheimer',
        currentTime: 4200,
        duration: 10800,
        lastWatchedAt: Date.now() - 3600000,
      },
      's-three-body': {
        mediaId: 's-three-body',
        currentTime: 1450,
        duration: 2700,
        lastWatchedAt: Date.now() - 7200000,
        episodeId: 'tb-1',
        episodeNumber: 1,
      },
    };
  });

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('hk1_favorites');
    return saved ? JSON.parse(saved) : ['m-oppenheimer', 's-three-body', 'live-cctv1-4k'];
  });

  // Home Shelves Ordering —— 除「继续观看 / 直播」外，其余均为豆瓣实时榜单
  const [shelves, setShelves] = useState<ChannelShelfConfig[]>([
    { id: 'sh-resume', key: 'continueWatching', titleKey: 'shelf.continueWatching', order: 0, isVisible: true },
    { id: 'sh-live-tv', key: 'liveTv', titleKey: 'shelf.liveTv', order: 1, isVisible: true },
    { id: 'sh-db-showing', key: 'movie_showing', titleKey: '正在热映', order: 2, isVisible: true },
    { id: 'sh-db-hotest', key: 'movie_real_time_hotest', titleKey: '实时热门', order: 3, isVisible: true },
    { id: 'sh-db-top250', key: 'movie_top250', titleKey: '豆瓣 Top 250', order: 4, isVisible: true },
    { id: 'sh-db-high', key: 'movie_high_score', titleKey: '高分电影', order: 5, isVisible: true },
    { id: 'sh-db-tvhot', key: 'tv_hot', titleKey: '热门剧集', order: 6, isVisible: true },
    { id: 'sh-db-tvcn', key: 'tv_domestic', titleKey: '国产剧', order: 7, isVisible: true },
    { id: 'sh-db-tvus', key: 'tv_american', titleKey: '美剧', order: 8, isVisible: true },
    { id: 'sh-db-anime', key: 'tv_animation', titleKey: '动漫', order: 9, isVisible: true },
    { id: 'sh-db-variety', key: 'tv_variety_show', titleKey: '综艺', order: 10, isVisible: true },
    { id: 'sh-db-custom', key: 'customChannels', titleKey: 'shelf.customChannels', order: 11, isVisible: true },
  ]);

  // System & Preferences
  const [language, setLanguage] = useState<SupportedLanguage>('zh-CN');
  const [theme, setTheme] = useState<DisplayTheme>('oled-black');
  const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    '奥本海默', '三体', '沙丘2', '4K 杜比视界'
  ]);

  // Modals & Active Viewers
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [detailFocusedBtn, setDetailFocusedBtn] = useState<number>(0);
  const [playingMedia, setPlayingMedia] = useState<{
    media: MediaItem;
    initialTime?: number;
    episodeId?: string;
  } | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState<boolean>(false);
  const [isCleaningCache, setIsCleaningCache] = useState<boolean>(false);
  const [hasUpdateNotification, setHasUpdateNotification] = useState<boolean>(true);

  // 轻量背景：只记录当前焦点内容的 id，氛围色由色相推导（不加载大图、不做模糊）
  const [activeFocusId, setActiveFocusId] = useState<string>(mockMediaList[0]?.id || 'home');

  // Save Progress & Favorites to localStorage
  useEffect(() => {
    localStorage.setItem('hk1_progress', JSON.stringify(progressMap));
  }, [progressMap]);

  useEffect(() => {
    localStorage.setItem('hk1_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // 存储信息来自原生实时统计，不再本地持久化（持久化会造成读到过期的假数据）

  // 启动后真实拉取在线直播源；失败则保留内置兜底源并给出提示
  useEffect(() => {
    let cancelled = false;
    setIsLoadingSources(true);
    setSourcesError(null);

    fetchM3U(ONLINE_SOURCE.url)
      .then((channels) => {
        if (cancelled) return;
        if (channels.length === 0) throw new Error('empty playlist');
        setSources((prev) =>
          prev.map((s) =>
            s.id === ONLINE_SOURCE.id ? toSource(s.id, s.name, s.url, channels) : s
          )
        );
      })
      .catch(() => {
        if (cancelled) return;
        setSourcesError('在线源拉取失败，已切换为内置直播源');
        setSources((prev) =>
          prev.map((s) =>
            s.id === ONLINE_SOURCE.id ? { ...s, status: 'offline' as const } : s
          )
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSources(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 把各视频源解析出的「真实频道」并入内容列表（替换掉演示用的假直播项）
  const liveChannels = useMemo<MediaItem[]>(() => {
    const out: MediaItem[] = [];
    for (const s of sources) {
      for (const ch of s.channels || []) {
        out.push({
          id: `live-${ch.id}`,
          title: ch.name,
          type: 'live',
          category: 'live',
          poster: ch.logo || '',
          backdrop: '',
          year: new Date().getFullYear(),
          duration: '实时直播',
          rating: 0,
          genres: [ch.group || '直播'],
          resolution: '1080P FHD',
          hdrType: 'SDR',
          audio: 'AAC 2.0',
          streamUrl: ch.streamUrl,
          synopsis: `直播频道「${ch.name}」，来自 ${s.name}`,
          isCustomSource: true,
          sourceName: s.name,
        });
      }
    }
    return out;
  }, [sources]);

  useEffect(() => {
    setMediaList((prev) => [
      ...prev.filter((m) => m.type !== 'live' && m.category !== 'live'),
      ...liveChannels,
    ]);
  }, [liveChannels]);

  // 豆瓣实时数据（首页推荐 + 分类 chips + 列表分页）
  const {
    lists: doubanLists,
    loading: doubanLoading,
    error: doubanError,
    refresh: refreshDouban,
    loadMore: loadMoreDouban,
    loadingMore: doubanLoadingMore,
  } = useDouban();

  // 豆瓣榜单 → MediaItem（首页 shelf 与电影/剧集分类页共用同一份数据）
  const doubanShelves = useMemo<Record<string, MediaItem[]>>(() => {
    const out: Record<string, MediaItem[]> = {};
    for (const def of [...MOVIE_LISTS, ...SERIES_LISTS]) {
      const page = doubanLists[def.key];
      if (page && page.items.length > 0) {
        out[def.key] = doubanListToMedia(page.items, def.name);
      }
    }
    return out;
  }, [doubanLists]);

  /** 合并多个榜单并按 id 去重（电影/剧集页用） */
  const mergeLists = useCallback(
    (defs: { key: string }[]): MediaItem[] => {
      const seen = new Set<string>();
      const out: MediaItem[] = [];
      for (const d of defs) {
        for (const m of doubanShelves[d.key] || []) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            out.push(m);
          }
        }
      }
      return out;
    },
    [doubanShelves]
  );

  const movieMedia = useMemo(() => mergeLists(MOVIE_LISTS), [mergeLists]);
  const seriesMedia = useMemo(() => mergeLists(SERIES_LISTS), [mergeLists]);

  // 设备形态：手机走触摸布局 + 手势，盒子保持遥控器布局
  const { isMobile } = useDeviceMode();

  // 手机端：左右滑切换底部 Tab（横向滚动区域不参与，避免和海报墙打架）
  useEffect(() => {
    if (!isMobile) return;
    const TABS = [0, 1, 2, 3, 4];
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (playingMedia || activeMedia) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('.overflow-x-auto')) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const idx = TABS.indexOf(currentTab);
      if (idx < 0) return;
      if (dx < 0 && idx < TABS.length - 1) setCurrentTab(TABS[idx + 1]);
      else if (dx > 0 && idx > 0) setCurrentTab(TABS[idx - 1]);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isMobile, currentTab, playingMedia, activeMedia]);

  // Handle Focus Change
  const handleFocusItem = useCallback((id: string) => {
    setFocusedId(id);
    if (id.startsWith('card-')) {
      const mediaId = id.replace('card-', '');
      const found = mediaList.find((m) => m.id === mediaId);
      if (found) {
        setActiveFocusId(found.id);
      }
    }
  }, [mediaList]);

  // 轻提示（豆瓣条目没有播放源时给出引导，避免点了没反应）
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Handle Play Media
  const handlePlayMedia = (media: MediaItem, resumeTime = 0, episodeId?: string) => {
    // 豆瓣只提供元数据（海报/评分/简介），没有播放地址
    if (!media.streamUrl) {
      setToast(`「${media.title}」暂无播放源 · 请到「自定义源」配置后在详情页播放`);
      return;
    }
    setPlayingMedia({
      media,
      initialTime: resumeTime,
      episodeId,
    });
  };

  // Handle Progress Update from Player
  const handleProgressUpdate = (progress: PlaybackProgress) => {
    setProgressMap((prev) => ({
      ...prev,
      [progress.mediaId]: progress,
    }));
  };

  // Handle Favorite Toggle
  const handleToggleFavorite = (media: MediaItem) => {
    setFavorites((prev) => {
      if (prev.includes(media.id)) {
        return prev.filter((id) => id !== media.id);
      }
      return [...prev, media.id];
    });
  };

  // 真实清理：清空 CacheStorage 与 sessionStorage，然后重新拉取原生统计
  const handleCleanCache = async () => {
    setIsCleaningCache(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      try {
        sessionStorage.clear();
      } catch {
        /* 忽略 */
      }
      // 清理后重新读取设备真实存储（缓存目录可能仍被系统占用，以实际统计为准）
      await installed.refresh({ silent: true });
    } catch {
      /* 权限受限时静默 */
    } finally {
      setIsCleaningCache(false);
    }
  };

  // Handle Custom Sources
  const handleAddSource = (newSource: CustomVideoSource) => {
    setSources((prev) => [newSource, ...prev]);
  };

  const handleDeleteSource = (sourceId: string) => {
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
  };

  // Remote D-PAD & Keyboard Navigation Handlers
  const handleRemoteDirection = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (playingMedia) return; // Handled inside player

    if (activeMedia) {
      // In Detail Modal
      if (direction === 'left') {
        setDetailFocusedBtn((prev) => Math.max(-1, prev - 1));
      } else if (direction === 'right') {
        setDetailFocusedBtn((prev) => prev + 1);
      } else if (direction === 'up') {
        setDetailFocusedBtn(-1); // Back button
      } else if (direction === 'down') {
        setDetailFocusedBtn(0);
      }
      return;
    }

    // Main App Navigation
    if (direction === 'up') {
      // Move focus towards top nav
      setFocusedId(`nav-tab-${currentTab}`);
    } else if (direction === 'down') {
      // Move into first item of current view
      if (currentTab === 0) {
        setFocusedId('btn-hero-play-now');
      } else if (currentTab === 1) {
        const first = mediaList.find((m) => m.type === 'live' || m.category === 'live');
        if (first) setFocusedId(`card-${first.id}`);
      } else if (currentTab === 2) {
        const first = mediaList.find((m) => m.type === 'movie' || m.category === 'movie');
        if (first) setFocusedId(`card-${first.id}`);
      } else if (currentTab === 3) {
        const first = mediaList.find((m) => m.type === 'series' || m.category === 'series');
        if (first) setFocusedId(`card-${first.id}`);
      } else if (currentTab === 4) {
        setFocusedId('btn-add-source');
      } else if (currentTab === 5) {
        // 应用列表由原生异步读取，为空时先停在顶部导航，避免聚焦到不存在的卡片
        setFocusedId(apps.length > 0 ? `app-card-${apps[0].id}` : 'nav-tab-5');
      } else if (currentTab === 6) {
        const first = mediaList.find((m) => favoritesSet.has(m.id));
        if (first) setFocusedId(`card-${first.id}`);
      } else if (currentTab === 7) {
        setFocusedId('kbd-key-A');
      }
    } else if (direction === 'left') {
      if (focusedId.startsWith('nav-tab-')) {
        const nextTab = Math.max(0, currentTab - 1);
        setCurrentTab(nextTab);
        setFocusedId(`nav-tab-${nextTab}`);
      } else if (focusedId.startsWith('card-')) {
        const curMediaId = focusedId.replace('card-', '');
        let activeList = mediaList;
        if (currentTab === 1) activeList = mediaList.filter((m) => m.type === 'live' || m.category === 'live');
        else if (currentTab === 2) activeList = mediaList.filter((m) => m.type === 'movie' || m.category === 'movie');
        else if (currentTab === 3) activeList = mediaList.filter((m) => m.type === 'series' || m.category === 'series');
        else if (currentTab === 6) activeList = mediaList.filter((m) => favoritesSet.has(m.id));

        const idx = activeList.findIndex((m) => m.id === curMediaId);
        if (idx > 0) {
          handleFocusItem(`card-${activeList[idx - 1].id}`);
        }
      }
    } else if (direction === 'right') {
      if (focusedId.startsWith('nav-tab-')) {
        const nextTab = Math.min(8, currentTab + 1);
        setCurrentTab(nextTab);
        setFocusedId(`nav-tab-${nextTab}`);
      } else if (focusedId.startsWith('card-')) {
        const curMediaId = focusedId.replace('card-', '');
        let activeList = mediaList;
        if (currentTab === 1) activeList = mediaList.filter((m) => m.type === 'live' || m.category === 'live');
        else if (currentTab === 2) activeList = mediaList.filter((m) => m.type === 'movie' || m.category === 'movie');
        else if (currentTab === 3) activeList = mediaList.filter((m) => m.type === 'series' || m.category === 'series');
        else if (currentTab === 6) activeList = mediaList.filter((m) => favoritesSet.has(m.id));

        const idx = activeList.findIndex((m) => m.id === curMediaId);
        if (idx < activeList.length - 1) {
          handleFocusItem(`card-${activeList[idx + 1].id}`);
        }
      }
    }
  };

  const handleRemoteEnter = () => {
    if (activeMedia) {
      if (detailFocusedBtn === -1) {
        setActiveMedia(null);
      } else if (detailFocusedBtn === 0) {
        const prog = progressMap[activeMedia.id];
        const resTime = prog && prog.currentTime > 10 ? prog.currentTime : 0;
        handlePlayMedia(activeMedia, resTime, prog?.episodeId);
      } else if (detailFocusedBtn === 1) {
        handlePlayMedia(activeMedia, 0);
      } else if (detailFocusedBtn === 2) {
        handleToggleFavorite(activeMedia);
      }
      return;
    }

    if (focusedId.startsWith('nav-tab-')) {
      const tabNum = parseInt(focusedId.replace('nav-tab-', ''), 10);
      if (!isNaN(tabNum)) {
        setCurrentTab(tabNum);
      }
    } else if (focusedId === 'btn-hero-live-tv' || focusedId === 'btn-quick-live-tv') {
      setCurrentTab(1);
      setFocusedId('nav-tab-1');
    } else if (focusedId === 'btn-hero-play-now') {
      const spotlight = mediaList.find((m) => m.type === 'movie') || mediaList[0];
      if (spotlight) {
        setActiveMedia(spotlight);
        setDetailFocusedBtn(0);
      }
    } else if (focusedId.startsWith('card-')) {
      const mediaId = focusedId.replace('card-', '');
      const found = mediaList.find((m) => m.id === mediaId);
      if (found) {
        if (found.type === 'live') {
          handlePlayMedia(found, 0);
        } else {
          setActiveMedia(found);
          setDetailFocusedBtn(0);
        }
      }
    }
  };

  const handleRemoteBack = () => {
    if (playingMedia) {
      setPlayingMedia(null);
      return;
    }
    if (activeMedia) {
      setActiveMedia(null);
      return;
    }
    if (isUpdateModalOpen) {
      setIsUpdateModalOpen(false);
      return;
    }
    if (isReorderModalOpen) {
      setIsReorderModalOpen(false);
      return;
    }
    if (currentTab !== 0) {
      setCurrentTab(0);
      setFocusedId('nav-tab-0');
    }
  };

  const handleRemoteMenu = () => {
    if (focusedId.startsWith('card-')) {
      const mediaId = focusedId.replace('card-', '');
      const found = mediaList.find((m) => m.id === mediaId);
      if (found) {
        handleToggleFavorite(found);
      }
    } else {
      setIsReorderModalOpen(true);
    }
  };

  // Keyboard Event Listener for Physical Remote / PC Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid capturing inside actual text inputs unless D-pad navigation
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleRemoteDirection('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleRemoteDirection('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleRemoteDirection('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleRemoteDirection('right');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleRemoteEnter();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        handleRemoteBack();
      } else if (e.key === 'ContextMenu' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleRemoteMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, currentTab, activeMedia, playingMedia, isUpdateModalOpen, isReorderModalOpen, mediaList, detailFocusedBtn]);

  // 性能模式：挂到 html[data-perf]，由 index.css 统一关闭高开销的模糊与循环动画
  useEffect(() => {
    document.documentElement.dataset.perf = isPerformanceMode ? 'on' : 'off';
  }, [isPerformanceMode]);

  // Android 返回键（遥控器 BACK 键）：交给 handleRemoteBack 处理，
  // 否则 Capacitor WebView 会因单页应用无浏览历史而直接 finish() 退出整个应用。
  const backHandlerRef = useRef<() => void>(() => {});
  useEffect(() => {
    backHandlerRef.current = handleRemoteBack;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;
    CapacitorApp.addListener('backButton', () => backHandlerRef.current())
      .then((sub) => {
        remove = () => sub.remove();
      })
      .catch(() => {
        /* 非原生环境忽略 */
      });
    return () => {
      if (remove) remove();
    };
  }, []);

  const favoritesSet = new Set(favorites);

  return (
    <div
      id="hk1-tv-desktop-container"
      className={`relative min-h-screen w-full select-none overflow-x-hidden ${
        theme === 'oled-black' 
          ? 'bg-black text-white' 
          : theme === 'dark-slate' 
            ? 'bg-[#0f1015] text-white' 
            : 'bg-[#0b0c10] text-white'
      }`}
    >
      {/* 轻量背景：纯 CSS 色相渐变，零模糊合成、零远程大图解码（对老盒子 GPU 友好） */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{ backgroundColor: ambientColor(activeFocusId) }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/75 to-black" />
      </div>

      {/* Main App Content Layout
          注意：必须是 h-screen（固定视口高度）而不是 min-h-screen。
          index.css 里 body 是 overflow-y: hidden，若外层高度不固定，
          main 就会被内容撑开而不是产生自己的滚动条 → 整页滚不动（手机端尤其明显）。 */}
      <div className={`relative z-10 flex flex-col h-screen ${isMobile ? 'pb-safe pb-16' : ''}`}>
        {/* Navigation Header（手机端收起横向 Dock，改用底部 Tab 栏） */}
        {!isMobile && (
          <NavigationHeader
            currentTab={currentTab}
            onSelectTab={(tabIdx) => {
              setCurrentTab(tabIdx);
              setFocusedId(`nav-tab-${tabIdx}`);
            }}
            focusedId={focusedId}
            language={language}
            hasUpdateNotification={hasUpdateNotification}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          />
        )}

        {/* Tab Views
            min-h-0 是必需的：flex 子项默认 min-height:auto，会被内容撑开而不滚动 */}
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {/* Tab 0: Home Shelves */}
          {currentTab === 0 && (
            <HomeShelvesView
              mediaList={mediaList}
              shelves={shelves}
              progressMap={progressMap}
              favoritesSet={favoritesSet}
              focusedId={focusedId}
              onFocusItem={handleFocusItem}
              onSelectMedia={(m) => {
                if (m.type === 'live') {
                  handlePlayMedia(m, 0);
                } else {
                  setActiveMedia(m);
                  setDetailFocusedBtn(0);
                }
              }}
              language={language}
              onNavigateTab={(idx) => {
                setCurrentTab(idx);
                setFocusedId(`nav-tab-${idx}`);
              }}
              doubanShelves={doubanShelves}
              doubanLoading={doubanLoading}
              onRefresh={refreshDouban}
            />
          )}

          {/* Tab 1: Live TV (央视与卫视超高清直播) */}
          {currentTab === 1 && (
            <MediaGridView
              title="电视直播"
              categoryFilter="live"
              subtitle={
                isLoadingSources
                  ? '正在拉取在线直播源…'
                  : sourcesError
                  ? `${sourcesError} · 当前共 ${liveChannels.length} 个频道`
                  : `已加载 ${liveChannels.length} 个直播频道 · 点击即播`
              }
              mediaList={mediaList.filter((m) => m.type === 'live' || m.category === 'live')}
              progressMap={progressMap}
              favoritesSet={favoritesSet}
              focusedId={focusedId}
              onFocusItem={handleFocusItem}
              onSelectMedia={(m) => {
                handlePlayMedia(m, 0); // Directly start full-screen live playback
              }}
              language={language}
            />
          )}

          {/* Tab 2: Movies Grid */}
          {currentTab === 2 && (
            <MediaGridView
              title="电影"
              categoryFilter="movie"
              subtitle={
                doubanLoading
                  ? '正在拉取豆瓣实时数据…'
                  : doubanError || `豆瓣实时数据 · 共 ${movieMedia.length} 部`
              }
              mediaList={movieMedia}
              progressMap={progressMap}
              favoritesSet={favoritesSet}
              focusedId={focusedId}
              onFocusItem={handleFocusItem}
              onSelectMedia={(m) => {
                setActiveMedia(m);
                setDetailFocusedBtn(0);
              }}
              language={language}
            />
          )}

          {/* Tab 3: Series Grid */}
          {currentTab === 3 && (
            <MediaGridView
              title="剧集"
              categoryFilter="series"
              subtitle={
                doubanLoading
                  ? '正在拉取豆瓣实时数据…'
                  : doubanError || `豆瓣实时数据 · 共 ${seriesMedia.length} 部`
              }
              mediaList={seriesMedia}
              progressMap={progressMap}
              favoritesSet={favoritesSet}
              focusedId={focusedId}
              onFocusItem={handleFocusItem}
              onSelectMedia={(m) => {
                setActiveMedia(m);
                setDetailFocusedBtn(0);
              }}
              language={language}
            />
          )}

          {/* Tab 4: Custom Sources & Live IPTV */}
          {currentTab === 4 && (
            <CustomSourcesManager
              sources={sources}
              onAddSource={handleAddSource}
              onDeleteSource={handleDeleteSource}
              onPlayChannel={(channelMedia) => handlePlayMedia(channelMedia, 0)}
              focusedId={focusedId}
              language={language}
            />
          )}

          {/* Tab 5: Apps Drawer & HK1 Storage */}
          {currentTab === 5 && (
            <AppsLauncher
              apps={apps}
              icons={installed.icons}
              loading={installed.loading}
              error={installed.error}
              lastUpdated={installed.lastUpdated}
              supported={installed.supported}
              onRefresh={() => installed.refresh()}
              onRequestIcon={installed.requestIcon}
              storage={storage}
              onCleanCache={handleCleanCache}
              isCleaningCache={isCleaningCache}
              focusedId={focusedId}
              language={language}
            />
          )}

          {/* Tab 6: Favorites Grid */}
          {currentTab === 6 && (
            <MediaGridView
              title="我的收藏"
              subtitle="随时回顾您的星标电影、连续剧与电视直播频道"
              mediaList={mediaList.filter((m) => favoritesSet.has(m.id))}
              progressMap={progressMap}
              favoritesSet={favoritesSet}
              focusedId={focusedId}
              onFocusItem={handleFocusItem}
              onSelectMedia={(m) => {
                if (m.type === 'live') {
                  handlePlayMedia(m, 0);
                } else {
                  setActiveMedia(m);
                  setDetailFocusedBtn(0);
                }
              }}
              language={language}
              isFavoritesPage={true}
            />
          )}

          {/* Tab 7: Search Page */}
          {currentTab === 7 && (
            <SearchPage
              mediaList={mediaList}
              searchHistory={searchHistory}
              onAddSearchHistory={(q) => {
                if (!searchHistory.includes(q)) {
                  setSearchHistory([q, ...searchHistory.slice(0, 7)]);
                }
              }}
              onClearHistory={() => setSearchHistory([])}
              onSelectMedia={(m) => {
                if (m.type === 'live') {
                  handlePlayMedia(m, 0);
                } else {
                  setActiveMedia(m);
                  setDetailFocusedBtn(0);
                }
              }}
              progressMap={progressMap}
              favoritesSet={favoritesSet}
              focusedId={focusedId}
              onFocusItem={handleFocusItem}
              language={language}
            />
          )}

          {/* Tab 8: Settings Page */}
          {currentTab === 8 && (
            <SettingsPage
              language={language}
              onChangeLanguage={setLanguage}
              theme={theme}
              onChangeTheme={setTheme}
              isPerformanceMode={isPerformanceMode}
              onTogglePerformanceMode={() => setIsPerformanceMode(!isPerformanceMode)}
              onOpenReorderModal={() => setIsReorderModalOpen(true)}
              onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
              storage={storage}
              onCleanCache={handleCleanCache}
              isCleaningCache={isCleaningCache}
              focusedId={focusedId}
            />
          )}
        </main>

        {/* 手机端底部 Tab 栏 */}
        {isMobile && (
          <MobileTabBar
            currentTab={currentTab}
            onSelectTab={(idx) => {
              setCurrentTab(idx);
              setFocusedId(`nav-tab-${idx}`);
            }}
          />
        )}
      </div>

      {/* Media Detail Modal */}
      {activeMedia && (
        <MediaDetailModal
          media={activeMedia}
          progress={progressMap[activeMedia.id]}
          isFavorite={favoritesSet.has(activeMedia.id)}
          onPlay={(m, resTime, epId) => {
            setActiveMedia(null);
            handlePlayMedia(m, resTime, epId);
          }}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setActiveMedia(null)}
          focusedButtonIndex={detailFocusedBtn}
          language={language}
        />
      )}

      {/* Fullscreen Video Player */}
      {playingMedia && (
        <VideoPlayer
          media={playingMedia.media}
          initialTime={playingMedia.initialTime}
          episodeId={playingMedia.episodeId}
          onClose={() => setPlayingMedia(null)}
          onProgressUpdate={handleProgressUpdate}
          language={language}
        />
      )}

      {/* Channel Shelf Reorder Modal */}
      {isReorderModalOpen && (
        <ChannelReorderModal
          shelves={shelves}
          onUpdateShelves={setShelves}
          onClose={() => setIsReorderModalOpen(false)}
          language={language}
        />
      )}

      {/* 轻提示（无播放源引导等） */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900 border border-sky-500/40 text-sky-200 px-5 py-3 rounded-2xl text-xs font-medium shadow-2xl max-w-md text-center">
          {toast}
        </div>
      )}

      {/* Update Prompt Modal */}
      {isUpdateModalOpen && (
        <UpdatePromptModal
          onClose={() => {
            setIsUpdateModalOpen(false);
            setHasUpdateNotification(false);
          }}
          language={language}
        />
      )}
    </div>
  );
}
