import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  Clapperboard,
  Film,
  Home,
  LayoutGrid,
  Layers,
  Search,
  Settings,
  Tv,
  X,
} from 'lucide-react';

interface MobileTabBarProps {
  currentTab: number;
  onSelectTab: (tabIndex: number) => void;
  /** v1.6.0：BACK 键先关「更多」抽屉，返回 true 表示已消费 */
  backRef?: React.MutableRefObject<(() => boolean) | null>;
}

/** 底部常驻的 4 个主入口 */
const PRIMARY = [
  { id: 0, label: '精选', icon: Home },
  { id: 1, label: '直播', icon: Tv },
  { id: 2, label: '电影', icon: Film },
  { id: 3, label: '剧集', icon: Clapperboard },
];

/** 其余入口收进「更多」抽屉 */
const MORE_ITEMS = [
  { id: 4, label: '自定义源', icon: Layers, desc: '添加自己的直播点播源' },
  { id: 5, label: '应用库', icon: LayoutGrid, desc: '管理设备已安装应用' },
  { id: 6, label: '我的收藏', icon: Bookmark, desc: '收藏的影片与频道' },
  { id: 7, label: '全局搜索', icon: Search, desc: '搜索影片、频道、应用' },
  { id: 8, label: '系统设置', icon: Settings, desc: '语言、主题、性能模式' },
];

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentTab, onSelectTab, backRef }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = MORE_ITEMS.some((it) => it.id === currentTab);

  // v1.6.0：BACK 键先关「更多」抽屉（手机端抽屉是本组件局部状态，父组件看不到）
  useEffect(() => {
    if (!backRef) return;
    backRef.current = () => {
      if (moreOpen) {
        setMoreOpen(false);
        return true;
      }
      return false;
    };
    return () => {
      backRef.current = null;
    };
  }, [moreOpen, backRef]);

  const handleSelect = (id: number) => {
    onSelectTab(id);
    setMoreOpen(false);
  };

  return (
    <>
      {/* 「更多」抽屉：手机上没有 hover，其余入口必须有个出口 */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="flex-1 bg-black/70"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="bg-neutral-900 border-t border-white/10 rounded-t-3xl px-4 pt-3 pb-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">更多功能</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-white/50 active:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {MORE_ITEMS.map((it) => {
                const Icon = it.icon;
                const active = currentTab === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => handleSelect(it.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                        : 'bg-white/5 border-white/10 text-white/80 active:bg-white/10'
                    }`}
                  >
                    <span className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{it.label}</span>
                      <span className="block text-[11px] text-white/40 truncate">{it.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 border-t border-white/10 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY.map((it) => {
          const Icon = it.icon;
          const active = currentTab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => handleSelect(it.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors cursor-pointer ${
                active ? 'text-sky-400' : 'text-white/50 active:text-white/80'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{it.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors cursor-pointer ${
            inMore || moreOpen ? 'text-sky-400' : 'text-white/50 active:text-white/80'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] leading-none">更多</span>
        </button>
      </nav>
    </>
  );
};
