'use client';

import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';

import { AdminConfig } from '@/lib/admin.types';

import { FluentButton } from '@/components/FluentButton';
import { FluentCard, FluentEmptyState } from '@/components/FluentUI';
import { FluentSpinner } from '@/components/FluentSpinner';

import NetDiskConfig from '@/app/admin/sections/netdisk-config';

export default function NetDiskContent() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const r = await fetch('/api/admin/config');
      if (!r.ok) throw new Error(`加载失败: ${r.status}`);
      const d = await r.json();
      setConfig(d.config || d.Config || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => load());
  }, []);

  if (loading) {
    return (
      <FluentCard padding='24px' className='flex flex-col items-center justify-center py-16'>
        <FluentSpinner size='large' label='加载中...' />
        <p className='mt-3 text-sm' style={{ color: 'var(--color-foreground-muted)' }}>
          正在加载网盘配置
        </p>
      </FluentCard>
    );
  }

  if (error) {
    return (
      <FluentCard padding='0'>
        <FluentEmptyState
          icon={<Database className='h-6 w-6 text-[#9ca3af]' />}
          title='加载失败'
          description={error}
          action={
            <FluentButton variant='primary' size='sm' onClick={load}>
              重试
            </FluentButton>
          }
        />
      </FluentCard>
    );
  }

  return (
    <div className='space-y-4'>
      <NetDiskConfig config={config} refreshConfig={load} />
    </div>
  );
}
