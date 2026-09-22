import React, { useState, useRef, useEffect } from 'react';
import { MediaItem, PlaybackProgress, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  Maximize, 
  Volume2, 
  VolumeX, 
  ArrowLeft,
  Settings2,
  Tv,
  Check
} from 'lucide-react';

interface VideoPlayerProps {
  media: MediaItem;
  initialTime?: number;
  episodeId?: string;
  onClose: () => void;
  onProgressUpdate: (progress: PlaybackProgress) => void;
  language: SupportedLanguage;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  media,
  initialTime = 0,
  episodeId,
  onClose,
  onProgressUpdate,
  language,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [resumePrompt, setResumePrompt] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<'16-9' | 'fill' | 'original'>('16-9');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [focusedControl, setFocusedControl] = useState<number>(0); // 0: Play/Pause, 1: Rewind, 2: Forward, 3: Speed, 4: Aspect, 5: NextEp
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<number | null>(null);
  const t = translations[language];

  // Resolve stream URL (if series episode selected, use episode stream)
  const currentEpisode = media.episodes?.find((ep) => ep.id === episodeId) || media.episodes?.[0];
  const activeStreamUrl = currentEpisode ? currentEpisode.streamUrl : media.streamUrl;

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Reset controls hide timer
  const triggerControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Setup HLS / Stream playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setLoadError(null);
    setLoading(true);

    const onReady = () => {
      setLoading(false);
      if (initialTime > 0) {
        video.currentTime = initialTime;
        setResumePrompt(`${t['player.resumePrompt']} ${formatSeconds(initialTime)}`);
        setTimeout(() => setResumePrompt(null), 4000);
      }
      video.play().catch(() => setIsPlaying(false));
    };

    if (activeStreamUrl.includes('.m3u8') && Hls.isSupported()) {
      // 老设备（Android 9 盒子）worker 支持不稳定：主线程解析反而更可靠；
      // 同时放宽低延迟模式并限制缓冲，降低内存与卡顿压力。
      hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
      });
      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          setLoading(false);
          setLoadError(
            data.type === Hls.ErrorTypes.NETWORK_ERROR
              ? '网络无法连接该直播源（源可能已失效）'
              : '该直播源暂时无法播放'
          );
        }
      });
    } else {
      video.src = activeStreamUrl;
      video.onloadedmetadata = onReady;
      video.onerror = () => {
        setLoading(false);
        setLoadError('该直播源暂时无法播放（地址可能已失效）');
      };
    }

    triggerControls();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [activeStreamUrl]);

  // Handle Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
      triggerControls();
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  // Seek time
  const handleSeek = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + deltaSeconds));
    triggerControls();
  };

  // Handle time update and report progress
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);

    onProgressUpdate({
      mediaId: media.id,
      currentTime: Math.round(video.currentTime),
      duration: Math.round(video.duration || 0),
      lastWatchedAt: Date.now(),
      episodeId: currentEpisode?.id,
      episodeNumber: currentEpisode?.episodeNumber,
    });
  };

  // Change speed
  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
    triggerControls();
  };

  // Cycle aspect ratio
  const cycleAspect = () => {
    const aspects: Array<'16-9' | 'fill' | 'original'> = ['16-9', 'fill', 'original'];
    const nextIdx = (aspects.indexOf(aspectRatio) + 1) % aspects.length;
    setAspectRatio(aspects[nextIdx]);
    triggerControls();
  };

  // Remote key bindings inside player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      triggerControls();

      if (e.key === ' ' || e.key === 'Enter') {
        if (!showControls) {
          togglePlay();
        } else {
          // Execute focused control
          if (focusedControl === 0) togglePlay();
          else if (focusedControl === 1) handleSeek(-10);
          else if (focusedControl === 2) handleSeek(10);
          else if (focusedControl === 3) cycleSpeed();
          else if (focusedControl === 4) cycleAspect();
        }
      } else if (e.key === 'ArrowLeft') {
        if (showControls) {
          setFocusedControl((prev) => Math.max(0, prev - 1));
        } else {
          handleSeek(-10);
        }
      } else if (e.key === 'ArrowRight') {
        if (showControls) {
          setFocusedControl((prev) => Math.min(4, prev + 1));
        } else {
          handleSeek(10);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        setShowControls(true);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, focusedControl, isPlaying]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      id="tv-fullscreen-player"
      onMouseMove={triggerControls}
      onClick={triggerControls}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className={`w-full h-full ${
          aspectRatio === '16-9' 
            ? 'object-contain aspect-video' 
            : aspectRatio === 'fill' 
              ? 'object-cover' 
              : 'object-none'
        }`}
        playsInline
      />

      {/* Breakpoint Resume Toast Prompt */}
      {resumePrompt && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/90 text-white px-5 py-2.5 rounded-full border border-sky-400/40 flex items-center gap-2.5 text-xs font-medium">
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span>{resumePrompt}</span>
        </div>
      )}

      {/* 加载中 / 播放失败提示：源失效时给出明确反馈，而不是一片黑屏 */}
      {loadError ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-neutral-900/95 border border-rose-500/50 text-white px-7 py-5 rounded-2xl text-center max-w-md">
          <div className="text-rose-400 font-bold text-sm mb-1.5">无法播放</div>
          <div className="text-xs text-white/70 leading-relaxed">{loadError}</div>
          <div className="text-[11px] text-white/40 mt-3">可在「自定义源」中更换其他直播源</div>
        </div>
      ) : loading ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 text-white/70 text-xs">
          正在连接直播源…
        </div>
      ) : null}

      {/* OSD TV Controls Overlay */}
      <div
        className={`absolute inset-0 z-30 flex flex-col justify-between p-8 bg-gradient-to-t from-black/90 via-black/30 to-black/70 transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Header inside player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              id="player-exit-btn"
              onClick={onClose}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
              title="退出播放 (Esc)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow">
                {media.title} {currentEpisode ? `• 第 ${currentEpisode.episodeNumber} 集` : ''}
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                <span className="px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-300 font-bold">{media.resolution}</span>
                <span>{media.hdrType}</span>
                <span>•</span>
                <span>{media.audio}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="space-y-4 max-w-5xl mx-auto w-full pb-4">
          {/* Progress scrubber */}
          <div className="space-y-1.5">
            <div 
              className="relative h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                if (videoRef.current && duration) {
                  videoRef.current.currentTime = clickPos * duration;
                }
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full relative"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-white/70">
              <span>{formatSeconds(currentTime)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Player Navigation Buttons */}
          <div className="flex items-center justify-center gap-4">
            {/* Rewind 10s */}
            <button
              id="player-btn-rewind"
              onClick={() => handleSeek(-10)}
              className={`p-3.5 rounded-2xl transition cursor-pointer border ${
                focusedControl === 1
                  ? 'bg-white text-black ring-4 ring-white/50 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
              title="后退 10 秒"
            >
              <Rewind className="w-5 h-5" />
            </button>

            {/* Play / Pause Main Button */}
            <button
              id="player-btn-playpause"
              onClick={togglePlay}
              className={`p-5 rounded-full transition cursor-pointer shadow-2xl ${
                focusedControl === 0
                  ? 'bg-white text-black ring-4 ring-sky-400 scale-110'
                  : 'bg-sky-500 text-white hover:bg-sky-400'
              }`}
              title="播放 / 暂停"
            >
              {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
            </button>

            {/* Forward 10s */}
            <button
              id="player-btn-forward"
              onClick={() => handleSeek(10)}
              className={`p-3.5 rounded-2xl transition cursor-pointer border ${
                focusedControl === 2
                  ? 'bg-white text-black ring-4 ring-white/50 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
              title="前进 10 秒"
            >
              <FastForward className="w-5 h-5" />
            </button>

            {/* Speed Selector */}
            <button
              id="player-btn-speed"
              onClick={cycleSpeed}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer border ${
                focusedControl === 3
                  ? 'bg-white text-black ring-4 ring-white/50 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
            >
              {speed}x {t['player.speed']}
            </button>

            {/* Aspect Ratio */}
            <button
              id="player-btn-aspect"
              onClick={cycleAspect}
              className={`px-4 py-2.5 rounded-2xl text-xs font-medium transition cursor-pointer border ${
                focusedControl === 4
                  ? 'bg-white text-black ring-4 ring-white/50 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
            >
              {aspectRatio === '16-9' ? t['player.fit16_9'] : aspectRatio === 'fill' ? t['player.fitFill'] : t['player.fitOriginal']}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
