import React from 'react';
import { MediaItem, PlaybackProgress } from '../types';
import { Star, Bookmark, Play } from 'lucide-react';

interface MediaPosterCardProps {
  media: MediaItem;
  isFocused: boolean;
  onSelect: (media: MediaItem) => void;
  onFocusItem: (id: string) => void;
  progress?: PlaybackProgress;
  isFavorite?: boolean;
}

export const MediaPosterCard: React.FC<MediaPosterCardProps> = ({
  media,
  isFocused,
  onSelect,
  onFocusItem,
  progress,
  isFavorite,
}) => {
  const percentWatched = progress && progress.duration > 0
    ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
    : 0;

  return (
    <div
      id={`card-${media.id}`}
      onClick={() => onSelect(media)}
      onMouseEnter={() => onFocusItem(`card-${media.id}`)}
      className="flex-shrink-0 cursor-pointer text-left focus:outline-none"
    >
      <div
        className={`relative w-44 h-64 sm:w-48 sm:h-72 rounded-2xl overflow-hidden tv-focusable bg-neutral-900 border ${
          isFocused
            ? 'tv-focus-active border-white ring-2 ring-white/90 shadow-2xl z-20'
            : 'border-white/10 opacity-90 hover:opacity-100'
        }`}
      >
        {/* Poster Image */}
        <img
          src={media.poster}
          alt={media.title}
          className="w-full h-full object-cover select-none"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Top Badges (Resolution, HDR, Type, Favorite) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-1">
            {/* Explicit Type badge */}
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow backdrop-blur-md text-white flex items-center gap-0.5 ${
                media.type === 'live'
                  ? 'bg-rose-600/90 border border-rose-400/30'
                  : media.type === 'series'
                  ? 'bg-purple-600/90 border border-purple-400/30'
                  : 'bg-sky-600/90 border border-sky-400/30'
              }`}
            >
              {media.type === 'live' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping mr-0.5" />
                  <span>直播</span>
                </>
              ) : media.type === 'series' ? (
                '剧集'
              ) : (
                '电影'
              )}
            </span>

            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-white border border-white/20">
              {media.resolution.split(' ')[0]}
            </span>
            {media.hdrType !== 'SDR' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/80 backdrop-blur-md text-white">
                {media.hdrType === 'Dolby Vision' ? 'DV' : 'HDR'}
              </span>
            )}
          </div>
          {isFavorite && (
            <div className="w-5 h-5 rounded-full bg-red-500/90 backdrop-blur-md flex items-center justify-center text-white shadow">
              <Bookmark className="w-3 h-3 fill-current" />
            </div>
          )}
        </div>

        {/* Rating badge bottom right of image */}
        <div className="absolute bottom-2.5 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-400 text-[11px] font-bold border border-white/10 z-10">
          <Star className="w-3 h-3 fill-amber-400" />
          <span>{media.rating.toFixed(1)}</span>
        </div>

        {/* Breakpoint Resume Progress Bar */}
        {percentWatched > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-300"
              style={{ width: `${percentWatched}%` }}
            />
          </div>
        )}

        {/* Focus Highlight Play Icon */}
        {isFocused && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl animate-fade-in">
              <Play className="w-6 h-6 fill-black ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Title & Metadata below poster */}
      <div className="mt-2.5 px-0.5">
        <h4 className={`text-sm font-semibold truncate transition-colors ${isFocused ? 'text-white' : 'text-white/80'}`}>
          {media.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
          <span>{media.year}</span>
          <span>•</span>
          <span>{media.duration}</span>
          {percentWatched > 0 && (
            <>
              <span>•</span>
              <span className="text-sky-400 font-medium">{percentWatched}%</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
