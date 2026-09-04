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
