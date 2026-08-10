'use client';

import { useEffect, useRef } from 'react';

/**
 * Telegram Login Widget（iframe 版）。
 * 通过 oauth.telegram.org/embed 内嵌官方「用 Telegram 登录」按钮，
 * 无需加载外部脚本（CSP 友好）。授权成功后父页面通过 postMessage 收到
 * 用户数据，再交给 /api/telegram/auth/callback 用 bot token 校验 hash 并登录/注册。
 *
 * Bot 需在 BotFather 中把本站点域名绑定为该 bot 的 Widget 域名。
 */
export function TelegramLogin({
  botUsername,
  redirect = '/',
  requestAccess = false,
}: {
  botUsername: string;
  redirect?: string;
  requestAccess?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://oauth.telegram.org') return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = JSON.parse(event.data);
        if (data && data.hash && data.id) {
          const params = new URLSearchParams();
          Object.entries(data).forEach(([k, v]) => {
            if (typeof v === 'string' || typeof v === 'number') {
              params.set(k, String(v));
            }
          });
          params.set('redirect', redirect);
          window.location.href = `/api/telegram/auth/callback?${params.toString()}`;
        }
      } catch {
        // 忽略非 JSON 消息
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [redirect]);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanBot = botUsername.replace(/^@/, '');
  const request = requestAccess ? '&request_access=write' : '';

  return (
    <iframe
      ref={iframeRef}
      title='Telegram 登录'
      src={`https://oauth.telegram.org/embed/${cleanBot}?origin=${encodeURIComponent(
        origin,
      )}${request}`}
      className='mx-auto block h-[64px] w-full max-w-[260px] border-0'
      style={{ background: 'transparent' }}
    />
  );
}
