import React, { useRef } from 'react';
import { MediaItem, ChannelShelfConfig, PlaybackProgress, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { MediaPosterCard } from './MediaPosterCard';
import { Play, Tv, Film, Bookmark, Radio, Sparkles, ChevronRight } from 'lucide-react';
import { posterGradient } from '../utils/theme';

interface HomeShelvesViewProps {
  mediaList: MediaItem[];
  shelves: ChannelShelfConfig[];
  progressMap: Record<string, PlaybackProgress>;
  favoritesSet: Set<string>;
  focusedId: string;
  onFocusItem: (id: string) => void;
  onSelectMedia: (media: MediaItem) => void;
  language: SupportedLanguage;
  onNavigateTab?: (tabIndex: number) => void;
  /** 豆瓣榜单数据：榜单 key -> 内容，首页每个 shelf 优先取这里 */
  doubanShelves?: Record<string, MediaItem[]>;
  /** 豆瓣数据加载中 */
  doubanLoading?: boolean;
  /** 下拉刷新豆瓣数据 */
  onRefresh?: () => void;
}

export const HomeShelvesView: React.FC<HomeShelvesViewProps> = ({
  mediaList,
  shelves,
  progressMap,
  favoritesSet,
  focusedId,
  onFocusItem,
  onSelectMedia,
  language,
  onNavigateTab,
  doubanShelves,
  doubanLoading,
  onRefresh,
}) => {
  const t = translations[language];

  // Continue Watching items
  const continueWatchingMedia = mediaList.filter(
    (m) => progressMap[m.id] && progressMap[m.id].currentTime > 5
  );

  // 精选推荐优先用豆瓣「实时热门」第一条，取不到时退回本地数据
  const spotlightMedia =
    doubanShelves?.movie_real_time_hotest?.[0] ||
    doubanShelves?.movie_showing?.[0] ||
    mediaList.find((m) => m.type === 'movie' || m.category === 'movie') ||
    mediaList[0];

  // Group media by shelves strictly using real type and category identifiers
  const getShelfMedia = (key: string): MediaItem[] => {
    // 豆瓣榜单优先：shelf.key 直接对应豆瓣榜单 key
    const fromDouban = doubanShelves?.[key];
    if (fromDouban && fromDouban.length > 0) return fromDouban;

    switch (key) {
      case 'continueWatching':
        return continueWatchingMedia;
      case 'liveTv':
        return mediaList.filter((m) => m.type === 'live' || m.category === 'live');
      case 'spotlight':
        return mediaList.filter((m) => (m.type === 'movie' || m.category === 'movie') && m.rating >= 9.0).slice(0, 5);
      case 'trendingMovies':
        return mediaList.filter((m) => m.type === 'movie' || m.category === 'movie');
      case 'hotSeries':
        return mediaList.filter((m) => m.type === 'series' || m.category === 'series');
      case '4kHdr':
        return mediaList.filter((m) => (m.type === 'movie' || m.category === 'movie') && m.resolution === '4K UHD');
      case 'latestCinema':
        return mediaList.filter((m) => (m.type === 'movie' || m.category === 'movie') && m.year >= 2023);
      case 'customChannels':
        return mediaList.filter((m) => m.type === 'live' || m.category === 'live' || m.isCustomSource);
      default:
        return mediaList;
    }
  };

  // Sort shelves by order and filter visible
  const visibleShelves = [...shelves]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8 pb-20 text-left">
      {/* Spotlight Top Hero Banner (Apple TV style cinematic featured card) */}
      {spotlightMedia && (
        <div className="relative px-8 pt-2">
          <div
            id={`spotlight-hero-${spotlightMedia.id}`}
            onClick={() => onSelectMedia(spotlightMedia)}
            className="group relative h-72 sm:h-80 md:h-96 w-full rounded-3xl overflow-hidden border border-white/15 cursor-pointer"
            style={{ background: posterGradient(spotlightMedia.id) }}
          >
            {/* 背景大图：底层垫渐变，图片未到位/失败时界面依然完整 */}
            <img
              src={spotlightMedia.backdrop}
              alt={spotlightMedia.title}
              className="w-full h-full object-cover"
              decoding="async"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

            {/* Info Overlay */}
            <div className="absolute bottom-6 left-8 max-w-xl text-left space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-black uppercase tracking-wider">
                  HOT 今日重磅精选
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white">
                  {spotlightMedia.resolution}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/80 text-white">
                  {spotlightMedia.hdrType}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow-md">
                {spotlightMedia.title}
              </h2>

              <p className="text-xs sm:text-sm text-white/80 line-clamp-2 leading-relaxed">
                {spotlightMedia.synopsis}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                {/* Play Main Movie */}
                <button
                  id="btn-hero-play-now"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMedia(spotlightMedia);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white text-black font-bold text-xs shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>{t['media.play']}</span>
                </button>

                {/* Direct Live TV Hero Quick Jump Button */}
                {onNavigateTab && (
                  <button
                    id="btn-hero-live-tv"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateTab(1); // Jump to Live TV
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs border border-rose-400/40 transition cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <Tv className="w-3.5 h-3.5" />
                    <span>📺 电视直播 (CCTV & 卫视)</span>
                  </button>
                )}

                <span className="text-xs text-white/60 font-medium pl-1">
                  {spotlightMedia.year} • {spotlightMedia.duration} • 评分 {spotlightMedia.rating}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Category Jump Bar */}
      {onNavigateTab && (
        <div className="px-8">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              id="btn-quick-live-tv"
              onClick={() => onNavigateTab(1)}
              className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-rose-950/70 to-red-900/60 border border-rose-500/30 hover:border-rose-400/70 text-white transition hover:scale-102 cursor-pointer shadow-lg group"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-400/30">
                <Tv className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span>电视直播</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </div>
                <div className="text-[10px] text-white/50">央视/卫视 4K 秒开</div>
              </div>
            </button>

            <button
              id="btn-quick-movies"
              onClick={() => onNavigateTab(2)}
              className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white transition hover:scale-102 cursor-pointer shadow-lg group"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-400/30">
                <Film className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">院线电影</div>
                <div className="text-[10px] text-white/50">4K 杜比视界原盘</div>
              </div>
            </button>

            <button
              id="btn-quick-series"
              onClick={() => onNavigateTab(3)}
              className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white transition hover:scale-102 cursor-pointer shadow-lg group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                <Tv className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">热门剧集</div>
                <div className="text-[10px] text-white/50">华语经典与美剧</div>
              </div>
            </button>

            <button
              id="btn-quick-favorites"
              onClick={() => onNavigateTab(6)}
              className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white transition hover:scale-102 cursor-pointer shadow-lg group"
            >
              <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-400/30">
                <Bookmark className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">我的收藏</div>
                <div className="text-[10px] text-white/50">{favoritesSet.size} 部已标记</div>
              </div>
            </button>

            <button
              id="btn-quick-sources"
              onClick={() => onNavigateTab(4)}
              className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white transition hover:scale-102 cursor-pointer shadow-lg group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                <Radio className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">自定义源</div>
                <div className="text-[10px] text-white/50">TVBox / AList</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Render Shelves according to custom ordering */}
      {visibleShelves.map((shelf) => {
        const shelfItems = getShelfMedia(shelf.key);
        if (shelfItems.length === 0) return null;

        const shelfTitle = t[shelf.titleKey] || shelf.titleKey;

        return (
          <section key={shelf.id} className="relative px-8">
            {/* Shelf Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{shelfTitle}</span>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </h3>
              <span className="text-xs text-white/40 font-mono">
                {shelfItems.length} 部影片
              </span>
            </div>

            {/* Horizontal Scrolling Poster Wall with tvOS smooth shelf navigation */}
            <div className="flex gap-5 overflow-x-auto no-scrollbar py-3 px-1 -mx-1">
              {shelfItems.map((media) => (
                <MediaPosterCard
                  key={`${shelf.id}-${media.id}`}
                  media={media}
                  isFocused={focusedId === `card-${media.id}`}
                  onSelect={onSelectMedia}
                  onFocusItem={onFocusItem}
                  progress={progressMap[media.id]}
                  isFavorite={favoritesSet.has(media.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
