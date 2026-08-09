'use client';

import { useEffect, useRef } from 'react';

interface Poster {
  title: string;
  genre: string;
  year: string;
  score: string;
  bg: string;
}

const POSTERS: Poster[] = [
  {
    title: '星河彼岸',
    genre: '科幻',
    year: '2025',
    score: '9.1',
    bg: 'linear-gradient(165deg, #1b2a5b, #101c3a 55%, #0a1226)',
  },
  {
    title: '雾都疑云',
    genre: '悬疑',
    year: '2024',
    score: '8.7',
    bg: 'linear-gradient(165deg, #2c1a3a, #1b1026 55%, #120a1a)',
  },
  {
    title: '山海食光',
    genre: '美食',
    year: '2025',
    score: '8.9',
    bg: 'linear-gradient(165deg, #5b3a12, #3a2410 55%, #261607)',
  },
  {
    title: '逆光飞行',
    genre: '剧情',
    year: '2023',
    score: '9.3',
    bg: 'linear-gradient(165deg, #25364d, #16222f 55%, #0e161f)',
  },
  {
    title: '长安烟火',
    genre: '古装',
    year: '2024',
    score: '8.5',
    bg: 'linear-gradient(165deg, #4d1320, #300b14 55%, #1f070d)',
  },
  {
    title: '深海来信',
    genre: '奇幻',
    year: '2025',
    score: '8.8',
    bg: 'linear-gradient(165deg, #0f3d44, #0a2a30 55%, #071d21)',
  },
  {
    title: '无声契约',
    genre: '犯罪',
    year: '2024',
    score: '9.0',
    bg: 'linear-gradient(165deg, #3d1f5e, #271239 55%, #180b24)',
  },
  {
    title: '时间的褶皱',
    genre: '科幻',
    year: '2023',
    score: '8.6',
    bg: 'linear-gradient(165deg, #2a3b4c, #1a2530 55%, #0f161d)',
  },
  {
    title: '孤岛回声',
    genre: '悬疑',
    year: '2025',
    score: '8.4',
    bg: 'linear-gradient(165deg, #14404d, #0c2b34 55%, #071d23)',
  },
  {
    title: '钢铁玫瑰',
    genre: '动作',
    year: '2024',
    score: '8.2',
    bg: 'linear-gradient(165deg, #5b1622, #3a0f18 55%, #26090f)',
  },
  {
    title: '落日大道',
    genre: '公路',
    year: '2023',
    score: '8.9',
    bg: 'linear-gradient(165deg, #4d3410, #32220c 55%, #201407)',
  },
  {
    title: '夜航西飞',
    genre: '冒险',
    year: '2025',
    score: '9.2',
    bg: 'linear-gradient(165deg, #20324d, #14202e 55%, #0c141d)',
  },
];

const GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

function PosterCard({ poster }: { poster: Poster }) {
  return (
    <div
      className='relative aspect-[2/3] overflow-hidden rounded-lg will-change-transform'
      style={{ background: poster.bg }}
    >
      <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25' />
      <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent' />
      <div className='absolute inset-x-2 top-2 flex items-center justify-between text-[8px] font-medium tracking-[0.2em] text-white/45'>
        <span>5572</span>
        <span>{poster.genre}</span>
      </div>
      <div className='absolute inset-x-3 bottom-3'>
        <div className='text-[13px] font-semibold leading-tight text-white'>
          {poster.title}
        </div>
        <div className='mt-1 flex items-center gap-1.5 text-[9px] text-white/50'>
          <span>{poster.year}</span>
          <span className='h-0.5 w-0.5 rounded-full bg-white/40' />
          <span>{poster.score} 分</span>
        </div>
      </div>
      <div className='absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-primary-500/70' />
    </div>
  );
}

function PosterBlock({ posters }: { posters: Poster[] }) {
  return (
    <div className='grid grid-cols-2 gap-3 pb-3 sm:gap-4 sm:pb-4'>
      {posters.map((p) => (
        <PosterCard key={p.title} poster={p} />
      ))}
    </div>
  );
}

/**
 * 影视海报墙背景：双列无缝垂直滚动 + 鼠标视差 + 胶片颗粒
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
      wall.style.transform = `translate3d(${(current.x * -10).toFixed(2)}px, ${(current.y * -8).toFixed(2)}px, 0)`;
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

      {/* 可读性遮罩 */}
      <div className='absolute inset-0 bg-gradient-to-br from-gray-950/80 via-gray-950/60 to-gray-950/80' />
      <div className='absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/70' />
      <div className='absolute inset-0 bg-gradient-to-b from-gray-950/60 via-transparent to-gray-950/85' />

      {/* 胶片颗粒 */}
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay'
        style={{ backgroundImage: GRAIN_SVG }}
      />
    </div>
  );
}
