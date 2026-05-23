'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import VideoSourceConfig from '@/app/admin/sections/video-source-config';

export default function SourcesContent() {
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
  return <VideoSourceConfig config={config} refreshConfig={load} />;
}
