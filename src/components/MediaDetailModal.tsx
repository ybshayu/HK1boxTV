import React from 'react';
import { MediaItem, PlaybackProgress, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { 
  Play, 
  RotateCcw, 
  Bookmark, 
  BookmarkCheck, 
  Star, 
  Volume2, 
  Tv, 
  ArrowLeft,
  Clock
} from 'lucide-react';

interface MediaDetailModalProps {
  media: MediaItem;
  progress?: PlaybackProgress;
  isFavorite: boolean;
  onPlay: (media: MediaItem, resumeTime?: number, episodeId?: string) => void;
  onToggleFavorite: (media: MediaItem) => void;
  onClose: () => void;
  focusedButtonIndex: number; // 0: Play/Resume, 1: Restart (if resumed), 2: Favorite, 3+: Episodes
  language: SupportedLanguage;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  progress,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onClose,
  focusedButtonIndex,
  language,
}) => {
  const t = translations[language];

  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasResume = progress && progress.currentTime > 10 && progress.currentTime < progress.duration - 30;

  return (
    <div 
      id="media-detail-view"
      className="fixed inset-0 z-40 bg-black overflow-y-auto no-scrollbar animate-fade-in"
    >
      {/* Background High-Res Backdrop with Infuse Gradual Dark Vignette */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={media.backdrop}
          alt={media.title}
          className="w-full h-full object-cover scale-105 filter blur-[1px] opacity-40 transition-all duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
      </div>

      {/* Top Floating Back button for remote & mouse */}
      <div className="relative z-10 px-8 pt-6">
        <button
          id="detail-btn-back"
          onClick={onClose}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition border border-white/15 cursor-pointer ${
            focusedButtonIndex === -1 ? 'ring-2 ring-white bg-white text-black scale-105' : ''
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t['remote.back']}</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 px-12 pt-8 pb-16 max-w-7xl mx-auto flex flex-col md:flex-row gap-10 items-start">
        {/* Left: Poster Box */}
        <div className="w-64 md:w-72 flex-shrink-0 rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-neutral-900">
          <img
            src={media.poster}
            alt={media.title}
            className="w-full h-auto object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Right: Rich Metadata & Actions */}
        <div className="flex-1 text-left">
          {/* Badge Bar: 4K, HDR, Audio */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-black tracking-wider uppercase">
              {media.resolution}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500 text-white tracking-wider uppercase">
              {media.hdrType}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-800 text-white/90 border border-white/15 flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-sky-400" />
              {media.audio}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{media.rating.toFixed(1)}</span>
              {media.ratingCount && <span className="text-[10px] text-amber-300/70">({media.ratingCount})</span>}
            </div>
            {media.sourceProvider && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                源：{media.sourceProvider}
              </span>
            )}
          </div>

          {/* Main Title */}
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
            {media.title}
          </h1>
          {media.originalTitle && (
            <p className="text-sm md:text-base text-white/60 font-light mt-1 mb-4">
              {media.originalTitle} • {media.year}
            </p>
          )}

          {/* Quick specs (Duration, Genres) */}
          <div className="flex items-center gap-3 text-xs text-white/70 mb-5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              {media.duration}
            </span>
            <span>•</span>
            <div className="flex gap-1.5">
              {media.genres.map((g) => (
                <span key={g} className="px-2 py-0.5 rounded bg-white/10 text-white/80">
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-sm md:text-base text-white/80 leading-relaxed max-w-3xl mb-6 line-clamp-3">
            {media.synopsis}
          </p>

          {/* Director and Cast */}
          <div className="space-y-1 text-xs text-white/60 mb-8">
            {media.director && (
              <div>
                <span className="text-white/40">{t['media.director']}: </span>
                <span className="text-white/90 font-medium">{media.director}</span>
              </div>
            )}
            {media.cast && (
              <div>
                <span className="text-white/40">{t['media.cast']}: </span>
                <span className="text-white/90">{media.cast.join(' / ')}</span>
              </div>
            )}
          </div>

          {/* Primary Action Buttons (TVOS Style) */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            {hasResume ? (
              <>
                <button
                  id="detail-action-resume"
                  onClick={() => onPlay(media, progress.currentTime, progress.episodeId)}
                  className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all tv-focusable cursor-pointer ${
                    focusedButtonIndex === 0
                      ? 'bg-white text-black shadow-2xl scale-105 ring-4 ring-white/60'
                      : 'bg-sky-500 text-white hover:bg-sky-400'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {t['media.resume']} ({formatSeconds(progress.currentTime)})
                  </span>
                </button>

                <button
                  id="detail-action-restart"
                  onClick={() => onPlay(media, 0)}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all tv-focusable cursor-pointer border ${
                    focusedButtonIndex === 1
                      ? 'bg-white text-black ring-4 ring-white/60 scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-white/90 border-white/15'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t['media.restart']}</span>
                </button>
              </>
            ) : (
              <button
                id="detail-action-play"
                onClick={() => onPlay(media, 0)}
                className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all tv-focusable cursor-pointer ${
                  focusedButtonIndex === 0
                    ? 'bg-white text-black shadow-2xl scale-105 ring-4 ring-white/60'
                    : 'bg-sky-500 text-white hover:bg-sky-400'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t['media.play']}</span>
              </button>
            )}

            {/* Favorite toggle */}
            <button
              id="detail-action-favorite"
              onClick={() => onToggleFavorite(media)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all tv-focusable cursor-pointer border ${
                focusedButtonIndex === (hasResume ? 2 : 1)
                  ? 'bg-white text-black ring-4 ring-white/60 scale-105'
                  : isFavorite
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white/90 border-white/15'
              }`}
            >
              {isFavorite ? (
                <>
                  <BookmarkCheck className="w-4 h-4 fill-red-400 text-red-400" />
                  <span>{t['media.removeFavorite']}</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>{t['media.addFavorite']}</span>
                </>
              )}
            </button>
          </div>

          {/* TV Series Episode Selector (if Series has episodes) */}
          {media.episodes && media.episodes.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-2">
                <Tv className="w-4 h-4 text-sky-400" />
                <span>{t['media.episodes']} ({media.episodes.length})</span>
              </h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                {media.episodes.map((ep, idx) => {
                  const epFocusIdx = (hasResume ? 3 : 2) + idx;
                  const isEpFocused = focusedButtonIndex === epFocusIdx;

                  return (
                    <button
                      key={ep.id}
                      id={`detail-ep-${ep.id}`}
                      onClick={() => onPlay(media, 0, ep.id)}
                      className={`flex-shrink-0 w-44 p-3 rounded-2xl text-left transition-all border cursor-pointer tv-focusable ${
                        isEpFocused
                          ? 'bg-white text-black border-white ring-2 ring-white scale-105 shadow-xl'
                          : 'bg-white/5 hover:bg-white/15 text-white/90 border-white/10'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">第 {ep.episodeNumber} 集</div>
                      <div className="text-[11px] opacity-75 truncate mt-0.5">{ep.title}</div>
                      <div className="text-[10px] opacity-50 mt-2">{ep.duration}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
