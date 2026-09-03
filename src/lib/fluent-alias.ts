/**
 * Fluent2 alias 语义层（第二层 token）。
 *
 * 官方规则：组件只消费语义，不碰原始值；light/dark/高对比由语义映射解决。
 * 本站用 Tailwind `dark:` 类实现主题切换，因此 alias 以"语义 → 类名字符串/ token 引用"
 * 的形式存在。新增组件样式优先从这里取，禁止在组件里写散装色号。
 *
 * 命名对照官方 alias：surface* / text* / stroke* / brand* / danger*。
 */

import {
  brandColor,
  duration,
  easing,
  functionalColor,
  neutralColor,
  radius,
  shadow,
} from './fluent-tokens';

/** 容器表面：卡片 / 浮层 / 对话框 / 输入框 */
export const surface = {
  /** 普通卡片（z=8，用 shadow8） */
  card: {
    className:
      'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5',
    shadow: shadow.shadow8,
    radius: radius.xl,
  },
  /** 对话框（z=28，用 shadow28） */
  dialog: {
    className:
      'bg-white dark:bg-[#111111] border-gray-200 dark:border-white/10',
    shadow: shadow.shadow28,
    radius: radius.xl,
  },
  /** 毛玻璃卡片（z=8，用 shadow8） */
  glass: {
    className:
      'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 backdrop-blur',
    shadow: shadow.shadow8,
    radius: radius.xl,
  },
  /** 输入框 */
  field: {
    className: 'bg-white dark:bg-white/5 border-gray-300 dark:border-white/15',
    radius: radius.lg,
  },
  /** 悬浮菜单/浮层（z=16，用 shadow16） */
  flyout: {
    className:
      'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10',
    shadow: shadow.shadow16,
    radius: radius.lg,
  },
} as const;

/** 文字：主 / 次 / 禁用 / 品牌底上 */
export const text = {
  primary: 'text-gray-900 dark:text-white',
  secondary: 'text-gray-600 dark:text-gray-400',
  muted: 'text-[#9ca3af]',
  disabled: 'text-gray-400 dark:text-gray-600',
  onBrand: '#171717',
  onDark: '#ffffff',
} as const;

/** 描边：默认 / 输入框 / 焦点（2px，见全局 :focus-visible 基线） */
export const stroke = {
  def: 'border-gray-200 dark:border-white/10',
  field: 'border-gray-300 dark:border-white/15',
  focusRing: brandColor.gold,
} as const;

/** 品牌动作：主按钮三态（hover/pressed 只做明度变化，不换色相） */
export const brandAction = {
  bg: brandColor.gold,
  text: text.onBrand,
  shadow: shadow.medium,
  hoverFilter: 'brightness(1.06)',
  activeFilter: 'brightness(0.94)',
} as const;

/** 危险动作 */
export const dangerAction = {
  bg: functionalColor.error,
  text: neutralColor.textWhite,
} as const;

/** 动效：只过渡 transform/opacity/颜色三类，禁用 transition-all（性能） */
export const motion = {
  press: `transform ${duration.faster} ${easing.decelerateMin}`,
  fade: `opacity ${duration.fast} ${easing.standard}`,
  color: `background-color ${duration.fast} ${easing.standard}, border-color ${duration.fast} ${easing.standard}, color ${duration.fast} ${easing.standard}`,
  rise: `transform ${duration.normal} ${easing.decelerateMin}, box-shadow ${duration.normal} ${easing.standard}`,
} as const;
