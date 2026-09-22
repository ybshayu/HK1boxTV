import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  MediaItem, 
  CustomVideoSource, 
  TVApp, 
  StorageInfo, 
  PlaybackProgress, 
  ChannelShelfConfig, 
  SupportedLanguage, 
  DisplayTheme 
} from './types';
import { mockMediaList } from './data/mockMedia';
import { initialVideoSources } from './data/mockSources';
import { initialTVApps, defaultStorageInfo } from './data/mockApps';
import { translations } from './i18n/translations';
import { ambientColor } from './utils/theme';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { fetchM3U, ONLINE_SOURCE, toSource } from './services/iptv';

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
  const [apps, setApps] = useState<TVApp[]>(initialTVApps);
  const [storage, setStorage] = useState<StorageInfo>(() => {
    const saved = localStorage.getItem('hk1_storage');
    return saved ? JSON.parse(saved) : defaultStorageInfo;
  });

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

  // Home Shelves Ordering
  const [shelves, setShelves] = useState<ChannelShelfConfig[]>([
    { id: 'sh-resume', key: 'continueWatching', titleKey: 'shelf.continueWatching', order: 0, isVisible: true },
    { id: 'sh-live-tv', key: 'liveTv', titleKey: 'shelf.liveTv', order: 1, isVisible: true },
    { id: 'sh-spotlight', key: 'spotlight', titleKey: 'shelf.spotlight', order: 2, isVisible: true },
    { id: 'sh-trending', key: 'trendingMovies', titleKey: 'shelf.trendingMovies', order: 3, isVisible: true },
    { id: 'sh-series', key: 'hotSeries', titleKey: 'shelf.hotSeries', order: 4, isVisible: true },
    { id: 'sh-4k', key: '4kHdr', titleKey: 'shelf.4kHdr', order: 5, isVisible: true },
    { id: 'sh-cinema', key: 'latestCinema', titleKey: 'shelf.latestCinema', order: 6, isVisible: true },
    { id: 'sh-custom', key: 'customChannels', titleKey: 'shelf.customChannels', order: 7, isVisible: true },
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

  useEffect(() => {
    localStorage.setItem('hk1_storage', JSON.stringify(storage));
  }, [storage]);

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

  // Handle Play Media
  const handlePlayMedia = (media: MediaItem, resumeTime = 0, episodeId?: string) => {
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

  // 真实清理：清空 CacheStorage 与 sessionStorage，并用真实用量回填
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

      let cacheMB = 0;
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        cacheMB = Math.round((est.usage || 0) / 1048576);
      }
      setStorage((prev) => ({ ...prev, cacheMB }));
    } catch {
      /* 权限受限时静默 */
    } finally {
      setIsCleaningCache(false);
    }
  };

  // Handle App Install & Uninstall
  const handleInstallApp = (newApp: TVApp) => {
    setApps((prev) => [newApp, ...prev]);
    setStorage((prev) => ({
      ...prev,
      appsMB: prev.appsMB + newApp.sizeMB,
      freeMB: Math.max(0, prev.freeMB - newApp.sizeMB),
    }));
  };

  const handleUninstallApp = (appId: string) => {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    setApps((prev) => prev.filter((a) => a.id !== appId));
    setStorage((prev) => ({
      ...prev,
      appsMB: Math.max(0, prev.appsMB - app.sizeMB),
      freeMB: prev.freeMB + app.sizeMB,
    }));
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
        setFocusedId(`app-card-${apps[0]?.id}`);
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

      {/* Main App Content Layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
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

        {/* Tab Views */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
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
              title="全部电影"
              categoryFilter="movie"
              subtitle="演示内容（示例片源）· 接入真实点播源请前往「自定义源」"
              mediaList={mediaList.filter((m) => m.type === 'movie' || m.category === 'movie')}
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
              title="精品剧集"
              categoryFilter="series"
              subtitle="演示内容（示例片源）· 接入真实点播源请前往「自定义源」"
              mediaList={mediaList.filter((m) => m.type === 'series' || m.category === 'series')}
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
              storage={storage}
              onInstallApp={handleInstallApp}
              onUninstallApp={handleUninstallApp}
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
