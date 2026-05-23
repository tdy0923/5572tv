'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import CategoryConfig from '@/app/admin/sections/category-config';

export default function CategoryContent() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const resp = await fetch('/api/admin/config');
      const data = await resp.json();
      setConfig(data.config || null);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      loadConfig();
    });
  }, []);

  if (loading) return <div className='text-gray-500'>加载中...</div>;
  return <CategoryConfig config={config} refreshConfig={loadConfig} />;
}
