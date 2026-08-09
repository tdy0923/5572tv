'use client';

import { useEffect, useRef } from 'react';

interface Poster {
  title: string;
  genre: string;
  year: string;
  score: string;
  tagline: string;
  bg: string;
}

const POSTERS: Poster[] = [
  {
    title: '星河彼岸',
    genre: '科幻',
    year: '2025',
    score: '9.1',
    tagline: '跨越亿万光年的告别',
    bg: 'linear-gradient(170deg, #27406e 0%, #182c52 40%, #0d1a38 100%)',
  },
  {
    title: '雾都疑云',
    genre: '悬疑',
    year: '2024',
    score: '8.7',
    tagline: '真相藏在雾里',
    bg: 'linear-gradient(170deg, #4a2a5e 0%, #311b40 40%, #1d1027 100%)',
  },
  {
    title: '山海食光',
    genre: '美食',
    year: '2025',
    score: '8.9',
    tagline: '一餐一饭皆人间',
    bg: 'linear-gradient(170deg, #7a5220 0%, #4e3314 40%, #2b1b0a 100%)',
  },
  {
    title: '逆光飞行',
    genre: '剧情',
    year: '2023',
    score: '9.3',
    tagline: '逆着光，也要向前',
    bg: 'linear-gradient(170deg, #3a5278 0%, #25344e 40%, #141d2e 100%)',
  },
  {
    title: '长安烟火',
    genre: '古装',
    year: '2024',
    score: '8.5',
    tagline: '一城灯火半城诗',
    bg: 'linear-gradient(170deg, #6e2436 0%, #461624 40%, #2a0c15 100%)',
  },
  {
    title: '深海来信',
    genre: '奇幻',
    year: '2025',
    score: '8.8',
    tagline: '来自两万米的信',
    bg: 'linear-gradient(170deg, #0f4d58 0%, #0a3440 40%, #071e26 100%)',
  },
  {
    title: '无声契约',
    genre: '犯罪',
    year: '2024',
    score: '9.0',
    tagline: '永不出口的协议',
    bg: 'linear-gradient(170deg, #55308a 0%, #3a1f5e 40%, #251238 100%)',
  },
  {
    title: '时间的褶皱',
    genre: '科幻',
    year: '2023',
    score: '8.6',
    tagline: '折叠的昨天与明天',
    bg: 'linear-gradient(170deg, #3d5a70 0%, #2a3c4e 40%, #182530 100%)',
  },
  {
    title: '孤岛回声',
    genre: '悬疑',
    year: '2025',
    score: '8.4',
    tagline: '岛上无人应答',
    bg: 'linear-gradient(170deg, #1c5d66 0%, #123c44 40%, #0a2428 100%)',
  },
  {
    title: '钢铁玫瑰',
    genre: '动作',
    year: '2024',
    score: '8.2',
    tagline: '刺破黑夜的花',
    bg: 'linear-gradient(170deg, #7a2336 0%, #4d1624 40%, #2c0c15 100%)',
  },
  {
    title: '落日大道',
    genre: '公路',
    year: '2023',
    score: '8.9',
    tagline: '开往日落的方向',
    bg: 'linear-gradient(170deg, #6b4a1a 0%, #452e10 40%, #26190a 100%)',
  },
  {
    title: '夜航西飞',
    genre: '冒险',
    year: '2025',
    score: '9.2',
    tagline: '云海之上，风是路标',
    bg: 'linear-gradient(170deg, #2f4d78 0%, #1e3352 40%, #111d31 100%)',
  },
];

const GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

function PosterCard({ poster }: { poster: Poster }) {
  return (
    <div
      className='relative aspect-[2/3] overflow-hidden rounded-xl will-change-transform'
      style={{ background: poster.bg }}
    >
      {/* 顶部高光 / 底部压暗 */}
      <div className='absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent' />
      <div className='absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />

      {/* 顶部标识条 */}
      <div className='absolute inset-x-0 top-0 flex items-center justify-between px-2.5 py-2'>
        <span className='rounded-sm bg-white/10 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.2em] text-white/80 backdrop-blur-sm'>
          5572
        </span>
        <span className='text-[9px] font-medium tracking-widest text-white/60'>
          {poster.genre}
        </span>
      </div>

      {/* 竖排大标题 */}
      <div className='absolute inset-0 flex items-center justify-center'>
        <div
          className='text-2xl font-black leading-tight tracking-wider text-white/95 sm:text-3xl'
          style={{
            writingMode: 'vertical-rl',
            textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.35)',
          }}
        >
          {poster.title}
        </div>
      </div>

      {/* 副标语 */}
      <div className='absolute inset-x-0 bottom-12 px-3 text-center'>
        <div
          className='text-[10px] font-medium tracking-[0.25em] text-white/70'
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}
        >
          {poster.tagline}
        </div>
      </div>

      {/* 底部信息栏 */}
      <div className='absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm'>
        <span className='text-[9px] text-white/70'>
          {poster.year} · {poster.genre}
        </span>
        <span className='flex items-center gap-1 text-[9px] font-semibold text-primary-400'>
          <svg className='h-2.5 w-2.5 fill-current' viewBox='0 0 24 24'>
            <path d='M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
          </svg>
          {poster.score}
        </span>
      </div>

      {/* 胶片外框与金色角标 */}
      <div className='pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10' />
      <div className='pointer-events-none absolute inset-1 rounded-lg ring-1 ring-inset ring-white/[0.06]' />
      <div className='absolute right-1.5 top-1/3 h-3 w-1 rounded-full bg-primary-500/80' />
      <div className='absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-primary-500/70' />
    </div>
  );
}

function PosterBlock({ posters }: { posters: Poster[] }) {
  return (
    <div className='grid grid-cols-2 gap-4 pb-4 sm:gap-5 sm:pb-5'>
      {posters.map((p) => (
        <PosterCard key={p.title} poster={p} />
      ))}
    </div>
  );
}

/**
 * 影视海报墙背景：双列无缝垂直滚动 + 鼠标视差 + 中心聚光暗角 + 胶片颗粒
 * 纯 transform 动画（GPU 友好），尊重 prefers-reduced-motion
 */
export default function PosterWall() {
  const wallRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    if (
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return;
    }

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.x = nx;
      target.y = ny;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;
      wall.style.transform = `translate3d(${(current.x * -6).toFixed(2)}px, ${(current.y * -5).toFixed(2)}px, 0)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const left = POSTERS.slice(0, 6);
  const right = POSTERS.slice(6);

  return (
    <div className='absolute inset-0 overflow-hidden' aria-hidden='true'>
      <div ref={wallRef} className='absolute inset-0 will-change-transform'>
        {/* 左列：向下滚动 */}
        <div className='absolute inset-y-0 left-0 w-1/2 overflow-hidden'>
          <div className='animate-[poster-wall-drift_110s_linear_infinite] will-change-transform'>
            <PosterBlock posters={left} />
            <PosterBlock posters={left} />
          </div>
        </div>

        {/* 右列：向上滚动（方向反转） */}
        <div className='absolute inset-y-0 right-0 w-1/2 overflow-hidden'>
          <div className='animate-[poster-wall-drift_150s_linear_infinite_reverse] will-change-transform'>
            <PosterBlock posters={right} />
            <PosterBlock posters={right} />
          </div>
        </div>
      </div>

      {/* 底部压暗：保证页面下部与特性区衔接 */}
      <div className='absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent' />

      {/* 中心聚光：四周亮、中央暗，保证内容清晰 */}
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          background:
            'radial-gradient(closest-side, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.78) 30%, rgba(10,10,10,0.4) 55%, rgba(10,10,10,0.05) 78%, transparent 100%)',
        }}
      />

      {/* 顶部柔和渐入 */}
      <div className='absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-gray-950/90 to-transparent' />

      {/* 胶片颗粒 */}
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay'
        style={{ backgroundImage: GRAIN_SVG }}
      />
    </div>
  );
}
