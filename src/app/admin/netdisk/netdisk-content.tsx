'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import NetDiskConfig from '@/app/admin/sections/netdisk-config';

export default function NetDiskContent() {
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
  return <NetDiskConfig config={config} refreshConfig={load} />;
}
