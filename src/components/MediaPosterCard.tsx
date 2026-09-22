import React, { useState } from 'react';
import { MediaItem, PlaybackProgress } from '../types';
import { Star, Bookmark, Play } from 'lucide-react';
import { posterGradient } from '../utils/theme';

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
  // 海报加载失败时退回本地渐变 + 标题，保证联网异常时界面依然完整可读
  const [imgFailed, setImgFailed] = useState(false);

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
        className={`relative w-44 h-64 sm:w-48 sm:h-72 rounded-2xl overflow-hidden tv-focusable border ${
          isFocused ? 'tv-focus-active border-white' : 'border-white/10 opacity-90'
        }`}
        style={{ background: posterGradient(media.id) }}
      >
        {/* 海报图：绝对定位铺满，失败时自动露出底层的渐变色块 */}
        {!imgFailed && (
          <img
            src={media.poster}
            alt={media.title}
            className="absolute inset-0 w-full h-full object-cover select-none"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        )}

        {/* 图片不可用时的标题兜底，保证每张卡片都能辨认 */}
        {imgFailed && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <span className="text-base font-bold text-white/90 text-center line-clamp-3">
              {media.title}
            </span>
          </div>
        )}

        {/* 顶部徽章：去掉 backdrop-blur（每张卡片曾叠加 4 次全屏采样，老 GPU 直接跪） */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-1">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex items-center gap-0.5 ${
                media.type === 'live'
                  ? 'bg-rose-600'
                  : media.type === 'series'
                  ? 'bg-purple-600'
                  : 'bg-sky-600'
              }`}
            >
              {media.type === 'live' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white mr-0.5" />
                  <span>直播</span>
                </>
              ) : media.type === 'series' ? (
                '剧集'
              ) : (
                '电影'
              )}
            </span>

            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/70 text-white border border-white/20">
              {media.resolution.split(' ')[0]}
            </span>
            {media.hdrType !== 'SDR' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500 text-white">
                {media.hdrType === 'Dolby Vision' ? 'DV' : 'HDR'}
              </span>
            )}
          </div>
          {isFavorite && (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white">
              <Bookmark className="w-3 h-3 fill-current" />
            </div>
          )}
        </div>

        {/* 评分（直播频道没有评分，避免显示 0.0） */}
        {media.rating > 0 && (
          <div className="absolute bottom-2.5 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 text-amber-400 text-[11px] font-bold border border-white/10 z-10">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{media.rating.toFixed(1)}</span>
          </div>
        )}

        {/* 观看进度条 */}
        {percentWatched > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20 overflow-hidden">
            <div className="h-full bg-sky-400" style={{ width: `${percentWatched}%` }} />
          </div>
        )}

        {/* 聚焦时的播放提示 */}
        {isFocused && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-white/95 text-black flex items-center justify-center">
              <Play className="w-6 h-6 fill-black ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* 标题与元信息 */}
      <div className="mt-2.5 px-0.5">
        <h4 className={`text-sm font-semibold truncate ${isFocused ? 'text-white' : 'text-white/80'}`}>
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
