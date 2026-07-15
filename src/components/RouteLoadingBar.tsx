'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'hidden' | 'loading' | 'complete';

export default function RouteLoadingBar() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('hidden');
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      const id = setTimeout(() => setPhase('loading'));
      return () => clearTimeout(id);
    }
  }, [pathname]);

  useEffect(() => {
    if (phase === 'loading') {
      const t = setTimeout(() => setPhase('complete'), 300);
      return () => clearTimeout(t);
    }
    if (phase === 'complete') {
      const t = setTimeout(() => setPhase('hidden'), 250);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const width =
    phase === 'hidden' ? '0%' : phase === 'loading' ? '90%' : '100%';

  return (
    <div
      className='fixed left-0 right-0 top-0 z-[100] h-[3px] pointer-events-none'
      style={{
        opacity: phase === 'hidden' ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className='h-full'
        style={{
          width,
          backgroundColor: '#F4C24D',
          transition:
            phase === 'loading' ? 'width 3s ease-out' : 'width 0.2s ease-in',
          boxShadow: '0 0 8px rgba(244, 194, 77, 0.5)',
        }}
      />
    </div>
  );
}
