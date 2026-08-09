const GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/**
 * 认证页环境背景：金色辉光 + 蓝色环境光 + 浮动光斑 + 胶片颗粒 + 暗角。
 * 纯装饰层，pointer-events 关闭，不影响表单操作。
 */
export function AuthBackground() {
  return (
    <div
      aria-hidden
      className='pointer-events-none absolute inset-0 overflow-hidden'
    >
      <div className='absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(244,194,77,0.14),transparent_70%),radial-gradient(55%_45%_at_88%_100%,rgba(59,130,246,0.10),transparent_70%),linear-gradient(180deg,#f6f7fb,#eef2f7)] dark:bg-[radial-gradient(70%_55%_at_50%_0%,rgba(244,194,77,0.13),transparent_70%),radial-gradient(55%_45%_at_88%_100%,rgba(59,130,246,0.09),transparent_70%),linear-gradient(180deg,#07090f,#0b0f16_45%,#0d1117)]' />
      <div className='absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#f4c24d]/20 blur-[90px] animate-[auth-float_18s_ease-in-out_infinite] dark:bg-[#f4c24d]/12' />
      <div className='absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-[#3b82f6]/15 blur-[100px] animate-[auth-float-rev_22s_ease-in-out_infinite] dark:bg-[#3b82f6]/10' />
      <div className='absolute left-1/2 top-2/3 h-56 w-56 -translate-x-1/2 rounded-full bg-[#8b5cf6]/10 blur-[80px] animate-[auth-float_26s_ease-in-out_infinite] dark:bg-[#8b5cf6]/8' />
      <div
        className='absolute inset-0 opacity-[0.035] mix-blend-overlay'
        style={{ backgroundImage: GRAIN_SVG }}
      />
      <div className='absolute inset-0 bg-[radial-gradient(closest-side,rgba(0,0,0,0.08),transparent_100%)] dark:bg-[radial-gradient(closest-side,rgba(0,0,0,0.45),transparent_100%)]' />
    </div>
  );
}
