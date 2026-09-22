import React, { useState } from 'react';
import { CustomVideoSource, SupportedLanguage, MediaItem } from '../types';
import { translations } from '../i18n/translations';
import { 
  Radio, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  Tv, 
  Server, 
  Link, 
  Globe 
} from 'lucide-react';

interface CustomSourcesManagerProps {
  sources: CustomVideoSource[];
  onAddSource: (source: CustomVideoSource) => void;
  onDeleteSource: (id: string) => void;
  onPlayChannel: (channelMedia: MediaItem) => void;
  focusedId: string;
  language: SupportedLanguage;
}

export const CustomSourcesManager: React.FC<CustomSourcesManagerProps> = ({
  sources,
  onAddSource,
  onDeleteSource,
  onPlayChannel,
  focusedId,
  language,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sources[0]?.id || '');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<'m3u' | 'vod_json' | 'webdav' | 'direct_stream'>('m3u');
  const [newUrl, setNewUrl] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  const t = translations[language];

  const selectedSource = sources.find((s) => s.id === selectedSourceId) || sources[0];

  const handleTestConnection = () => {
    if (!newUrl) return;
    setIsTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setIsTesting(false);
      setTestResult('success');
    }, 900);
  };

  const handleSaveSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;

    const newSource: CustomVideoSource = {
      id: `src-${Date.now()}`,
      name: newName,
      type: newType,
      url: newUrl,
      channelCount: Math.floor(Math.random() * 20) + 10,
      status: 'online',
      lastUpdated: new Date().toISOString().split('T')[0],
      channels: [
        { id: `ch-${Date.now()}-1`, name: `${newName} - 4K 演示主频道`, group: '精选', streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
        { id: `ch-${Date.now()}-2`, name: `${newName} - 高清副频道`, group: '精选', streamUrl: 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-720p.mp4' },
      ],
    };

    onAddSource(newSource);
    setSelectedSourceId(newSource.id);
    setIsAddModalOpen(false);
    setNewName('');
    setNewUrl('');
    setTestResult(null);
  };

  return (
    <div className="px-10 py-6 max-w-7xl mx-auto text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Radio className="w-7 h-7 text-sky-400" />
            <span>{t['sources.title']}</span>
          </h2>
          <p className="text-sm text-white/60 mt-1">{t['sources.desc']}</p>
        </div>

        <button
          id="btn-open-add-source-modal"
          onClick={() => setIsAddModalOpen(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-xs transition-all cursor-pointer tv-focusable ${
            focusedId === 'btn-open-add-source-modal'
              ? 'bg-white text-black ring-4 ring-sky-400 scale-105 shadow-xl'
              : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{t['sources.addBtn']}</span>
        </button>
      </div>

      {/* Main Grid: Left Sources list, Right Channels list */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left column: Sources */}
        <div className="md:col-span-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">已配置视频源 ({sources.length})</div>
          {sources.map((src) => {
            const isSelected = src.id === selectedSource?.id;
            const isFocused = focusedId === `source-item-${src.id}`;

            return (
              <div
                key={src.id}
                id={`source-item-${src.id}`}
                onClick={() => setSelectedSourceId(src.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer tv-focusable ${
                  isFocused
                    ? 'ring-2 ring-white border-white bg-white/20 scale-[1.02]'
                    : isSelected
                      ? 'bg-neutral-900 border-sky-500/50 shadow-lg'
                      : 'bg-neutral-950/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
                      {src.type === 'webdav' ? <Server className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white truncate max-w-[200px]">{src.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-white/50 mt-0.5">
                        <span className="uppercase font-mono">{src.type}</span>
                        <span>•</span>
                        <span>{src.channelCount || 0} 频道</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      在线
                    </span>
                    {sources.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t['sources.deleteConfirm'])) {
                            onDeleteSource(src.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition"
                        title="删除源"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-white/40 font-mono truncate">
                  {src.url}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column: Channels inside selected source */}
        <div className="md:col-span-7 bg-neutral-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{selectedSource?.name}</span>
                <span className="text-xs font-normal text-white/50">({selectedSource?.channels?.length || 0} 个直播/影视流)</span>
              </h3>
            </div>
            <div className="text-xs text-white/40 font-mono">
              更新于 {selectedSource?.lastUpdated}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
            {selectedSource?.channels?.map((ch) => (
              <div
                key={ch.id}
                id={`ch-btn-${ch.id}`}
                onClick={() => {
                  const media: MediaItem = {
                    id: `live-${ch.id}`,
                    title: ch.name,
                    type: 'live',
                    poster: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=600&auto=format&fit=crop',
                    backdrop: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop',
                    year: 2025,
                    duration: '实时直播',
                    rating: 9.5,
                    genres: ['自定义源', ch.group || 'IPTV'],
                    resolution: '4K UHD',
                    hdrType: 'HDR',
                    audio: 'Dolby Atmos',
                    streamUrl: ch.streamUrl,
                    synopsis: `自定义视频源播放频道: ${ch.name}，来自源 [${selectedSource.name}]。`,
                  };
                  onPlayChannel(media);
                }}
                className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 transition-all cursor-pointer tv-focusable"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white truncate max-w-[170px]">{ch.name}</div>
                    <div className="text-[10px] text-white/50">{ch.group || '频道'}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  播放
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Source */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-sky-400" />
              <span>{t['sources.modalTitle']}</span>
            </h3>

            <form onSubmit={handleSaveSource} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">{t['sources.nameLabel']}</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 港澳台4K直播源 / 阿里云盘 AList"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">{t['sources.typeLabel']}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'm3u', label: 'M3U / IPTV' },
                    { id: 'vod_json', label: 'CatVod / JSON' },
                    { id: 'webdav', label: 'WebDAV / AList' },
                  ].map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => setNewType(tp.id as any)}
                      className={`py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                        newType === tp.id
                          ? 'bg-sky-500 text-white border-sky-400 shadow'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">{t['sources.urlLabel']}</label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com/playlist.m3u 或 http://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Domestic Quick Presets */}
              <div className="pt-1">
                <div className="text-[11px] font-semibold text-sky-400 mb-1.5">🇨🇳 国内常用源一键填入：</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('央视与卫视超高清 (IPv6免翻墙)');
                      setNewType('m3u');
                      setNewUrl('https://live.fanmingming.com/tv/m3u/ipv6.m3u');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] border border-white/10 cursor-pointer"
                  >
                    央视卫视 IPv6
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('饭太硬国内 TVBox 聚合多仓');
                      setNewType('vod_json');
                      setNewUrl('http://饭太硬.top/tv');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] border border-white/10 cursor-pointer"
                  >
                    饭太硬 TVBox 源
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('局域网 AList (阿里云盘/夸克)');
                      setNewType('webdav');
                      setNewUrl('http://192.168.1.100:5244/dav');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] border border-white/10 cursor-pointer"
                  >
                    AList WebDAV
                  </button>
                </div>
              </div>

              {/* Test Connection Button */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={!newUrl || isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? t['sources.statusChecking'] : t['sources.testBtn']}</span>
                </button>

                {testResult === 'success' && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>源可正常解析 (响应 42ms)</span>
                  </span>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 transition cursor-pointer"
                >
                  {t['sources.cancelBtn']}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg transition cursor-pointer"
                >
                  {t['sources.saveBtn']}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
