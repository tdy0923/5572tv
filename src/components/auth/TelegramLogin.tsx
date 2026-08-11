'use client';

import { Send } from 'lucide-react';

import { QUICK_LOGIN_BUTTON_CLASS } from './quickLoginButton';

/**
 * Telegram 登录按钮（与 OIDC 快捷登录按钮统一样式、同高同宽）。
 * 点击后由 /api/telegram/auth/start 解析 bot_id 并 302 跳转到
 * oauth.telegram.org 官方授权页，授权完成自动回跳 callback 登录。
 */
export function TelegramLogin({ redirect = '/' }: { redirect?: string }) {
  const start = () => {
    const params = new URLSearchParams({
      redirect,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    });
    window.location.href = `/api/telegram/auth/start?${params.toString()}`;
  };

  return (
    <button type='button' onClick={start} className={QUICK_LOGIN_BUTTON_CLASS}>
      <Send className='h-5 w-5 shrink-0 text-[#2AABEE]' />
      <span className='truncate'>Telegram 登录</span>
    </button>
  );
}
