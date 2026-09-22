import React, { useState } from 'react';
import { SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';
import { Sparkles, CheckCircle2, DownloadCloud, X } from 'lucide-react';

interface UpdatePromptModalProps {
  onClose: () => void;
  language: SupportedLanguage;
}

export const UpdatePromptModal: React.FC<UpdatePromptModalProps> = ({ onClose, language }) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const t = translations[language];

  const handleStartUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      setIsCompleted(true);
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">{t['update.modalTitle']}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isCompleted ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-white">升级包已就绪！</h4>
            <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
              {t['update.updated']}
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg cursor-pointer"
              >
                知道了
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-xs text-white/80 leading-relaxed mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
              <p>{t['update.changelog1']}</p>
              <p>{t['update.changelog2']}</p>
              <p>{t['update.changelog3']}</p>
            </div>

            {isUpdating && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-sky-400">
                  <span>{t['update.updating']}</span>
                  <span>78%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 animate-pulse w-3/4" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
              >
                {t['update.btnLater']}
              </button>
              <button
                type="button"
                onClick={handleStartUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>{t['update.btnUpdate']}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
