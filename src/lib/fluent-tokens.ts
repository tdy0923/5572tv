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

export const spacing = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
} as const;

export const radius = {
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  // 药丸/胶囊用超大固定圆角；50% 只适用于 1:1 圆形，用在宽按钮上会变成两头尖的椭圆
  full: '9999px',
} as const;

export const shadow = {
  light: '0 1px 2px rgba(0,0,0,0.12), 0 0 2px rgba(0,0,0,0.08)',
  medium: '0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.06)',
  heavy: '0 4px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.06)',
  deep: '0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.06)',
  brand: '0 10px 40px rgba(244,194,77,0.25)',
} as const;

export const duration = {
  fast: '150ms',
  normal: '250ms',
  slow: '400ms',
} as const;

export const easing = {
  standard: 'cubic-bezier(0.33, 0, 0.67, 1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  accelerate: 'cubic-bezier(1, 0, 1, 1)',
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

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
