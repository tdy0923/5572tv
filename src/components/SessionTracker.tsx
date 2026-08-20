/* eslint-disable no-console */
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * 会话追踪组件
 * 负责检测会话恢复并记录登入时间，同时上报页面访问行为
 */
export function SessionTracker() {
  const pathname = usePathname();
  const lastReportedRef = useRef<string>('');

  // 获取/生成匿名访问 ID（持久化在 localStorage）
  const getAnonId = (): string => {
    const key = '5572_anon_id';
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return 'anon';
    }
  };

  // 通用行为上报（sendBeacon，静默失败）
  const sendTrack = (payload: Record<string, unknown>) => {
    try {
      const body = JSON.stringify({ anon: getAnonId(), ...payload });
      navigator.sendBeacon
        ? navigator.sendBeacon(
            '/api/analytics/track',
            new Blob([body], { type: 'application/json' }),
          )
        : fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {});
    } catch {
      // 忽略上报异常
    }
  };

  // 上报页面访问（静默失败，不影响页面）
  const reportPageview = (path: string) => {
    if (typeof document === 'undefined') return;
    if (path === lastReportedRef.current) return;
    lastReportedRef.current = path;

    sendTrack({
      type: 'pageview',
      path,
      ref: document.referrer?.slice(0, 300) || undefined,
    });
  };

  useEffect(() => {
    // 路径变化时上报页面访问
    reportPageview(pathname);

    const checkSessionResume = async () => {
      try {
        // 如果在登录页面，跳过检测（登录页面会自己记录）
        if (pathname === '/login') {
          return;
        }

        // 检查用户是否已登录（兼容 user_auth 和 auth cookie）
        const authCookie = document.cookie.split(';').find((cookie) => {
          const trimmed = cookie.trim();
          return (
            trimmed.startsWith('user_auth=') || trimmed.startsWith('auth=')
          );
        });

        if (!authCookie) {
          // 用户未登录，不需要记录
          return;
        }

        // 检查上次记录的登入时间
        const lastRecordedLogin = localStorage.getItem('lastRecordedLogin');
        const now = Date.now();
        const sessionTimeout = 4 * 60 * 60 * 1000; // 4小时

        const shouldRecordLogin =
          !lastRecordedLogin ||
          now - parseInt(lastRecordedLogin) > sessionTimeout;

        if (shouldRecordLogin) {
          //           // console.log('检测到新会话，记录登入时间');

          // 行为分析：记录一次登录会话
          sendTrack({ type: 'login' });

          // 记录新的登入时间
          const response = await fetch('/api/user/my-stats', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginTime: now }),
          });

          if (response.ok) {
            localStorage.setItem('lastRecordedLogin', now.toString());
            //             // console.log('会话恢复登入时间记录成功');
          } else {
            console.warn('会话恢复登入时间记录失败:', response.status);
          }
        }
      } catch (error) {
        console.error('会话检测失败:', error);
      }
    };

    // 页面加载时检查
    checkSessionResume();

    // 页面可见性变化时也检查（用户切换回来时）
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 页面变为可见时，延迟一点再检查
        setTimeout(checkSessionResume, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // reportPageview/sendTrack 每次渲染重建，加入依赖会导致无限上报
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // 路径变化时重新检测

  // 这个组件不渲染任何UI
  return null;
}
