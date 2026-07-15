'use client';

import { useCallback, useState } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function useRippleEffect() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.5;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const id = Date.now() + Math.random();

      setRipples((prev) => [...prev, { id, x, y, size }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    },
    [],
  );

  return { ripples, handlePointerDown };
}
