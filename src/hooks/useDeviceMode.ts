import { useEffect, useState } from 'react';

export type DeviceMode = 'tv' | 'mobile';

const OVERRIDE_KEY = 'hk1_device_mode';

/**
 * 自动判断使用场景：
 *  - mobile：触屏手机（竖屏 / 小屏 + 支持触摸）→ 用触摸布局与手势
 *  - tv    ：遥控器大屏（横屏大屏 / 无触摸）→ 保持十字键导航布局
 *
 * 也支持在 localStorage 里手动锁定（hk1_device_mode = 'tv' | 'mobile' | 'auto'）。
 */
function detect(): DeviceMode {
  if (typeof window === 'undefined') return 'tv';

  try {
    const override = localStorage.getItem(OVERRIDE_KEY);
    if (override === 'tv' || override === 'mobile') return override;
  } catch {
    /* 忽略 */
  }

  const hasTouch =
    'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const minSide = Math.min(w, h);

  // 竖屏 + 触摸 = 手机（盒子/电视都是横屏）
  if (hasTouch && h > w) return 'mobile';

  // 触摸屏但尺寸很小（手机横屏）= 手机
  if (hasTouch && minSide < 600) return 'mobile';

  return 'tv';
}

export function useDeviceMode(): {
  mode: DeviceMode;
  isMobile: boolean;
  /** 手动锁定模式（auto 表示恢复自动判断） */
  setMode: (mode: DeviceMode | 'auto') => void;
} {
  const [mode, setModeState] = useState<DeviceMode>(detect);

  useEffect(() => {
    const onResize = () => setModeState(detect());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const setMode = (m: DeviceMode | 'auto') => {
    try {
      if (m === 'auto') localStorage.removeItem(OVERRIDE_KEY);
      else localStorage.setItem(OVERRIDE_KEY, m);
    } catch {
      /* 忽略 */
    }
    setModeState(detect());
  };

  return { mode, isMobile: mode === 'mobile', setMode };
}
