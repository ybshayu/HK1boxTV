export type MediaType = 'movie' | 'series' | 'live';

export type Resolution = '4K UHD' | '1080P FHD' | '720P HD';
export type HdrType = 'Dolby Vision' | 'HDR10+' | 'HDR' | 'SDR';
export type AudioCodec = 'Dolby Atmos' | 'DTS:X' | 'Dolby Digital 5.1' | 'AAC 2.0';

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  duration: string;
  streamUrl: string;
  thumbnailUrl?: string;
  overview?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  category?: MediaType;
  poster: string;
  backdrop: string;
  year: number;
  duration: string; // e.g. "128 min" or "10 集"
  durationSeconds?: number;
  rating: number; // e.g. 9.1
  ratingCount?: string;
  genres: string[];
  resolution: Resolution;
  hdrType: HdrType;
  audio: AudioCodec;
  streamUrl: string;
  synopsis: string;
  director?: string;
  cast?: string[];
  episodes?: Episode[];
  isCustomSource?: boolean;
  sourceName?: string;
  sourceProvider?: string;
}

export interface PlaybackProgress {
  mediaId: string;
  currentTime: number; // in seconds
  duration: number; // in seconds
  lastWatchedAt: number; // timestamp
  episodeId?: string;
  episodeNumber?: number;
}

export interface CustomVideoSource {
  id: string;
  name: string;
  type: 'm3u' | 'vod_json' | 'webdav' | 'direct_stream';
  url: string;
  channelCount?: number;
  status: 'online' | 'offline' | 'checking';
  lastUpdated: string;
  headers?: Record<string, string>;
  channels?: {
    id: string;
    name: string;
    logo?: string;
    streamUrl: string;
    group: string;
  }[];
}

export interface TVApp {
  id: string;
  name: string;
  packageName: string;
  icon: string;
  /** 真实应用图标（原生取回的 base64 dataURL）；为空时回退到内置图标 */
  iconUrl?: string;
  sizeMB: number;
  version: string;
  category: 'media' | 'tools' | 'games' | 'system';
  isSystem?: boolean;
  /** 是否能在启动器里打开（系统组件通常没有启动入口） */
  launchable?: boolean;
  /** 是否是本应用自身（不允许自杀式卸载） */
  isSelf?: boolean;
}

export interface StorageInfo {
  totalMB: number; // e.g. 64 * 1024
  systemMB: number; // e.g. 14.2 GB
  appsMB: number;
  cacheMB: number;
  freeMB: number;
}

export interface ChannelShelfConfig {
  id: string;
  key: string;
  titleKey: string;
  order: number;
  isVisible: boolean;
}

export type SupportedLanguage = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP';

export type DisplayTheme = 'oled-black' | 'dark-slate' | 'ambient-glow';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'update' | 'cache' | 'source';
  timestamp: number;
  version?: string;
  changelog?: string[];
  hasRead?: boolean;
}
