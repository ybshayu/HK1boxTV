import React, { useState } from 'react';
import { CustomVideoSource, SupportedLanguage, MediaItem } from '../types';
import { translations } from '../i18n/translations';
import { fetchM3U, toSource } from '../services/iptv';
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
  const [testMessage, setTestMessage] = useState<string>('');

  const t = translations[language];

  const selectedSource = sources.find((s) => s.id === selectedSourceId) || sources[0];

  // 真实测试：拉取并解析该地址，能解析出频道才算通（不再是假的 setTimeout）
  const handleTestConnection = async () => {
    if (!newUrl) return;
    setIsTesting(true);
    setTestResult(null);
    setTestMessage('');
    const started = Date.now();
    try {
      const channels = await fetchM3U(newUrl, 12000);
      if (channels.length === 0) throw new Error('empty');
      setTestResult('success');
      setTestMessage(`解析成功：${channels.length} 个频道（${Date.now() - started}ms）`);
    } catch {
      setTestResult('failed');
      setTestMessage('连接失败：无法拉取或解析该地址');
    } finally {
      setIsTesting(false);
    }
  };

  // 真实保存：解析出频道后才入库，避免存下一个空壳源
  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;

    setIsTesting(true);
    setTestResult(null);
    setTestMessage('');
    try {
      const channels = await fetchM3U(newUrl, 15000);
      if (channels.length === 0) throw new Error('empty');
      const src = toSource(`src-${Date.now()}`, newName, newUrl, channels, newType);
      onAddSource(src);
      setSelectedSourceId(src.id);
      setIsAddModalOpen(false);
      setNewName('');
      setNewUrl('');
      setTestResult(null);
      setTestMessage('');
    } catch {
      setTestResult('failed');
      setTestMessage('保存失败：该地址解析不出频道，请检查链接是否可用');
    } finally {
      setIsTesting(false);
    }
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
                    <span
                      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                        src.status === 'online'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : src.status === 'checking'
                          ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          src.status === 'online'
                            ? 'bg-emerald-400'
                            : src.status === 'checking'
                            ? 'bg-amber-300'
                            : 'bg-rose-400'
                        }`}
                      />
                      {src.status === 'online' ? '在线' : src.status === 'checking' ? '检查中' : '离线'}
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
                <div className="text-[11px] font-semibold text-sky-400 mb-1.5">🇨🇳 实测可用源一键填入：</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('iptv-org 中国频道');
                      setNewType('m3u');
                      setNewUrl('https://iptv-org.github.io/iptv/countries/cn.m3u');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] border border-white/10 cursor-pointer"
                  >
                    iptv-org 中国源
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('iptv-org 全球频道');
                      setNewType('m3u');
                      setNewUrl('https://iptv-org.github.io/iptv/index.m3u');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] border border-white/10 cursor-pointer"
                  >
                    iptv-org 全球源
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('央视官方 CCTV+ 源');
                      setNewType('m3u');
                      setNewUrl('https://cd-live-stream.news.cctvplus.com/live/smil:CHANNEL1.smil/playlist.m3u8');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-[11px] border border-white/10 cursor-pointer"
                  >
                    央视官方 m3u8
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
                    <span>{testMessage}</span>
                  </span>
                )}
                {testResult === 'failed' && (
                  <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                    <XCircle className="w-4 h-4" />
                    <span>{testMessage}</span>
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
