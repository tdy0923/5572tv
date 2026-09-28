'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { resetSessionExpiredNotify } from '@/lib/session-expired';

import { FluentConfirm } from './FluentModal';

/**
 * 登录过期全局弹窗。挂载在 PageLayout（登录/注册页不用它，不会误弹）。
 * 数据请求 401 时由 db.client 经 session-expired 事件触发，全局只弹一次；
 * 用户重新登录成功后由成功请求自动复位。
 */
export default function SessionExpiredModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onExpired = () => setOpen(true);
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, []);

  const handleGoLogin = useCallback(() => {
    setOpen(false);
    resetSessionExpiredNotify();
    const back = `${pathname || '/'}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    router.push(`/login?redirect=${encodeURIComponent(back)}`);
  }, [router, pathname, searchParams]);

  const handleLater = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <FluentConfirm
      open={open}
      onClose={handleLater}
      onConfirm={handleGoLogin}
      title='登录已过期'
      message='登录状态已失效，请重新登录后再继续使用。'
      confirmText='去登录'
      cancelText='稍后再说'
    />
  );
}

/**
 * 登录过期降级横幅：点"稍后再说"关掉弹窗后常驻底部，
 * 避免后续请求持续 401 却无声；恢复登录后自动隐藏。
 * 与 SessionExpiredModal 一起挂载在 PageLayout。
 */
export function SessionExpiredBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onExpired = () => setVisible(true);
    const onActive = () => setVisible(false);
    window.addEventListener('session-expired', onExpired);
    window.addEventListener('session-active', onActive);
    return () => {
      window.removeEventListener('session-expired', onExpired);
      window.removeEventListener('session-active', onActive);
    };
  }, []);

  const handleGoLogin = useCallback(() => {
    setVisible(false);
    resetSessionExpiredNotify();
    const back = `${pathname || '/'}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    router.push(`/login?redirect=${encodeURIComponent(back)}`);
  }, [router, pathname, searchParams]);

  if (!visible) return null;

  return (
    <div className='fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-90 -translate-x-1/2 animate-fluent2-fade-in'>
      <div className='flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/95 py-2.5 pl-4 pr-2.5 shadow-lg'>
        <span className='whitespace-nowrap text-sm font-medium text-white'>
          登录已过期，浏览与同步已暂停
        </span>
        <button
          type='button'
          onClick={handleGoLogin}
          className='shrink-0 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-white'
        >
          去登录
        </button>
      </div>
    </div>
  );
}
