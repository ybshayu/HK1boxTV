import { MediaItem } from '../types';
import { DoubanItem } from '../services/douban';

/**
 * 把豆瓣条目映射成 App 内部统一的 MediaItem。
 *
 * 注意：豆瓣只提供元数据（海报/评分/简介），**不提供播放地址**。
 * 因此 streamUrl 留空，详情页会引导老爷去「自定义源」配置真正的播放源。
 */
export function doubanToMedia(item: DoubanItem, listName: string): MediaItem {
  const genres = item.genres.length > 0 ? item.genres : item.region ? [item.region] : ['影视'];

  return {
    id: `db-${item.id}`,
    title: item.title,
    type: item.type,
    category: item.type,
    poster: item.poster,
    // 豆瓣没有横版剧照，用同一张海报做背景，配合渐变遮罩观感可以接受
    backdrop: item.poster,
    year: item.year || 0,
    duration: item.region || '',
    rating: item.rating,
    genres,
    resolution: '1080P FHD',
    hdrType: 'SDR',
    audio: 'AAC 2.0',
    streamUrl: '',
    synopsis:
      item.synopsis ||
      `${item.title}${item.year ? `（${item.year}）` : ''}${item.region ? ` · ${item.region}` : ''}`,
    sourceName: `豆瓣 · ${listName}`,
  };
}

/** 批量映射 */
export function doubanListToMedia(items: DoubanItem[], listName: string): MediaItem[] {
  return items.map((it) => doubanToMedia(it, listName));
}
