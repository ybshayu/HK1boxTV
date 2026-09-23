import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * 直播 EPG 节目单数据层（v1.6.0）
 *
 * 数据源：epg.51zmt.top 的 DIYP 标准接口（国内 IPTV 播放器通用）：
 *   http://epg.51zmt.top:8000/api/diyp/?ch=CCTV1&date=YYYY-MM-DD
 * 返回 JSON：{ channel_name, date, epg_data: [{ start: "HH:MM", end: "HH:MM", title }] }
 *
 * 注意：
 *  1) 该接口无 CORS 头 → 原生环境必须走 CapacitorHttp（同豆瓣接口的处理）。
 *  2) 免费接口会在标题尾部追加「 --免费使用」广告后缀 → 展示前剥掉。
 *  3) 免费接口请节制调用：按 频道+日期 做 localStorage 缓存（2 小时 TTL），
 *     且只在播放器打开时按需拉取，绝不在直播列表里给每张卡都拉一遍。
 */

export interface EpgProgramme {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  title: string;
}

export interface EpgNow {
  current: EpgProgramme | null;
  next: EpgProgramme | null;
  /** 当前节目播放进度 0-1（跨天节目按次日时间算） */
  progress: number;
}

const EPG_BASE = 'http://epg.51zmt.top:8000/api/diyp/';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 小时

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
};

/** 剥掉免费接口的广告尾巴 */
const cleanTitle = (raw: string): string =>
  raw.replace(/\s*--+\s*免费使用\s*$/, '').trim();

/**
 * 频道名规范化（与 App.tsx 的换源分组保持同一套规则）：
 * 去空格/方括号标记/标点/「频道」后缀并大写。
 * CCTV-1综合 / CCTV1 / cctv1 [HD] → CCTV1综合
 */
export function normalizeEpgChannelName(raw: string): string {
  let n = raw
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    .replace(/[\s·・()（）\-—_/]+/g, '');
  n = n.replace(/频道$/, '');
  return n.toUpperCase();
}

export function todayStr(now = new Date()): string {
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 读缓存（带 TTL） */
function readCache(ch: string, date: string): EpgProgramme[] | null {
  try {
    const raw = localStorage.getItem(`hk1_epg_${ch}_${date}`);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { t: number; list: EpgProgramme[] };
    if (!obj || !Array.isArray(obj.list)) return null;
    if (Date.now() - obj.t > CACHE_TTL_MS) return null;
    return obj.list;
  } catch {
    return null;
  }
}

function writeCache(ch: string, date: string, list: EpgProgramme[]): void {
  try {
    localStorage.setItem(`hk1_epg_${ch}_${date}`, JSON.stringify({ t: Date.now(), list }));
  } catch {
    /* 存储满时静默放弃 */
  }
}

async function fetchEpgOnce(ch: string, date: string): Promise<EpgProgramme[]> {
  const url = `${EPG_BASE}?ch=${encodeURIComponent(ch)}&date=${date}`;
  let data: any;
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({ url, readTimeout: 10000, connectTimeout: 10000 });
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  } else {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
  const rows = Array.isArray(data?.epg_data) ? data.epg_data : [];
  return rows
    .map((r: any) => ({
      start: String(r.start || ''),
      end: String(r.end || ''),
      title: cleanTitle(String(r.title || '')),
    }))
    .filter((p: EpgProgramme) => /^\d{1,2}:\d{2}$/.test(p.start) && p.title);
}

/**
 * 拉取某频道「今天」的节目单。
 * 先查缓存；未命中时用规范化频道名请求，失败再用原始名兜底一次。
 * 任何失败都返回空数组（UI 显示「暂无节目单」，不影响播放）。
 */
export async function fetchEpg(channelName: string): Promise<EpgProgramme[]> {
  const date = todayStr();
  const norm = normalizeEpgChannelName(channelName);
  const cached = readCache(norm, date);
  if (cached) return cached;
  for (const candidate of [norm, channelName]) {
    if (!candidate) continue;
    try {
      const list = await fetchEpgOnce(candidate, date);
      if (list.length > 0) {
        writeCache(norm, date, list);
        return list;
      }
    } catch {
      /* 换下一个候选名 / 最终返回空 */
    }
  }
  return [];
}

/** 从节目单里算出「正在播 / 接下来」与当前节目进度 */
export function resolveNowNext(list: EpgProgramme[], now = new Date()): EpgNow | null {
  if (!list || list.length === 0) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const s = toMinutes(p.start);
    let e = toMinutes(p.end);
    if (e <= s) e += 24 * 60; // 跨零点节目
    if (nowMin >= s && nowMin < e) {
      return {
        current: p,
        next: list[i + 1] || null,
        progress: Math.max(0, Math.min(1, (nowMin - s) / (e - s))),
      };
    }
  }
  // 没找到进行中的节目：第一条晚于当前时间的当作「接下来」
  const next = list.find((p) => toMinutes(p.start) > nowMin) || null;
  return { current: null, next, progress: 0 };
}
