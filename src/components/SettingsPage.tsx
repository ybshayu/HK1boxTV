import React, { useState } from 'react';
import { SupportedLanguage, DisplayTheme, StorageInfo } from '../types';
import { translations } from '../i18n/translations';
import { 
  Settings, 
  Globe, 
  Palette, 
  Cpu, 
  HardDrive, 
  MoveVertical, 
  Sparkles, 
  Info, 
  Check, 
  BellRing,
  Gauge
} from 'lucide-react';

interface SettingsPageProps {
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  theme: DisplayTheme;
  onChangeTheme: (theme: DisplayTheme) => void;
  isPerformanceMode: boolean;
  onTogglePerformanceMode: () => void;
  onOpenReorderModal: () => void;
  onOpenUpdateModal: () => void;
  storage: StorageInfo;
  onCleanCache: () => void;
  isCleaningCache: boolean;
  focusedId: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  language,
  onChangeLanguage,
  theme,
  onChangeTheme,
  isPerformanceMode,
  onTogglePerformanceMode,
  onOpenReorderModal,
  onOpenUpdateModal,
  storage,
  onCleanCache,
  isCleaningCache,
  focusedId,
}) => {
  const t = translations[language];

  return (
    <div className="px-10 py-6 max-w-7xl mx-auto text-left">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-sky-400" />
          <span>{t['settings.title']}</span>
        </h2>
        <p className="text-sm text-white/50 mt-1">{t['settings.general']}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Selection */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-3xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>{t['settings.language']}</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'zh-CN', label: '简体中文 (SC)' },
              { id: 'zh-TW', label: '繁體中文 (TC)' },
              { id: 'en-US', label: 'English (US)' },
              { id: 'ja-JP', label: '日本語 (JP)' },
            ].map((lang) => (
              <button
                key={lang.id}
                id={`setting-lang-${lang.id}`}
                onClick={() => onChangeLanguage(lang.id as SupportedLanguage)}
                className={`p-3.5 rounded-2xl text-xs font-semibold border flex items-center justify-between transition cursor-pointer tv-focusable ${
                  language === lang.id
                    ? 'bg-sky-500/20 text-white border-sky-400 ring-2 ring-sky-400/50'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <span>{lang.label}</span>
                {language === lang.id && <Check className="w-4 h-4 text-sky-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Night Mode & Visual Themes */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-3xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-sky-400" />
            <span>{t['settings.theme']}</span>
          </h3>

          <div className="space-y-2.5">
            {[
              { id: 'oled-black', title: t['settings.themeOled'], desc: '极致纯黑省电背景，高对比度护眼' },
              { id: 'dark-slate', title: t['settings.themeSlate'], desc: 'Apple TV 经典深灰色质感' },
              { id: 'ambient-glow', title: t['settings.themeAmbient'], desc: '海报主色调微光流转，沉浸观影' },
            ].map((th) => (
              <button
                key={th.id}
                id={`setting-theme-${th.id}`}
                onClick={() => onChangeTheme(th.id as DisplayTheme)}
                className={`w-full p-3.5 rounded-2xl text-left border flex items-center justify-between transition cursor-pointer tv-focusable ${
                  theme === th.id
                    ? 'bg-sky-500/20 text-white border-sky-400 ring-2 ring-sky-400/50'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white">{th.title}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{th.desc}</div>
                </div>
                {theme === th.id && <Check className="w-4 h-4 text-sky-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* 60FPS Performance Mode & Channel Reordering */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-3xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 flex items-center gap-2 mb-4">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>电视盒子性能与布局</span>
          </h3>

          <div className="space-y-4">
            {/* 60FPS mode switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">{t['settings.performance']}</div>
                <div className="text-[11px] text-white/40 mt-0.5">硬解加速，降低过渡负载，保持极速响应</div>
              </div>
              <button
                id="btn-toggle-60fps"
                onClick={onTogglePerformanceMode}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isPerformanceMode ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    isPerformanceMode ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Custom Channel Sort Button */}
            <button
              id="btn-open-channel-sort"
              onClick={onOpenReorderModal}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-left transition cursor-pointer tv-focusable"
            >
              <div className="flex items-center gap-2.5">
                <MoveVertical className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-xs font-semibold text-white">{t['settings.channelSort']}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{t['settings.channelSortDesc']}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-sky-400">调整 &gt;</span>
            </button>
          </div>
        </div>

        {/* HK1 Box Hardware Specs */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>{t['settings.systemInfo']}</span>
            </h3>

            <button
              id="btn-check-update-action"
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>检查系统更新</span>
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono text-white/70 bg-black/40 p-4 rounded-2xl border border-white/5">
            <div className="text-white/90">{t['settings.soc']}</div>
            <div>{t['settings.gpu']}</div>
            <div>{t['settings.ram']}</div>
            <div>{t['settings.rom']}</div>
            <div className="text-emerald-400">{t['settings.os']}</div>
          </div>
        </div>

        {/* Domestic Video Source & Douban Metadata Architecture */}
        <div className="md:col-span-2 bg-neutral-900/70 border border-white/10 rounded-3xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/70 flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>🇨🇳 国内使用环境适配架构说明（免代理 / 零死链）</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="font-bold text-amber-400 mb-1">1. 影视元数据 (海报/简介/评分)</div>
              <p className="text-white/70 leading-relaxed">
                全面对接<strong>豆瓣电影 (Douban API)</strong> 实时热映榜、华语剧集榜与 Top250 榜单，海报与剧照通过国内反代高可用镜像直出，国内无需科学上网即可秒加载高清封面。
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="font-bold text-sky-400 mb-1">2. 点播聚合 (TVBox 多仓 / 网盘)</div>
              <p className="text-white/70 leading-relaxed">
                兼容国内 TVBox / 猫影视开源标准接口（如饭太硬、肥猫国内加速源），并支持通过 <strong>AList / WebDAV</strong> 直接直连阿里云盘、夸克、115网盘，实现 4K 杜比视界原画硬解。
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="font-bold text-emerald-400 mb-1">3. 电视直播 (国内运营商直连)</div>
              <p className="text-white/70 leading-relaxed">
                预置国内<strong>三大运营商 (电信/联通/移动) IPv6 央视与卫视超高清直播源</strong>，采用纯净国内广播级 CDN，在电视盒子上真正实现“换台秒开、无缓冲”。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
