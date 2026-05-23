'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import SiteConfigComponent from '@/app/admin/sections/site-config';

export default function SettingsContent() {
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
  return <SiteConfigComponent config={config} refreshConfig={load} />;
}
