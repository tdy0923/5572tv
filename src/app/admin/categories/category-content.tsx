'use client';

import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';

import { AdminConfig } from '@/lib/admin.types';

import { FluentButton } from '@/components/FluentButton';
import { FluentCard, FluentEmptyState } from '@/components/FluentUI';
import { FluentSpinner } from '@/components/FluentSpinner';

import CategoryConfig from '@/app/admin/sections/category-config';

export default function CategoryContent() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setError(null);
      setLoading(true);
      const resp = await fetch('/api/admin/config');
      if (!resp.ok) throw new Error(`加载失败: ${resp.status}`);
      const data = await resp.json();
      setConfig(data.config || data.Config || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      loadConfig();
    });
  }, []);

  if (loading) {
    return (
      <FluentCard padding='24px' className='flex flex-col items-center justify-center py-16'>
        <FluentSpinner size='large' label='加载中...' />
        <p className='mt-3 text-sm' style={{ color: 'var(--color-foreground-muted)' }}>
          正在加载分类配置
        </p>
      </FluentCard>
    );
  }

  if (error) {
    return (
      <FluentCard padding='0'>
        <FluentEmptyState
          icon={<FolderOpen className='h-6 w-6 text-[#9ca3af]' />}
          title='加载失败'
          description={error}
          action={
            <FluentButton variant='primary' size='sm' onClick={loadConfig}>
              重试
            </FluentButton>
          }
        />
      </FluentCard>
    );
  }

  return (
    <div className='space-y-4'>
      <CategoryConfig config={config} refreshConfig={loadConfig} />
    </div>
  );
}
