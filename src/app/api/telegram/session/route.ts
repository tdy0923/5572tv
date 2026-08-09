import { NextResponse } from 'next/server';

import { getTelegramToken } from '@/lib/telegram-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 一键登录轮询接口。
 * 前端打开 t.me/<bot>?start=<token> 后，轮询这里直到 Telegram 用户
 * 按下 /start（webhook 已回填用户名并标记 confirmed），再跳转 verify 完成登录。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { ok: false, error: '缺少 token' },
      { status: 400 },
    );
  }

  const data = await getTelegramToken(token);
  if (!data) {
    return NextResponse.json({ ok: false, expired: true }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    confirmed: !!data.confirmed,
    telegramUsername: data.telegramUsername || '',
    expiresAt: data.expiresAt,
    baseUrl: data.baseUrl || '',
  });
}
