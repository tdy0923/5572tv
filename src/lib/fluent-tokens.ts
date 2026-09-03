/**
 * Fluent2 设计 token（本站 global 层）。
 *
 * 取值与命名向官方 @fluentui/react-theme 看齐
 *（https://fluent2.microsoft.design/design-tokens，global/* 原始值）：
 *  - 官方两层结构：global 存原始值 → alias 表语义。本文件即 global 层；
 *    品牌金（#f4c24d 系）相当于官方 createLightTheme 时的品牌覆盖。
 *  - 圆角、时长、曲线、间距、字重、阴影数值为官方原值；
 *    历史遗留键（radius.sm/md/lg…、shadow.light…）因已有引用予以保留，
 *    取值均落在官方刻度上，仅标签与官方不同。
 */

export const brandColor = {
  gold: '#f4c24d',
  goldDark: '#d89c18',
  goldLight: '#ffd56f',
} as const;

export const neutralColor = {
  bgBlack: '#0a0a0a',
  surfaceBlack: '#111111',
  borderGray: '#333333',
  textWhite: '#ffffff',
  textGray: '#9ca3af',
} as const;

export const functionalColor = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

// 间距：官方 spacings 原值（xxs 2 / xs 4 / sNudge 6 / s 8 / mNudge 10 /
// m 12 / l 16 / xl 20 / xxl 24 / xxxl 32）
export const spacing = {
  xxs: '2px',
  xs: '4px',
  sNudge: '6px',
  s: '8px',
  mNudge: '10px',
  m: '12px',
  l: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
} as const;

export const radius = {
  none: '0',
  sm: '2px', // = 官方 small
  md: '4px', // = 官方 medium
  large: '6px', // 官方 large（本站历史 lg 取 8px，见下）
  lg: '8px', // = 官方 xlarge（历史键，保留）
  xl: '12px', // = 官方 2xlarge（历史键，保留）
  '2xl': '16px', // = 官方 3xlarge（历史键，保留）
  '3xl': '24px', // = 官方 4xlarge（历史键，保留）
  '5xl': '32px', // 官方 5xlarge
  '6xl': '40px', // 官方 6xlarge
  // 胶囊/圆形只用超大固定值：50% 写在宽元素上会变成两头尖的椭圆
  full: '9999px',
} as const;

export const shadow = {
  light: '0 1px 2px rgba(0,0,0,0.12), 0 0 2px rgba(0,0,0,0.08)',
  medium: '0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.06)',
  heavy: '0 4px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.06)',
  deep: '0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.06)',
  brand: '0 10px 40px rgba(244,194,77,0.25)',
  // Elevation（官方 webLight 原值，按 z 层选用）：
  // shadow2 内容底纹 / shadow4 指令条 / shadow8 卡片 /
  // shadow16 浮层 / shadow28 对话框 / shadow64 整屏遮罩
  shadow2: '0 1px 2px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
  shadow4: '0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
  shadow8: '0 4px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
  shadow16: '0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
  shadow28: '0 14px 28px rgba(0,0,0,0.24), 0 0 8px rgba(0,0,0,0.20)',
  shadow64: '0 32px 64px rgba(0,0,0,0.24), 0 0 8px rgba(0,0,0,0.20)',
} as const;

// 描边宽度：官方 strokeWidths 原值
export const strokeWidth = {
  thin: '1px',
  thick: '2px',
  thicker: '3px',
  thickest: '4px',
} as const;

export const duration = {
  ultraFast: '50ms',
  faster: '100ms',
  fast: '150ms',
  normal: '200ms',
  gentle: '250ms',
  slow: '300ms',
  slower: '400ms',
  ultraSlow: '500ms',
} as const;

export const easing = {
  // = 官方 curveEasyEase，默认首选
  standard: 'cubic-bezier(0.33, 0, 0.67, 1)',
  // = 官方 curveDecelerateMid（元素入场慎用，入场请用 decelerateMin）
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  // = 官方 curveAccelerateMid（元素退场）
  accelerate: 'cubic-bezier(1, 0, 1, 1)',
  // = 官方 curveDecelerateMin（入场/展开类动画）
  decelerateMin: 'cubic-bezier(0.33, 0, 0.1, 1)',
  // = 官方 curveAccelerateMin
  accelerateMin: 'cubic-bezier(0.8, 0, 0.78, 1)',
  // = 官方 curveEasyEaseMax（大位移过渡）
  easyEaseMax: 'cubic-bezier(0.8, 0, 0.2, 1)',
  // = 官方 curveLinear（进度/循环动画）
  linear: 'cubic-bezier(0, 0, 1, 1)',
  // 非官方：弹性强调，仅用于小幅反馈，勿用于布局动画
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

export const fontSize = {
  caption: '12px',
  body: '14px',
  bodyLg: '16px',
  h3: '18px',
  h2: '24px',
  h1: '48px',
} as const;

// 字阶：官方 fontSizes 原值（行高一一配对，见 lineHeightRamp）
export const fontSizeRamp = {
  base100: '10px',
  base200: '12px',
  base300: '14px',
  base400: '16px',
  base500: '20px',
  base600: '24px',
  hero700: '28px',
  hero800: '32px',
  hero900: '40px',
  hero1000: '68px',
} as const;

export const lineHeightRamp = {
  base100: '14px',
  base200: '16px',
  base300: '20px',
  base400: '22px',
  base500: '28px',
  base600: '32px',
  hero700: '36px',
  hero800: '40px',
  hero900: '52px',
  hero1000: '92px',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
