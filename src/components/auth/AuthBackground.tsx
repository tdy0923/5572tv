'use client';

import { type MouseEvent } from 'react';

/**
 * 沉浸式科技登录背景 ——「数字星环 / 光晕呼吸」
 *
 * 动静结合、克制而不喧宾夺主：
 *  - 静态层：深色科技渐变基底（光晕集中在卡片四周）
 *  - 极慢动层：两团「极光」色斑缓慢漂移 + 旋转的对角网格光斑
 *  - 交互层：跟随鼠标的光晕（用 CSS 变量驱动，零 Canvas 开销）
 *  - 质感层：细网格 + 一条低声波的扫描线缓慢下滑
 *  - 点缀层：少量「星尘」光点非线性漂浮（光点而非连线网络）
 *
 * 全部为装饰层，pointer-events 关闭，不影响表单。鼠标交互通过
 * 在根节点写入 --mx/--my 变量，子层光晕用 mask/transform 跟随。
 */
export function AuthBackground() {
  const rootVar =
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
      className='pointer-events-none absolute inset-0 overflow-hidden bg-[#05070d]'
    >
      {/* 基底：左上金、右下蓝的克制科技渐变 */}
      <div className='absolute inset-0 bg-[radial-gradient(60%_50%_at_18%_0%,rgba(244,194,77,0.14),transparent_55%),radial-gradient(55%_45%_at_88%_100%,rgba(56,120,255,0.14),transparent_60%),linear-gradient(180deg,#06080f_0%,#070a12_45%,#05070d_100%)]' />

      {/* 极光 1 —— 缓慢横向漂移的暖光 */}
      <div className='absolute -left-[15%] top-[-12%] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(244,194,77,0.16),transparent_65%)] blur-[70px] auth-aura aurora-a' />

      {/* 极光 2 —— 反向漂移的冷光 */}
      <div className='absolute -right-[15%] bottom-[-14%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,120,255,0.16),transparent_65%)] blur-[80px] auth-aura aurora-b' />

      {/* 旋转的对角网格光斑 */}
      <div className='absolute left-1/2 top-1/2 h-[130vmax] w-[130vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.18] auth-grid-whirl' />

      {/* 交互光晕：跟随指针，随指针明暗涌动 */}
      <div
        className='absolute inset-0 opacity-70'
        style={{
          background:
            'radial-gradient(360px circle at var(--mx,50%) var(--my,50%), rgba(244,194,77,0.12), rgba(56,120,255,0.06) 45%, transparent 70%)',
        }}
      />

      {/* 质感：细网格（棋盘） */}
      <div className='absolute inset-0 auth-bg-grid opacity-[0.5]' />

      {/* 扫描线 —— 一条低声波扫描缓缓下滑 */}
      <div className='auth-scanline absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#f4c24d]/40 to-transparent' />

      {/* 胶片颗粒 */}
      <div
        className='absolute inset-0 opacity-[0.03] mix-blend-overlay'
        style={{ backgroundImage: `url("${rootVar}")` }}
      />

      {/* 星尘：若干漂浮光点（非线性，非连线） */}
      <div className='auth-dust absolute inset-0' />
    </div>
  );
}
