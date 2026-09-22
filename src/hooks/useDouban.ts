import { useEffect, useState, useCallback } from 'react';
import { DOUBAN_LISTS, DoubanPage, fetchDoubanList, fetchManyLists } from '../services/douban';

/** 首页只拉这些榜单（避免一次请求过多） */
const HOME_LIST_KEYS = [
  'movie_showing',
  'movie_real_time_hotest',
  'movie_top250',
  'movie_high_score',
  'tv_hot',
  'tv_domestic',
  'tv_american',
  'tv_animation',
  'tv_variety_show',
];

export interface UseDoubanResult {
  /** key -> 榜单数据 */
  lists: Record<string, DoubanPage>;
  loading: boolean;
  error: string | null;
  /** 重新拉取（下拉刷新用） */
  refresh: () => void;
  /** 按榜单 key 分页加载更多（滚动到底用） */
  loadMore: (key: string) => Promise<void>;
  /** 某榜单是否正在加载更多 */
  loadingMore: Record<string, boolean>;
}

export function useDouban(): UseDoubanResult {
  const [lists, setLists] = useState<Record<string, DoubanPage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const [reloadFlag, setReloadFlag] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const wanted = DOUBAN_LISTS.filter((l) => HOME_LIST_KEYS.includes(l.key));
    fetchManyLists(wanted, 20)
      .then((res) => {
        if (cancelled) return;
        setLists(res);
        if (Object.keys(res).length === 0) setError('豆瓣数据暂时拿不到，请检查网络');
      })
      .catch(() => {
        if (!cancelled) setError('豆瓣数据加载失败，请检查网络后下拉刷新');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadFlag]);

  const refresh = useCallback(() => setReloadFlag((n) => n + 1), []);

  const loadMore = useCallback(
    async (key: string) => {
      const cur = lists[key];
      if (!cur) return;
      if (cur.items.length >= cur.total) return; // 已到末尾
      setLoadingMore((m) => ({ ...m, [key]: true }));
      try {
        const def = DOUBAN_LISTS.find((l) => l.key === key);
        const next = await fetchDoubanList(key, cur.items.length, 20, def?.type || 'movie');
        setLists((prev) => {
          const base = prev[key];
          if (!base) return prev;
          // 去重后追加
          const seen = new Set(base.items.map((i) => i.id));
          const merged = [...base.items, ...next.items.filter((i) => !seen.has(i.id))];
          return { ...prev, [key]: { total: next.total || base.total, items: merged } };
        });
      } catch {
        /* 加载更多失败就静默，保持已有内容 */
      } finally {
        setLoadingMore((m) => ({ ...m, [key]: false }));
      }
    },
    [lists]
  );

  return { lists, loading, error, refresh, loadMore, loadingMore };
}
