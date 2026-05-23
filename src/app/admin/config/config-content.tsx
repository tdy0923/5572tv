'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import ConfigFileComponent from '@/app/admin/sections/config-file';

export default function ConfigFileContent() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestAnimationFrame(() => {
      fetch('/api/admin/config')
        .then((r) => r.json())
        .then((data) => {
          setConfig(data.config || null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, []);

  if (loading) return <div className='text-gray-500'>加载中...</div>;
  return <ConfigFileComponent config={config} />;
}
