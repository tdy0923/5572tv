'use client';

import { Check, Copy, Frown, RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FluentButton, FluentCard, FluentDivider } from '@/components/FluentUI';

function buildDiagnostics(error: string, videoTitle?: string): string {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  return [
    `时间: ${new Date().toISOString()}`,
    `错误: ${error}`,
    `片名: ${videoTitle || '-'}`,
    `页面: ${typeof location !== 'undefined' ? location.href : '-'}`,
    `设备: ${nav ? nav.userAgent : '-'}`,
    `网络: ${
      nav && 'connection' in nav
        ? String((nav as any).connection?.effectiveType || '-')
        : '-'
    }`,
    `屏幕: ${typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '-'}`,
  ].join('\n');
}

interface PlayErrorDisplayProps {
  error: string;
  videoTitle?: string;
}

export default function PlayErrorDisplay({
  error,
  videoTitle,
}: PlayErrorDisplayProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(buildDiagnostics(error, videoTitle));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-transparent px-4'>
      <FluentCard
        variant='filled'
        className='w-full max-w-md p-8'
        padding='32px'
      >
        <div className='flex flex-col items-center gap-6'>
          <div className='relative'>
            <div
              className='w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg'
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
              }}
            >
              <Frown className='w-10 h-10 text-white' />
            </div>
            <div
              className='absolute -inset-1 rounded-2xl opacity-20 pointer-events-none'
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                animation: 'fluent2-shimmer 2s ease-in-out infinite',
              }}
            />
          </div>

          <div className='text-center flex flex-col gap-1.5'>
            <h2
              className='text-lg font-semibold'
              style={{ color: 'var(--color-foreground)' }}
            >
              播放出现问题
            </h2>
            <p
              className='text-sm'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              请检查网络连接或尝试刷新页面
            </p>
          </div>

          <div
            className='w-full p-3 rounded-lg border'
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.2)',
            }}
          >
            <p
              className='text-xs font-medium text-center'
              style={{ color: '#ef4444' }}
            >
              {error}
            </p>
          </div>

          <div className='w-full flex flex-col gap-2.5'>
            <FluentButton
              variant='primary'
              size='md'
              fullWidth
              onClick={() =>
                videoTitle
                  ? router.push(`/search?q=${encodeURIComponent(videoTitle)}`)
                  : router.back()
              }
              icon={<Search size={16} />}
            >
              {videoTitle ? '返回搜索' : '返回上页'}
            </FluentButton>

            <FluentButton
              variant='secondary'
              size='md'
              fullWidth
              onClick={() => window.location.reload()}
              icon={<RefreshCw size={16} />}
            >
              重新尝试
            </FluentButton>

            <FluentDivider orientation='horizontal' />

            <button
              onClick={copyDiagnostics}
              className='w-full px-4 py-2 text-xs font-medium rounded-lg border transition-all duration-150 cursor-pointer'
              style={{
                borderColor: 'rgba(255,255,255,0.12)',
                color: '#9ca3af',
                backgroundColor: 'transparent',
              }}
            >
              <span className='flex items-center justify-center gap-1.5'>
                {copied ? (
                  <>
                    <Check size={12} />
                    <span>已复制诊断信息</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>复制诊断信息（反馈给站长）</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </FluentCard>
    </div>
  );
}
