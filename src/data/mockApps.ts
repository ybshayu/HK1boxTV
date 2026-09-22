import { TVApp, StorageInfo } from '../types';

export const initialTVApps: TVApp[] = [
  {
    id: 'app-smarttube',
    name: 'SmartTube Next',
    packageName: 'com.teamsmart.videomanager.tv',
    icon: 'tv',
    sizeMB: 38.5,
    version: 'v22.46',
    category: 'media',
  },
  {
    id: 'app-kodi',
    name: 'Kodi Media Center',
    packageName: 'org.xbmc.kodi',
    icon: 'film',
    sizeMB: 124.0,
    version: 'v21.1 Omega',
    category: 'media',
  },
  {
    id: 'app-emby',
    name: 'Emby for Android TV',
    packageName: 'com.mb.androidtv',
    icon: 'server',
    sizeMB: 65.2,
    version: 'v2.1.18g',
    category: 'media',
  },
  {
    id: 'app-bilibili',
    name: '云视听小电视 (Bilibili)',
    packageName: 'com.bilibili.tv',
    icon: 'play-circle',
    sizeMB: 82.4,
    version: 'v1.6.8',
    category: 'media',
  },
  {
    id: 'app-mxplayer',
    name: 'MX Player Pro (HW+)',
    packageName: 'com.mxtech.videoplayer.pro',
    icon: 'video',
    sizeMB: 48.0,
    version: 'v1.78.6',
    category: 'media',
  },
  {
    id: 'app-filemanager',
    name: 'X-plore 文件管理器',
    packageName: 'com.lonelycatgames.Xplore',
    icon: 'folder',
    sizeMB: 28.6,
    version: 'v4.38',
    category: 'tools',
  },
  {
    id: 'app-retroarch',
    name: 'RetroArch 游戏模拟器',
    packageName: 'com.retroarch.aarch64',
    icon: 'gamepad-2',
    sizeMB: 210.0,
    version: 'v1.18.0',
    category: 'games',
  },
  {
    id: 'app-settings',
    name: 'Android TV 原生系统设置',
    packageName: 'com.android.tv.settings',
    icon: 'settings',
    sizeMB: 15.0,
    version: '9.0.0',
    category: 'system',
    isSystem: true,
  },
];

export const defaultStorageInfo: StorageInfo = {
  totalMB: 64 * 1024, // 65,536 MB (64GB eMMC)
  systemMB: 14200,    // 14.2 GB Android TV OS & Recovery
  appsMB: 12850,      // Installed Apps & Runtime
  cacheMB: 4850,      // Video chunks, decoded posters, temp streams
  freeMB: 33636,      // Remaining free storage
};
