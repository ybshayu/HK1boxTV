import { CustomVideoSource } from '../types';
import { BUILTIN_SOURCE, ONLINE_SOURCE } from '../services/iptv';

/**
 * 视频源已改为「真实源」：
 * - ONLINE_SOURCE  ：启动时在线拉取 iptv-org 中国频道列表（含央视/卫视/地方台）
 * - BUILTIN_SOURCE ：内置实测可直连的国内流，作为断网或在线源失效时的兜底
 *
 * 两者都会在 App 启动后被真实解析，不再是写死的演示数据。
 */
export const initialVideoSources: CustomVideoSource[] = [ONLINE_SOURCE, BUILTIN_SOURCE];
