import React from 'react';
import { Home, Tv, Film, Clapperboard, LayoutGrid } from 'lucide-react';

interface MobileTabBarProps {
  currentTab: number;
  onSelectTab: (tabIndex: number) => void;
}

/** 手机端底部导航：固定 5 个入口，其余功能从「更多」进入 */
const PRIMARY = [
  { id: 0, label: '精选', icon: Home },
  { id: 1, label: '直播', icon: Tv },
  { id: 2, label: '电影', icon: Film },
  { id: 3, label: '剧集', icon: Clapperboard },
  { id: 4, label: '更多', icon: LayoutGrid },
];

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentTab, onSelectTab }) => {
  return (
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
            onClick={() => onSelectTab(it.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors cursor-pointer ${
              active ? 'text-sky-400' : 'text-white/50 active:text-white/80'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-none">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
