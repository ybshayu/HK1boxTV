import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Tv,
  Film, 
  Tv2, 
  Radio, 
  Grid, 
  Bookmark, 
  Search, 
  Settings, 
  Wifi, 
  Sparkles,
  Bell
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';

interface NavigationHeaderProps {
  currentTab: number;
  onSelectTab: (tabIndex: number) => void;
  focusedId: string;
  language: SupportedLanguage;
  hasUpdateNotification?: boolean;
  onOpenUpdateModal?: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentTab,
  onSelectTab,
  focusedId,
  language,
  hasUpdateNotification,
  onOpenUpdateModal,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const t = translations[language];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 0, label: t['nav.home'], icon: Flame },
    { id: 1, label: t['nav.live'], icon: Tv, isLive: true },
    { id: 2, label: t['nav.movies'], icon: Film },
    { id: 3, label: t['nav.series'], icon: Tv2 },
    { id: 4, label: t['nav.sources'], icon: Radio },
    { id: 5, label: t['nav.apps'], icon: Grid },
    { id: 6, label: t['nav.favorites'], icon: Bookmark },
    { id: 7, label: t['nav.search'], icon: Search },
    { id: 8, label: t['nav.settings'], icon: Settings },
  ];

  return (
    <header className="relative z-30 flex items-center justify-between px-8 py-4 transition-all duration-300">
      {/* Brand logo & TV OS Tag */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-base text-white/95">HK1 TV</span>
            <span className="text-[10px] uppercase font-semibold bg-white/10 text-sky-400 px-1.5 py-0.5 rounded border border-white/10">S905X3 60Hz</span>
          </div>
        </div>
      </div>

      {/* Navigation Pills (Apple TV style sliding bar) */}
      <nav className="flex items-center bg-white/5 p-1.5 rounded-full border border-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isFocused = focusedId === `nav-tab-${item.id}`;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer tv-focusable ${
                isFocused 
                  ? 'bg-white text-black shadow-lg shadow-white/20 scale-105 font-semibold ring-2 ring-sky-400' 
                  : isActive 
                    ? 'bg-white/20 text-white shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isFocused ? 'text-black' : isActive ? (item.isLive ? 'text-rose-400' : 'text-sky-400') : 'text-white/60'}`} />
              <span className="whitespace-nowrap">{item.label}</span>
              {item.isLive && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
              {item.id === 8 && hasUpdateNotification && (
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-2" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right TV status & Clock */}
      <div className="flex items-center gap-4 text-xs text-white/70">
        {hasUpdateNotification && onOpenUpdateModal && (
          <button
            id="nav-ota-update-badge-btn"
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition text-[11px] cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>v2.5.0 OTA</span>
          </button>
        )}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono text-white/80">4K HDR</span>
        </div>
        <span className="font-mono text-sm font-semibold text-white/90 pl-1">{timeStr}</span>
      </div>
    </header>
  );
};
