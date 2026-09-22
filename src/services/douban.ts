import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * 豆瓣实时数据层
 *
 * 数据源（2026-09-22 实测全部可用）：
 *   https://m.douban.com/rexxar/api/v2/subject_collection/<key>/items?start=0&count=20&items_only=1
 *
 * 两个必须注意的坑：
 *  1) 该接口没有 access-control-allow-origin，WebView 里直接 fetch 会被 CORS 拦，
 *     因此原生平台一律走 CapacitorHttp（走原生 HTTP 栈，可自定义头、无 CORS 限制）。
 *  2) 海报图（img*.doubanio.com）有防盗链：不带 Referer 返回 418。
 *     原生层由 DoubanImageClient 统一补 Referer（见 android patch），前端只管用原始 URL。
 */

export interface DoubanItem {
  id: string;
  title: string;
  poster: string;
  rating: number;
  year?: number;
  genres: string[];
  region?: string;
  directors?: string[];
  actors?: string[];
  synopsis?: string;
  url?: string;
  type: 'movie' | 'series';
}

export interface DoubanListDef {
  key: string;
  name: string;
  type: 'movie' | 'series';
}

/** 实测可用的豆瓣榜单（14 个） */
export const DOUBAN_LISTS: DoubanListDef[] = [
  { key: 'movie_showing', name: '正在热映', type: 'movie' },
  { key: 'movie_real_time_hotest', name: '实时热门', type: 'movie' },
  { key: 'movie_top250', name: 'Top 250', type: 'movie' },
  { key: 'movie_high_score', name: '高分电影', type: 'movie' },
  { key: 'movie_classic', name: '经典电影', type: 'movie' },
  { key: 'movie_soon', name: '即将上映', type: 'movie' },
  { key: 'tv_hot', name: '热门剧集', type: 'series' },
  { key: 'tv_domestic', name: '国产剧', type: 'series' },
  { key: 'tv_american', name: '美剧', type: 'series' },
  { key: 'tv_korean', name: '韩剧', type: 'series' },
  { key: 'tv_japanese', name: '日剧', type: 'series' },
  { key: 'tv_animation', name: '动漫', type: 'series' },
  { key: 'tv_variety_show', name: '综艺', type: 'series' },
  { key: 'tv_documentary', name: '纪录片', type: 'series' },
];

export const MOVIE_LISTS = DOUBAN_LISTS.filter((l) => l.type === 'movie');
export const SERIES_LISTS = DOUBAN_LISTS.filter((l) => l.type === 'series');

const UA =
  'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DOUBAN_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  Referer: 'https://m.douban.com/',
  Accept: 'application/json',
};

const CACHE_PREFIX = 'hk1_douban_';
const CACHE_TTL = 30 * 60 * 1000; // 榜单 30 分钟内不重复请求

interface CacheEntry<T> {
  at: number;
  data: T;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.at > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* 存储满时忽略 */
  }
}

/** 统一取 JSON：原生走 CapacitorHttp（绕 CORS），Web 走 fetch */
async function getJson(url: string): Promise<any> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url, headers: DOUBAN_HEADERS });
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  }
  const r = await fetch(url, { headers: DOUBAN_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/**
 * 海报尺寸处理。
 * 实测（2026-09-22）：豆瓣直接返回的 m_ratio_poster 就是 540×759 / 约 73KB，
 * 卡片用完全够、也不费流量，所以**原样使用**即可。
 * 坑：不要想当然地把路径改成 w300 —— 该路径在豆瓣不存在，会返回 404 导致整片海报裂图。
 */
function toThumb(url: string): string {
  return url || '';
}

/**
 * 不同榜单返回的字段名并不一致，这里统一兼容：
 *  - 海报：cover.url（正在热映）/ cover_url（Top250）/ pic.large | pic.normal
 *  - 副标题：card_subtitle 最全，格式为「年份 / 地区 / 类型 / 导演 / 演员」
 */
function mapItem(raw: any, type: 'movie' | 'series'): DoubanItem {
  const poster = raw?.cover?.url || raw?.cover_url || raw?.pic?.large || raw?.pic?.normal || '';
  const subtitle: string = (raw?.card_subtitle || raw?.info || '').trim();
  const parts = subtitle
    .split('/')
    .map((s: string) => s.trim())
    .filter(Boolean);

  // card_subtitle 各字段顺序固定，用「首段是否为 4 位年份」判断偏移
  const hasYear = /^\d{4}$/.test(parts[0] || '');
  const region = (hasYear ? parts[1] : parts[0]) || '';
  const genreStr = (hasYear ? parts[2] : parts[1]) || '';

  let year = typeof raw?.year === 'number' ? raw.year : undefined;
  if (!year && hasYear) year = parseInt(parts[0], 10);

  return {
    id: String(raw?.id ?? raw?.title ?? Math.random()),
    title: raw?.title || '未知条目',
    poster: toThumb(poster),
    rating: typeof raw?.rating?.value === 'number' ? raw.rating.value : 0,
    year,
    genres: genreStr ? genreStr.split(/\s+/).filter(Boolean) : [],
    region,
    synopsis: (raw?.description || raw?.comment || '').trim(),
    url: raw?.url || '',
    type,
  };
}

export interface DoubanPage {
  total: number;
  items: DoubanItem[];
}

/**
 * 拉取一个榜单
 * @param key   subject_collection key
 * @param start 起始位置
 * @param count 每页数量
 */
export async function fetchDoubanList(
  key: string,
  start = 0,
  count = 20,
  type: 'movie' | 'series' = 'movie'
): Promise<DoubanPage> {
  const cacheKey = `${key}_${start}_${count}`;
  const cached = readCache<DoubanPage>(cacheKey);
  if (cached) return cached;

  const url =
    `https://m.douban.com/rexxar/api/v2/subject_collection/${key}/items` +
    `?start=${start}&count=${count}&items_only=1`;

  const data = await getJson(url);
  const raw = Array.isArray(data?.subject_collection_items) ? data.subject_collection_items : [];
  const page: DoubanPage = {
    total: typeof data?.total === 'number' ? data.total : raw.length,
    items: raw.map((it: any) => mapItem(it, type)),
  };
  if (page.items.length > 0) writeCache(cacheKey, page);
  return page;
}

/** 一次拉多个榜单（首页 shelf 用）。失败的那条直接跳过，不影响其它。 */
export async function fetchManyLists(
  lists: DoubanListDef[],
  count = 20
): Promise<Record<string, DoubanPage>> {
  const results = await Promise.allSettled(
    lists.map((l) => fetchDoubanList(l.key, 0, count, l.type))
  );
  const out: Record<string, DoubanPage> = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.items.length > 0) {
      out[lists[i].key] = r.value;
    }
  });
  return out;
}
