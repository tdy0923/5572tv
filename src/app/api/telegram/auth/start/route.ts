import { NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedBotId: { id: string; at: number } | null = null;
const BOT_ID_TTL = 6 * 3600 * 1000;

async function resolveBotId(botUsername: string): Promise<string> {
  if (cachedBotId && Date.now() - cachedBotId.at < BOT_ID_TTL) {
    return cachedBotId.id;
  }
  const res = await fetch(
    `https://oauth.telegram.org/embed/${botUsername.replace(/^@/, '')}?origin=https://www.5572.net`,
    { signal: AbortSignal.timeout(8000) },
  );
  const html = await res.text();
  const m = html.match(/TWidgetLogin\.init\(\s*'widget_login',\s*(\d+)/);
  if (!m) throw new Error('无法解析 Telegram bot_id');
  cachedBotId = { id: m[1], at: Date.now() };
  return m[1];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectParam = searchParams.get('redirect') || '/';
  const safeRedirect =
    redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/';
  const origin = searchParams.get('origin') || 'https://www.5572.net';

  const config = await getConfig();
  const tg = config?.TelegramAuthConfig;
  if (!tg?.enabled || !tg.botToken) {
    return NextResponse.json({ error: 'Telegram 登录未启用' }, { status: 400 });
  }

  try {
    const botId = await resolveBotId(tg.botUsername || '');
    const requestAccess = tg.requestWriteAccess ? 'write' : '';
    const callback = `${origin}/api/telegram/auth/callback?redirect=${encodeURIComponent(
      safeRedirect,
    )}`;
    const url = `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(
      origin,
    )}${requestAccess ? `&request_access=${requestAccess}` : ''}&embed=0&return_to=${encodeURIComponent(
      callback,
    )}`;
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('[TG start] Failed to resolve bot_id:', error);
    return NextResponse.json(
      { error: 'Telegram 授权入口暂时不可用，请稍后再试' },
      { status: 500 },
    );
  }
}
