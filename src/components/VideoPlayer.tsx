import React, { useState, useRef, useEffect } from 'react';
import { MediaItem, PlaybackProgress, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import Hls from 'hls.js';
import {
  fetchEpg,
  resolveNowNext,
  type EpgProgramme,
  type EpgNow,
} from '../services/epg';
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
  Check,
  ListVideo,
  X
} from 'lucide-react';

interface VideoPlayerProps {
  media: MediaItem;
  initialTime?: number;
  episodeId?: string;
  onClose: () => void;
  onProgressUpdate: (progress: PlaybackProgress) => void;
  language: SupportedLanguage;
  /** 直播自动换源：致命播放错误时请求父组件切换到下一条可用线路 */
  onRequestSwitchSource?: (reason: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  media,
  initialTime = 0,
  episodeId,
  onClose,
  onProgressUpdate,
  language,
  onRequestSwitchSource,
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
  // 触屏手势相关
  const [brightness, setBrightness] = useState<number>(1);
  const [gestureHint, setGestureHint] = useState<string | null>(null);
  const speedRef = useRef<number>(1);

  const controlsTimeoutRef = useRef<number | null>(null);
  const t = translations[language];

  // —— 直播 EPG 节目单（v1.6.0）：仅在直播模式按需拉取，60s 刷新进行中节目 ——
  const isLive = media.type === 'live';
  const [epgList, setEpgList] = useState<EpgProgramme[]>([]);
  const [epgNow, setEpgNow] = useState<EpgNow | null>(null);
  const [showEpg, setShowEpg] = useState<boolean>(false);
  const epgListRef = useRef<EpgProgramme[]>([]);
  epgListRef.current = epgList;

  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    setEpgList([]);
    setEpgNow(null);
    setShowEpg(false);
    fetchEpg(media.title)
      .then((list) => {
        if (cancelled) return;
        setEpgList(list);
        setEpgNow(resolveNowNext(list));
      })
      .catch(() => {
        /* 节目单失败不影响播放 */
      });
    const timer = window.setInterval(() => {
      setEpgNow(resolveNowNext(epgListRef.current));
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isLive, media.title]);

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

    // 直播自动换源：有备用线路时把失败交给父组件切换，而不是停在报错页
    const handleFatal = (reason: string) => {
      if (media.type === 'live' && media.altSources && media.altSources.length > 0 && onRequestSwitchSource) {
        onRequestSwitchSource(reason);
        return;
      }
      setLoadError(reason);
    };

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
          handleFatal(
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
        handleFatal('该直播源暂时无法播放（地址可能已失效）');
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
  // v1.6.0：统一抽成 keyRef（键盘 key 名），供 keydown 与原生 DPAD 直通两个入口复用；
  // 并对 keyCode 兜底（部分 WebView 不把 DPAD 转成 ArrowDown 等 key 名，只给原始 keyCode）
  const ANDROID_KEY_BY_CODE: Record<number, string> = {
    4: 'Escape', // KEYCODE_BACK（个别 WebView 会以 keydown 形式给出）
    20: 'ArrowDown', // KEYCODE_DPAD_DOWN
    21: 'ArrowUp', // KEYCODE_DPAD_UP
    22: 'ArrowLeft', // KEYCODE_DPAD_LEFT
    23: 'Enter', // KEYCODE_DPAD_CENTER
    66: 'Enter', // KEYCODE_ENTER
  };
  const playerKeyRef = useRef<(key: string) => void>(() => {});
  playerKeyRef.current = (key: string) => {
    triggerControls();

    if (key === ' ' || key === 'Enter') {
      if (!showControls) {
        togglePlay();
      } else {
        // Execute focused control
        if (focusedControl === 0) togglePlay();
        else if (focusedControl === 1) handleSeek(-10);
        else if (focusedControl === 2) handleSeek(10);
        else if (focusedControl === 3) cycleSpeed();
        else if (focusedControl === 4) cycleAspect();
        else if (focusedControl === 5) setShowEpg((v) => !v);
      }
    } else if (key === 'ArrowLeft') {
      if (showControls) {
        setFocusedControl((prev) => Math.max(0, prev - 1));
      } else {
        handleSeek(-10);
      }
    } else if (key === 'ArrowRight') {
      if (showControls) {
        setFocusedControl((prev) => Math.min(isLive ? 5 : 4, prev + 1));
      } else {
        handleSeek(10);
      }
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      setShowControls(true);
    } else if (key === 'Escape' || key === 'Backspace') {
      if (showEpg) {
        setShowEpg(false);
      } else {
        onClose();
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mapped = ANDROID_KEY_BY_CODE[e.keyCode];
      const key = mapped || e.key;
      const interesting =
        [' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Backspace'].includes(key);
      if (!interesting) {
        // 便于 logcat 诊断：打出没被识别的按键（排查不同盒子遥控器键码差异）
        console.log('[PlayerKey] unhandled', e.key, e.keyCode);
        return;
      }
      e.preventDefault();
      playerKeyRef.current(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 原生 DPAD 直通入口（MainActivity.dispatchKeyEvent → evaluateJavascript）
  useEffect(() => {
    (window as any).__hk1PlayerKey = (dir: string) => {
      const map: Record<string, string> = {
        center: 'Enter',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        up: 'ArrowUp',
        down: 'ArrowDown',
        back: 'Escape',
      };
      playerKeyRef.current(map[dir] || dir);
    };
    return () => {
      delete (window as any).__hk1PlayerKey;
    };
  }, []);

  // 触屏手势：单击显隐控件 / 双击左右快退快进 / 左右滑拖进度 /
  //           左半屏上下滑调亮度 / 右半屏上下滑调音量 / 长按 2 倍速
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startMs = 0;
    let mode: 'none' | 'seek' | 'volume' | 'brightness' = 'none';
    let lastTap = 0;
    let longPress: number | null = null;
    let startVolume = 1;
    let startBrightness = 1;
    let startTime = 0;
    let longPressing = false;

    const clearLongPress = () => {
      if (longPress !== null) {
        clearTimeout(longPress);
        longPress = null;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startMs = Date.now();
      mode = 'none';
      longPressing = false;
      startVolume = videoRef.current?.volume ?? 1;
      startBrightness = brightness;
      startTime = videoRef.current?.currentTime ?? 0;

      clearLongPress();
      longPress = window.setTimeout(() => {
        longPressing = true;
        if (videoRef.current) {
          speedRef.current = speed;
          videoRef.current.playbackRate = 2;
          setSpeed(2);
        }
        setGestureHint('2× 倍速播放中');
      }, 500);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (mode === 'none') {
        if (longPressing) return;
        if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) {
          mode = 'seek';
        } else if (Math.abs(dy) > 24) {
          mode = startX < window.innerWidth / 2 ? 'brightness' : 'volume';
        } else {
          return;
        }
        clearLongPress();
      }

      if (mode === 'seek') {
        const video = videoRef.current;
        if (!video || !duration) return;
        const delta = (dx / window.innerWidth) * duration * 0.6;
        video.currentTime = Math.max(0, Math.min(duration, startTime + delta));
        setGestureHint(`${formatSeconds(video.currentTime)} / ${formatSeconds(duration)}`);
      } else if (mode === 'volume') {
        const v = Math.max(0, Math.min(1, startVolume - dy / 300));
        if (videoRef.current) videoRef.current.volume = v;
        setIsMuted(v === 0);
        setGestureHint(`音量 ${Math.round(v * 100)}%`);
      } else if (mode === 'brightness') {
        const b = Math.max(0.25, Math.min(1.6, startBrightness - dy / 300));
        setBrightness(b);
        setGestureHint(`亮度 ${Math.round((b / 1.6) * 100)}%`);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const wasLong = longPressing;
      clearLongPress();

      if (wasLong) {
        // 松手恢复原速
        if (videoRef.current) videoRef.current.playbackRate = speedRef.current;
        setSpeed(speedRef.current);
        longPressing = false;
        setGestureHint(null);
        mode = 'none';
        return;
      }

      const dt = Date.now() - startMs;
      if (mode === 'none' && dt < 240) {
        const now = Date.now();
        const t = e.changedTouches[0];
        if (now - lastTap < 300) {
          // 双击：左半屏后退 10 秒 / 右半屏前进 10 秒
          if (t.clientX < window.innerWidth / 2) handleSeek(-10);
          else handleSeek(10);
          lastTap = 0;
        } else {
          lastTap = now;
          const myTap = now;
          window.setTimeout(() => {
            // 300ms 内没有第二击才当作单击
            if (lastTap === myTap) {
              setShowControls((s) => !s);
              triggerControls();
            }
          }, 300);
        }
      }
      mode = 'none';
      window.setTimeout(() => setGestureHint(null), 500);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      clearLongPress();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [duration, brightness, speed]);

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
        style={brightness !== 1 ? { filter: `brightness(${brightness})` } : undefined}
        className={`w-full h-full ${
          aspectRatio === '16-9' 
            ? 'object-contain aspect-video' 
            : aspectRatio === 'fill' 
              ? 'object-cover' 
              : 'object-none'
        }`}
        playsInline
      />

      {/* 手势操作反馈（拖动进度 / 音量 / 亮度 / 倍速） */}
      {gestureHint && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 bg-black/75 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold border border-white/15 pointer-events-none">
          {gestureHint}
        </div>
      )}

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
                {media.altSources && media.altSources.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-300/80">{media.altSources.length + 1} 条线路</span>
                  </>
                )}
              </div>
              {/* 直播 EPG：正在播 / 接下来（51zmt DIYP 数据，60s 刷新） */}
              {isLive && epgNow?.current && (
                <div className="mt-2 max-w-xl">
                  <div className="flex items-center gap-2 text-xs text-white/85">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 font-bold shrink-0">正在播</span>
                    <span className="truncate">{epgNow.current.title}</span>
                    <span className="text-white/40 shrink-0">{epgNow.current.start}-{epgNow.current.end}</span>
                  </div>
                  <div className="mt-1 h-1 bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-400/80 rounded-full"
                      style={{ width: `${Math.round(epgNow.progress * 100)}%` }}
                    />
                  </div>
                  {epgNow.next && (
                    <div className="flex items-center gap-2 text-[11px] text-white/50 mt-1">
                      <span className="shrink-0">接下来</span>
                      <span className="truncate">{epgNow.next.title}</span>
                      <span className="shrink-0">{epgNow.next.start}</span>
                    </div>
                  )}
                </div>
              )}
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

            {/* 节目单（仅直播）：遥控器焦点位 5，OK 键开关 */}
            {isLive && (
              <button
                id="player-btn-epg"
                onClick={() => setShowEpg((v) => !v)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-medium transition cursor-pointer border flex items-center gap-1.5 ${
                  focusedControl === 5
                    ? 'bg-white text-black ring-4 ring-white/50 scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                }`}
              >
                <ListVideo className="w-4 h-4" />
                节目单
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EPG 节目单面板（右侧抽屉，盖在 OSD 之上） */}
      {isLive && showEpg && (
        <div className="absolute inset-y-0 right-0 z-40 w-full max-w-sm bg-neutral-950/95 border-l border-white/10 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">今日节目单 · {media.title}</div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {epgList.length > 0 ? `${epgList.length} 个节目 · 51zmt EPG` : '暂无节目单数据'}
              </div>
            </div>
            <button
              onClick={() => setShowEpg(false)}
              className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {epgList.length === 0 && (
              <div className="text-xs text-white/40 text-center py-10">
                该频道暂无节目单数据
                <br />
                <span className="text-white/25">播放不受影响</span>
              </div>
            )}
            {epgList.map((p, i) => {
              const isNow = epgNow?.current === p;
              return (
                <div
                  key={`${p.start}-${i}`}
                  className={`px-3 py-2 rounded-xl flex items-center gap-3 text-xs ${
                    isNow
                      ? 'bg-rose-500/15 border border-rose-400/40'
                      : 'bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={`font-mono shrink-0 ${isNow ? 'text-rose-300' : 'text-white/45'}`}>{p.start}</span>
                  <span className={`truncate ${isNow ? 'text-white font-semibold' : 'text-white/75'}`}>{p.title}</span>
                  {isNow && (
                    <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 text-[10px] font-bold">
                      正在播
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
