import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { setTelegramToken } from '@/lib/telegram-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { telegramUsername } = await request.json();

    // 用户名可留空：新的一键登录方案下，
    // 真实 Telegram 用户名会在用户按下 /start 后由 webhook 回填。

    // 获取管理员配置
    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;

    if (!telegramConfig?.enabled) {
      return NextResponse.json(
        { error: 'Telegram 登录未启用' },
        { status: 403 },
      );
    }

    if (!telegramConfig.botToken) {
      return NextResponse.json({ error: 'Bot Token 未配置' }, { status: 500 });
    }

    // 生成随机 token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟过期

    // 获取当前请求的域名
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host =
      request.headers.get('host') || request.headers.get('x-forwarded-host');
    const baseUrl = `${protocol}://${host}`;

    // 存储 token 到数据库
    const tokenData = {
      telegramUsername:
        typeof telegramUsername === 'string'
          ? telegramUsername.toLowerCase()
          : '',
      expiresAt,
      baseUrl, // 保存请求的域名
      confirmed: false, // 尚未在 Telegram 中确认
    };
    await setTelegramToken(token, tokenData);

    // 自动设置 webhook 到当前域名（如果还未设置）
    try {
      const webhookUrl = `${baseUrl}/api/telegram/webhook`;
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${telegramConfig.botToken}/getWebhookInfo`,
        { signal: AbortSignal.timeout(10000) },
      );
      const info = await infoResponse.json();

      if (info.ok && info.result.url !== webhookUrl) {
        await fetch(
          `https://api.telegram.org/bot${telegramConfig.botToken}/setWebhook`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              url: webhookUrl,
              allowed_updates: ['message'],
            }),
          },
        );
      }
    } catch (error) {
      console.error('[Magic Link] Failed to set webhook:', error);
      // 不阻止流程继续
    }

    // 生成 Telegram 深度链接
    const botUsername = telegramConfig.botUsername;
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({
      success: true,
      deepLink: deepLink,
      botUsername: botUsername,
      token: token,
    });
  } catch (error) {
    console.error('Magic link send error:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 },
    );
  }
}
