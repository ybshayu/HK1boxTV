import React from 'react';
import { ChannelShelfConfig, SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { ArrowUp, ArrowDown, Check, Eye, EyeOff, X, MoveVertical } from 'lucide-react';

interface ChannelReorderModalProps {
  shelves: ChannelShelfConfig[];
  onUpdateShelves: (shelves: ChannelShelfConfig[]) => void;
  onClose: () => void;
  language: SupportedLanguage;
}

export const ChannelReorderModal: React.FC<ChannelReorderModalProps> = ({
  shelves,
  onUpdateShelves,
  onClose,
  language,
}) => {
  const t = translations[language];

  const moveShelf = (index: number, direction: 'up' | 'down') => {
    const newShelves = [...shelves];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newShelves.length) return;

    const temp = newShelves[index];
    newShelves[index] = newShelves[targetIdx];
    newShelves[targetIdx] = temp;

    // update order numbers
    newShelves.forEach((s, idx) => {
      s.order = idx;
    });

    onUpdateShelves(newShelves);
  };

  const toggleVisibility = (index: number) => {
    const newShelves = [...shelves];
    newShelves[index].isVisible = !newShelves[index].isVisible;
    onUpdateShelves(newShelves);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <MoveVertical className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white">{t['settings.channelSort']}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-white/50 mb-4">{t['settings.channelSortDesc']}</p>

        {/* Shelves list */}
        <div className="space-y-2.5 max-h-96 overflow-y-auto no-scrollbar pr-1">
          {shelves.map((shelf, idx) => (
            <div
              key={shelf.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 text-white/70 text-xs font-mono flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className={`text-sm font-semibold ${shelf.isVisible ? 'text-white' : 'text-white/40 line-through'}`}>
                  {t[shelf.titleKey] || shelf.titleKey}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Visibility Toggle */}
                <button
                  type="button"
                  onClick={() => toggleVisibility(idx)}
                  className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                    shelf.isVisible ? 'text-sky-400 hover:bg-sky-500/10' : 'text-white/30 hover:bg-white/10'
                  }`}
                  title="切换显示状态"
                >
                  {shelf.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Move Up */}
                <button
                  type="button"
                  onClick={() => moveShelf(idx, 'up')}
                  disabled={idx === 0}
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  title="上移"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  onClick={() => moveShelf(idx, 'down')}
                  disabled={idx === shelves.length - 1}
                  className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  title="下移"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg cursor-pointer"
          >
            完成排序
          </button>
        </div>
      </div>
    </div>
  );
};
