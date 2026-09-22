import React, { useState } from 'react';
import { MediaItem, PlaybackProgress, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { MediaPosterCard } from './MediaPosterCard';
import { Bookmark, Film, Tv, Sparkles, Filter } from 'lucide-react';

interface MediaGridViewProps {
  title: string;
  subtitle?: string;
  mediaList: MediaItem[];
  categoryFilter?: 'movie' | 'series' | 'live';
  progressMap: Record<string, PlaybackProgress>;
  favoritesSet: Set<string>;
  focusedId: string;
  onFocusItem: (id: string) => void;
  onSelectMedia: (media: MediaItem) => void;
  language: SupportedLanguage;
  isFavoritesPage?: boolean;
}

export const MediaGridView: React.FC<MediaGridViewProps> = ({
  title,
  subtitle,
  mediaList,
  categoryFilter,
  progressMap,
  favoritesSet,
  focusedId,
  onFocusItem,
  onSelectMedia,
  language,
  isFavoritesPage,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('全部');
  const [favoriteTypeFilter, setFavoriteTypeFilter] = useState<'all' | 'movie' | 'series' | 'live'>('all');
  const t = translations[language];

  // Reset genre and type filter whenever the page title or categoryFilter changes
  React.useEffect(() => {
    setSelectedGenre('全部');
    setFavoriteTypeFilter('all');
  }, [title, categoryFilter]);

  // Determine strict category target
  const effectiveCategoryFilter: 'movie' | 'series' | 'live' | undefined = 
    categoryFilter ??
    (isFavoritesPage
      ? undefined
      : title.includes('电影')
      ? 'movie'
      : title.includes('剧集') || title.includes('电视剧')
      ? 'series'
      : title.includes('直播')
      ? 'live'
      : undefined);

  // Strictly filter by category and type
  const typeFilteredList = React.useMemo(() => {
    if (isFavoritesPage) {
      if (favoriteTypeFilter === 'all') return mediaList;
      return mediaList.filter(
        (m) => m.type === favoriteTypeFilter || m.category === favoriteTypeFilter
      );
    }
    if (effectiveCategoryFilter) {
      return mediaList.filter(
        (m) => m.type === effectiveCategoryFilter || m.category === effectiveCategoryFilter
      );
    }
    return mediaList;
  }, [mediaList, isFavoritesPage, favoriteTypeFilter, effectiveCategoryFilter]);

  // Collect all available genres based on strictly filtered category list
  const allGenres = ['全部', ...Array.from(new Set(typeFilteredList.flatMap((m) => m.genres)))];

  const filteredMedia = selectedGenre === '全部'
    ? typeFilteredList
    : typeFilteredList.filter((m) => m.genres.includes(selectedGenre));

  // Count types for favorites page using strict type or category
  const movieCount = mediaList.filter((m) => m.type === 'movie' || m.category === 'movie').length;
  const seriesCount = mediaList.filter((m) => m.type === 'series' || m.category === 'series').length;
  const liveCount = mediaList.filter((m) => m.type === 'live' || m.category === 'live').length;

  return (
    <div className="px-10 py-4 max-w-7xl mx-auto text-left pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            {isFavoritesPage ? (
              <Bookmark className="w-7 h-7 text-red-400" />
            ) : title.includes('剧集') || title.includes('电视') ? (
              <Tv className="w-7 h-7 text-purple-400" />
            ) : (
              <Film className="w-7 h-7 text-sky-400" />
            )}
            <span>{title}</span>
            <span className="text-xs font-normal text-white/50 bg-white/10 px-2.5 py-0.5 rounded-full">
              {filteredMedia.length} 部
            </span>
          </h2>
          {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
        </div>

        {/* Favorites Sub-Type Segmented Tabs */}
        {isFavoritesPage && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/10 border border-white/10">
            <button
              onClick={() => { setFavoriteTypeFilter('all'); setSelectedGenre('全部'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                favoriteTypeFilter === 'all' ? 'bg-white text-black shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              全部 ({mediaList.length})
            </button>
            <button
              onClick={() => { setFavoriteTypeFilter('movie'); setSelectedGenre('全部'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                favoriteTypeFilter === 'movie' ? 'bg-sky-500 text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              🎬 电影 ({movieCount})
            </button>
            <button
              onClick={() => { setFavoriteTypeFilter('series'); setSelectedGenre('全部'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                favoriteTypeFilter === 'series' ? 'bg-purple-500 text-white shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              📺 电视剧 ({seriesCount})
            </button>
            {liveCount > 0 && (
              <button
                onClick={() => { setFavoriteTypeFilter('live'); setSelectedGenre('全部'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  favoriteTypeFilter === 'live' ? 'bg-rose-500 text-white shadow' : 'text-white/70 hover:text-white'
                }`}
              >
                🔴 直播 ({liveCount})
              </button>
            )}
          </div>
        )}

        {/* Genre filter tags */}
        {allGenres.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {allGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer tv-focusable ${
                  selectedGenre === genre
                    ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-300'
                    : 'bg-white/5 hover:bg-white/15 text-white/70 border border-white/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Media Grid */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredMedia.map((m) => (
            <MediaPosterCard
              key={m.id}
              media={m}
              isFocused={focusedId === `card-${m.id}`}
              onSelect={onSelectMedia}
              onFocusItem={onFocusItem}
              progress={progressMap[m.id]}
              isFavorite={favoritesSet.has(m.id)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-neutral-900/40 rounded-3xl border border-white/10 p-8">
          <Bookmark className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white/80">暂无影片</h3>
          <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
            {isFavoritesPage
              ? '在影片详情页点击「加入收藏」或在遥控器上按菜单键即可收藏到此处。'
              : '没有找到符合当前筛选条件的影片。'}
          </p>
        </div>
      )}
    </div>
  );
};
