'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import LiveSourceConfig from '@/app/admin/sections/live-source-config';

export default function LiveContent() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await fetch('/api/admin/config');
      const d = await r.json();
      setConfig(d.config || null);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    requestAnimationFrame(() => load());
  }, []);

  if (loading) return <div className='text-gray-500'>加载中...</div>;
  return <LiveSourceConfig config={config} refreshConfig={load} />;
}
