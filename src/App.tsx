import React, { useState, useEffect, useCallback } from 'react';
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

  // Dynamic Background Backdrop (Apple TV / Infuse immersion)
  const [activeBackdrop, setActiveBackdrop] = useState<string>(mockMediaList[0].backdrop);

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

  // Handle Focus Change
  const handleFocusItem = useCallback((id: string) => {
    setFocusedId(id);
    if (id.startsWith('card-')) {
      const mediaId = id.replace('card-', '');
      const found = mediaList.find((m) => m.id === mediaId);
      if (found && found.backdrop) {
        setActiveBackdrop(found.backdrop);
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

  // Handle Deep Cache Clean
  const handleCleanCache = () => {
    setIsCleaningCache(true);
    setTimeout(() => {
      const cleanedAmount = storage.cacheMB;
      setStorage((prev) => ({
        ...prev,
        cacheMB: 280, // minimal buffer
        freeMB: prev.freeMB + (cleanedAmount - 280),
      }));
      setIsCleaningCache(false);
    }, 1400);
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
      {/* Dynamic Immersive Blurred Backdrop (Apple TV & Infuse Aesthetic) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-700">
        <img
          src={activeBackdrop}
          alt="Backdrop"
          className="w-full h-full object-cover filter blur-[40px] opacity-25 scale-110 transition-all duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black" />
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
              subtitle="国内三大运营商 IPv6 直连 · 央视与各省卫视超高清广播频道 (点击即播)"
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
              subtitle="4K UHD 杜比视界高码率原盘与院线大片"
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
              subtitle="热门美剧、国产硬核科幻与历史史诗"
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
