'use client';

import { Send } from 'lucide-react';

/**
 * Telegram 登录按钮（品牌色，与 OIDC 快捷登录按钮同风格）。
 * 点击后由 /api/telegram/auth/start 解析 bot_id 并 302 跳转到
 * oauth.telegram.org 官方授权页，授权完成自动回跳 callback 登录。
 * 无 iframe、无二次点击，样式与「使用 Google 登录」一致。
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
    <button
      type='button'
      onClick={start}
      className='inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#2AABEE] bg-[#2AABEE] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#229ad9] active:scale-95'
    >
      <Send className='h-4 w-4' />
      <span>使用 Telegram 登录</span>
    </button>
  );
}
