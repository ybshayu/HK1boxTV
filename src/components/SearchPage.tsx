import React, { useState } from 'react';
import { MediaItem, SupportedLanguage, PlaybackProgress } from '../types';
import { translations } from '../i18n/translations';
import { MediaPosterCard } from './MediaPosterCard';
import { 
  Search, 
  Trash2, 
  Clock, 
  Flame, 
  Delete, 
  CornerDownLeft, 
  X 
} from 'lucide-react';

interface SearchPageProps {
  mediaList: MediaItem[];
  searchHistory: string[];
  onAddSearchHistory: (query: string) => void;
  onClearHistory: () => void;
  onSelectMedia: (media: MediaItem) => void;
  progressMap: Record<string, PlaybackProgress>;
  favoritesSet: Set<string>;
  focusedId: string;
  onFocusItem: (id: string) => void;
  language: SupportedLanguage;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  mediaList,
  searchHistory,
  onAddSearchHistory,
  onClearHistory,
  onSelectMedia,
  progressMap,
  favoritesSet,
  focusedId,
  onFocusItem,
  language,
}) => {
  const [query, setQuery] = useState<string>('');
  const t = translations[language];

  const hotKeywords = ['奥本海默', '三体', '沙丘 2', '星际穿越', 'CCTV 4K', '宫崎骏', '双城之战', '真田广之'];

  const keyboardKeys = [
    'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'Q', 'R',
    'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', '0', '1', '2', '3',
    '4', '5', '6', '7', '8', '9',
  ];

  const handleKeyPress = (char: string) => {
    const updated = query + char;
    setQuery(updated);
  };

  const handleBackspace = () => {
    setQuery((prev) => prev.slice(0, -1));
  };

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'movie' | 'series' | 'live'>('all');

  const handleSearchSubmit = (keyword: string) => {
    if (!keyword.trim()) return;
    setQuery(keyword);
    onAddSearchHistory(keyword);
  };

  // Filter media based on query
  const trimmed = query.trim().toLowerCase();
  const rawSearchResults = trimmed
    ? mediaList.filter((m) => {
        return (
          m.title.toLowerCase().includes(trimmed) ||
          m.originalTitle?.toLowerCase().includes(trimmed) ||
          m.director?.toLowerCase().includes(trimmed) ||
          m.cast?.some((c) => c.toLowerCase().includes(trimmed)) ||
          m.genres.some((g) => g.toLowerCase().includes(trimmed))
        );
      })
    : [];

  const searchResults = categoryFilter === 'all'
    ? rawSearchResults
    : rawSearchResults.filter((m) => m.type === categoryFilter || m.category === categoryFilter);

  const movieResultCount = rawSearchResults.filter((m) => m.type === 'movie' || m.category === 'movie').length;
  const seriesResultCount = rawSearchResults.filter((m) => m.type === 'series' || m.category === 'series').length;
  const liveResultCount = rawSearchResults.filter((m) => m.type === 'live' || m.category === 'live').length;

  return (
    <div className="px-10 py-6 max-w-7xl mx-auto text-left">
      {/* Search Input Bar */}
      <div className="relative mb-6">
        <div className="flex items-center gap-3 bg-neutral-900 border border-white/15 rounded-3xl px-6 py-4 shadow-2xl focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/30 transition">
          <Search className="w-6 h-6 text-sky-400 flex-shrink-0" />
          <input
            id="tv-search-main-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query) {
                handleSearchSubmit(query);
              }
            }}
            placeholder={t['search.placeholder']}
            className="w-full bg-transparent text-white placeholder-white/40 text-base focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: TV Virtual D-pad Alphabet Keyboard */}
        <div className="lg:col-span-4 bg-neutral-900/60 border border-white/10 rounded-3xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 flex items-center justify-between">
            <span>遥控器全键盘</span>
            <span className="text-[10px] text-sky-400 font-mono">D-PAD 导航输入</span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {keyboardKeys.map((key) => {
              const isFocused = focusedId === `kbd-key-${key}`;
              return (
                <button
                  key={key}
                  id={`kbd-key-${key}`}
                  onClick={() => handleKeyPress(key)}
                  className={`h-11 rounded-xl text-sm font-bold transition-all cursor-pointer tv-focusable ${
                    isFocused
                      ? 'bg-white text-black ring-2 ring-white scale-110 shadow-lg'
                      : 'bg-white/5 hover:bg-white/15 text-white/90 border border-white/10'
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>

          {/* Action row in keyboard (Backspace, Space, Clear) */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-white/10">
            <button
              id="kbd-key-space"
              onClick={() => handleKeyPress(' ')}
              className="h-10 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 flex items-center justify-center cursor-pointer"
            >
              空格
            </button>
            <button
              id="kbd-key-backspace"
              onClick={handleBackspace}
              className="h-10 rounded-xl bg-white/5 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
            >
              <Delete className="w-4 h-4" />
              <span>删除</span>
            </button>
            <button
              id="kbd-key-clear"
              onClick={() => setQuery('')}
              className="h-10 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold border border-red-500/20 flex items-center justify-center cursor-pointer"
            >
              清空
            </button>
          </div>
        </div>

        {/* Right: History, Hot Searches, and Instant Results */}
        <div className="lg:col-span-8 space-y-6">
          {/* If query has results */}
          {query.trim() ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>搜索结果</span>
                  <span className="text-xs text-sky-400 font-mono">({searchResults.length})</span>
                </h3>

                {rawSearchResults.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-white/10 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        categoryFilter === 'all'
                          ? 'bg-sky-500 text-white shadow'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      全部 ({rawSearchResults.length})
                    </button>
                    <button
                      onClick={() => setCategoryFilter('movie')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        categoryFilter === 'movie'
                          ? 'bg-sky-500 text-white shadow'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      🎬 电影 ({movieResultCount})
                    </button>
                    <button
                      onClick={() => setCategoryFilter('series')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        categoryFilter === 'series'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      📺 电视剧 ({seriesResultCount})
                    </button>
                    <button
                      onClick={() => setCategoryFilter('live')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        categoryFilter === 'live'
                          ? 'bg-red-600 text-white shadow'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      🔴 直播 ({liveResultCount})
                    </button>
                  </div>
                )}
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {searchResults.map((m) => (
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
                <div className="p-12 text-center bg-neutral-900/40 rounded-3xl border border-white/10 text-white/50 text-sm">
                  {t['search.noResults']}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search History */}
              {searchHistory.length > 0 && (
                <div className="bg-neutral-900/60 border border-white/10 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t['search.history']}</span>
                    </h3>
                    <button
                      id="btn-clear-search-history"
                      onClick={onClearHistory}
                      className="text-[11px] text-white/40 hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t['search.clearHistory']}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearchSubmit(item)}
                        className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/80 text-xs border border-white/10 transition cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hot Search Suggestions */}
              <div className="bg-neutral-900/60 border border-white/10 rounded-3xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2 mb-3">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t['search.hot']}</span>
                </h3>

                <div className="flex flex-wrap gap-2">
                  {hotKeywords.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleSearchSubmit(tag)}
                      className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-sky-500/20 hover:border-sky-500/40 text-white/90 text-xs border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
