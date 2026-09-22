import { CustomVideoSource } from '../types';

export interface ParsedChannel {
  id: string;
  name: string;
  logo?: string;
  streamUrl: string;
  group: string;
}

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** 解析 m3u / m3u8 播放列表文本 */
export function parseM3U(text: string): ParsedChannel[] {
  const lines = text.split(/\r?\n/);
  const channels: ParsedChannel[] = [];
  let meta: { name: string; logo?: string; group: string } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const parts = line.split(',');
      const name = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
      const logo = /tvg-logo="([^"]*)"/i.exec(line)?.[1];
      const group = /group-title="([^"]*)"/i.exec(line)?.[1] || '未分组';
      meta = { name: name || '未命名频道', logo, group };
      continue;
    }

    if (line.startsWith('#')) continue;

    if (meta) {
      channels.push({
        id: `ch${channels.length}-${hashStr(meta.name + line)}`,
        // 去掉 [Geo-blocked] / [Not 24/7] 之类的标记，保留干净频道名
        name: meta.name.replace(/\s*\[[^\]]*\]\s*/g, ' ').trim() || '未命名频道',
        logo: meta.logo,
        streamUrl: line,
        group: meta.group,
      });
      meta = null;
    }
  }
  return channels;
}

/** 拉取远程 m3u 并解析（带超时，避免弱网下无限等待） */
export async function fetchM3U(url: string, timeoutMs = 15000): Promise<ParsedChannel[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseM3U(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 在线源：iptv-org 的中国频道列表（144 个，含央视/卫视/地方台）。
 * 采用在线拉取而非写死，源站更新后无需重新发版。
 */
export const ONLINE_SOURCE_URL = 'https://iptv-org.github.io/iptv/countries/cn.m3u';

/**
 * 内置兜底频道：均为构建时实测可直连的国内流。
 * 在线源拉取失败（断网/被墙）时仍能看电视，不会退化成黑屏。
 */
export const BUILTIN_CHANNELS: ParsedChannel[] = [
  {
    id: 'builtin-cctvplus1',
    name: 'CCTV+ 1（央视官方源）',
    group: '央视频道',
    streamUrl: 'https://cd-live-stream.news.cctvplus.com/live/smil:CHANNEL1.smil/playlist.m3u8',
  },
  {
    id: 'builtin-cctvplus2',
    name: 'CCTV+ 2（央视官方源）',
    group: '央视频道',
    streamUrl: 'https://cd-live-stream.news.cctvplus.com/live/smil:CHANNEL2.smil/playlist.m3u8',
  },
  {
    id: 'builtin-zjintl',
    name: '浙江国际频道',
    group: '卫视频道',
    streamUrl: 'https://ali-m-l.cztv.com/channels/lantian/channel10/1080p.m3u8',
  },
  {
    id: 'builtin-jilin',
    name: '吉林影视',
    group: '卫视频道',
    streamUrl: 'http://stream2.jlntv.cn/sptv/sd/live.m3u8',
  },
  {
    id: 'builtin-qingdao',
    name: '青岛新闻综合',
    group: '地方频道',
    streamUrl: 'http://video10.qtv.com.cn/drm/qtv1at/manifest.m3u8',
  },
  {
    id: 'builtin-neimenggu',
    name: '内蒙古广电',
    group: '地方频道',
    streamUrl: 'http://play1-qk.nmtv.cn/live/1735546697341033.m3u8',
  },
];

/** 内置兜底源（始终存在，不可删除） */
export const BUILTIN_SOURCE: CustomVideoSource = {
  id: 'src-builtin',
  name: '内置精选直播源（离线可用）',
  type: 'm3u',
  url: 'builtin://channels',
  channelCount: BUILTIN_CHANNELS.length,
  status: 'online',
  lastUpdated: '2026-09-22',
  channels: BUILTIN_CHANNELS,
};

/** 在线源占位（启动后异步拉取填充频道） */
export const ONLINE_SOURCE: CustomVideoSource = {
  id: 'src-iptv-org-cn',
  name: 'iptv-org 中国频道（在线）',
  type: 'm3u',
  url: ONLINE_SOURCE_URL,
  channelCount: 0,
  status: 'checking',
  lastUpdated: '2026-09-22',
  channels: [],
};

/** 把解析出的频道转成受支持的源结构 */
export function toSource(
  id: string,
  name: string,
  url: string,
  channels: ParsedChannel[],
  type: CustomVideoSource['type'] = 'm3u'
): CustomVideoSource {
  return {
    id,
    name,
    type,
    url,
    channelCount: channels.length,
    status: channels.length > 0 ? 'online' : 'offline',
    lastUpdated: new Date().toISOString().split('T')[0],
    channels,
  };
}
