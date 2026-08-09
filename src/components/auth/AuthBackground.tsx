'use client';

import { type MouseEvent } from 'react';

/**
 * 影视感登录背景 —— 明暗自适应，动静结合。
 *
 * 明色：清透电影感渐变（柔金 + 冷蓝，低饱和）+ 漂浮光斑 + 细网格 + 星尘
 * 暗色：深邃电影氛围（深蓝黑底 + 暖金黄光晕）+ 同套动效
 *
 * 任何位置都跟随站点明暗主题（`dark` class），鼠标交互光晕通过
 * 写入 --mx/--my 变量实现，零 Canvas 开销。全为装饰层，不挡表单。
 */
export function AuthBackground() {
  const grain =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E";

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const { left, top, width, height } = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - left) / width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - top) / height) * 100}%`);
  };

  return (
    <div
      aria-hidden
      onPointerMove={onMove}
      className='pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(70%_60%_at_12%_0%,rgba(244,194,77,0.13),transparent_55%),radial-gradient(60%_50%_at_90%_100%,rgba(59,130,246,0.12),transparent_60%),linear-gradient(180deg,#f4f6fa_0%,#eef1f8_100%)] dark:bg-[radial-gradient(65%_55%_at_15%_-5%,rgba(244,194,77,0.14),transparent_55%),radial-gradient(55%_50%_at_90%_105%,rgba(56,120,255,0.13),transparent_60%),linear-gradient(180deg,#080b14_0%,#06080f_55%,#05070d_100%)]'
    >
      {/* 极光 1（暖金）——明暗两态 */}
      <div className='absolute -left-[15%] top-[-12%] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(244,194,77,0.18),transparent_65%)] blur-[70px] dark:bg-[radial-gradient(circle_at_center,rgba(244,194,77,0.16),transparent_65%)] auth-aura aurora-a' />

      {/* 极光 2（冷蓝）——明暗两态 */}
      <div className='absolute -right-[15%] bottom-[-14%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_65%)] blur-[80px] dark:bg-[radial-gradient(circle_at_center,rgba(56,120,255,0.16),transparent_65%)] auth-aura aurora-b' />

      {/* 旋转对角光斑（明暗两态透明度） */}
      <div className='absolute left-1/2 top-1/2 h-[130vmax] w-[130vmax] -translate-x-1/2 -translate-y-1/2 auth-grid-whirl opacity-[0.12] dark:opacity-[0.18]' />

      {/* 交互光晕：跟随指针 */}
      <div
        className='absolute inset-0 opacity-70'
        style={{
          background:
            'radial-gradient(380px circle at var(--mx,50%) var(--my,50%), rgba(244,194,77,0.10), rgba(59,130,246,0.05) 45%, transparent 70%)',
        }}
      />

      {/* 细网格（棋盘） */}
      <div className='auth-bg-grid absolute inset-0 opacity-40 dark:opacity-50' />

      {/* 扫描线 */}
      <div className='auth-scanline absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#f4c24d]/35 to-transparent' />

      {/* 胶片颗粒 */}
      <div
        className='absolute inset-0 opacity-[0.04] mix-blend-overlay dark:opacity-[0.03]'
        style={{ backgroundImage: `url("${grain}")` }}
      />

      {/* 星尘 */}
      <div className='auth-dust absolute inset-0' />
    </div>
  );
}
