import { CustomVideoSource } from '../types';

// 国内高速直连 CDN 流
const DOMESTIC_CDN_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const DOMESTIC_CDN_MP4 = 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4';
const DOMESTIC_CDN_HLS_2 = 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/hls/xgplayer-demo.m3u8';

export const initialVideoSources: CustomVideoSource[] = [
  {
    id: 'src-iptv-domestic-ipv6',
    name: '央视与卫视超高清直播源 (国内 IPv6/IPv4 秒开)',
    type: 'm3u',
    url: 'https://live.fanmingming.com/tv/m3u/ipv6.m3u',
    channelCount: 86,
    status: 'online',
    lastUpdated: '2026-09-21',
    channels: [
      { id: 'cctv1-hd', name: 'CCTV-1 综合 4K 超高清', group: '央视频道', streamUrl: DOMESTIC_CDN_HLS },
      { id: 'cctv4k-uhd', name: 'CCTV-4K 广播超高清频道', group: '央视频道', streamUrl: DOMESTIC_CDN_HLS_2 },
      { id: 'cctv5-hd', name: 'CCTV-5+ 体育赛事高清', group: '央视频道', streamUrl: DOMESTIC_CDN_MP4 },
      { id: 'cctv6-hd', name: 'CCTV-6 电影频道 1080P', group: '央视频道', streamUrl: DOMESTIC_CDN_HLS },
      { id: 'cctv9-hd', name: 'CCTV-9 纪录片频道', group: '央视频道', streamUrl: DOMESTIC_CDN_MP4 },
      { id: 'zj-tv-hd', name: '浙江卫视 HD (国内 CDN)', group: '卫视频道', streamUrl: DOMESTIC_CDN_HLS_2 },
      { id: 'hn-tv-hd', name: '湖南卫视 HD (国内 CDN)', group: '卫视频道', streamUrl: DOMESTIC_CDN_HLS },
      { id: 'df-tv-hd', name: '东方卫视 4K 超高清', group: '卫视频道', streamUrl: DOMESTIC_CDN_MP4 },
    ]
  },
  {
    id: 'src-tvbox-multi',
    name: 'TVBox / 影视仓国内多仓聚合点播接口 (饭太硬/肥猫加速源)',
    type: 'vod_json',
    url: 'http://饭太硬.top/tv',
    channelCount: 320,
    status: 'online',
    lastUpdated: '2026-09-21',
    channels: [
      { id: 'vod-fan-4k', name: '4K 极速蓝光专线 (国内多节点分流)', group: 'TVBox聚合', streamUrl: DOMESTIC_CDN_HLS },
      { id: 'vod-quark-line', name: '夸克网盘原画专线 (免代理直链)', group: 'TVBox聚合', streamUrl: DOMESTIC_CDN_MP4 },
      { id: 'vod-ali-line', name: '阿里云盘 Open 接口 (秒开 4K 60FPS)', group: 'TVBox聚合', streamUrl: DOMESTIC_CDN_HLS_2 },
    ]
  },
  {
    id: 'src-webdav-nas',
    name: '家庭局域网 NAS / AList 挂载 (阿里云盘 / 115 / 夸克)',
    type: 'webdav',
    url: 'http://192.168.1.100:5244/dav/Media',
    channelCount: 154,
    status: 'online',
    lastUpdated: '2026-09-21',
    channels: [
      { id: 'nas-interstellar', name: '星际穿越.2014.UHD.BluRay.2160p.TrueHD.Atmos.mkv', group: 'NAS电影', streamUrl: DOMESTIC_CDN_MP4 },
      { id: 'nas-dune2', name: '沙丘2.2024.IMAX.2160p.DV.HDR10+.mkv', group: 'NAS电影', streamUrl: DOMESTIC_CDN_HLS },
      { id: 'nas-three-body', name: '三体.2023.4K.HDR.S01E01.mkv', group: 'NAS剧集', streamUrl: DOMESTIC_CDN_HLS_2 }
    ]
  },
  {
    id: 'src-douban-meta',
    name: '豆瓣电影海报墙与影视元数据引擎 (Douban API 镜像)',
    type: 'direct_stream',
    url: 'https://movie.douban.com/chart',
    channelCount: 250,
    status: 'online',
    lastUpdated: '2026-09-21',
    channels: [
      { id: 'meta-db-top250', name: '豆瓣电影 Top250 自动刮削', group: '元数据', streamUrl: DOMESTIC_CDN_HLS },
      { id: 'meta-db-hot', name: '豆瓣院线正在热映与新片榜', group: '元数据', streamUrl: DOMESTIC_CDN_MP4 },
    ]
  }
];
