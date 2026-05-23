'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import UserConfig from '@/app/admin/sections/user-config';

export default function UsersContent() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [role, setRole] = useState<'owner' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await fetch('/api/admin/config');
      const d = await r.json();
      setConfig(d.config || null);
      setRole(d.Role || null);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };
  useEffect(() => {
    requestAnimationFrame(() => load());
  }, []);

  if (loading) return <div className='text-gray-500'>加载中...</div>;
  return <UserConfig config={config} role={role} refreshConfig={load} />;
}
