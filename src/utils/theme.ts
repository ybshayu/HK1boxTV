/**
 * 轻量化视觉主题工具
 *
 * TV 盒子的 GPU（如 Mali-450）做全屏高斯模糊极其吃力，
 * 因此这里所有"氛围感"都改用 CSS 色相/渐变推导，零图片解码、零模糊合成。
 */

/** 由字符串推导稳定色相（0-359）：同一内容每次颜色一致 */
export function hashHue(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

/** 海报兜底渐变：图片未加载或加载失败时露出的背景，完全不依赖网络 */
export function posterGradient(id: string): string {
  const h = hashHue(id);
  return `linear-gradient(145deg, hsl(${h} 46% 28%) 0%, hsl(${(h + 45) % 360} 38% 12%) 100%)`;
}

/** 背景氛围底色（随当前焦点内容轻微变化，成本等同于一次纯色填充） */
export function ambientColor(id: string): string {
  return `hsl(${hashHue(id)} 42% 9%)`;
}
