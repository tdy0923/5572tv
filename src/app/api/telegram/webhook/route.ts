import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { getTelegramToken, updateTelegramToken } from '@/lib/telegram-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Telegram Webhook 端点
export async function POST(request: Request) {
  try {
    const body = await request.text();
    let update: any;
    try {
      update = JSON.parse(body);
    } catch {
      return NextResponse.json({ ok: true });
    }

    // 验证 Telegram 签名（可选但推荐）
    const signatureHeader = request.headers.get(
      'X-Telegram-Bot-Api-Secret-Token',
    );
    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;

    if (telegramConfig?.botToken) {
      const secretToken = (telegramConfig as any).secretToken;
      if (secretToken) {
        if (!signatureHeader || signatureHeader !== secretToken) {
          console.warn('[Webhook] Invalid or missing secret token');
          return NextResponse.json({ ok: true });
        }
      }
    }

    if (!telegramConfig?.enabled || !telegramConfig.botToken) {
      return NextResponse.json({ ok: true });
    }

    // 处理 /start 命令
    if (update.message?.text?.startsWith('/start ')) {
      const chatId = update.message.chat.id;
      const token = update.message.text.split(' ')[1];

      const tokenData = await getTelegramToken(token);

      if (!tokenData) {
        // 发送错误消息
        await sendTelegramMessage(
          telegramConfig.botToken,
          chatId,
          '❌ 登录链接已过期或无效，请返回网站重新操作。',
        );
        return NextResponse.json({ ok: true });
      }

      // 一键登录：从 Telegram 消息中回填真实用户名并标记已确认
      const from = (update.message as any)?.from;
      const tgUsername =
        typeof from?.username === 'string' && from.username.length
          ? from.username.toLowerCase()
          : `user${from?.id ?? chatId}`;
      await updateTelegramToken(token, {
        telegramUsername: tgUsername,
        confirmed: true,
      });

      // 生成登录链接 - 使用保存的域名（token 创建时保存的）
      const loginUrl = `${tokenData.baseUrl}/api/telegram/verify?token=${token}`;

      // 发送登录链接
      const message = `🔐 *登录到 ${config?.SiteConfig?.SiteName || '5572影视'}*\n\n点下方链接即可完成登录：\n\n${loginUrl}\n\n⏰ 此链接将在 5 分钟内过期`;

      await sendTelegramMessage(telegramConfig.botToken, chatId, message);

      return NextResponse.json({ ok: true });
    }

    // 其他消息类型
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ ok: true }); // 总是返回 ok 给 Telegram
  }
}

// 发送 Telegram 消息
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Webhook] Failed to send message:', error);
    }
  } catch (error) {
    console.error('[Webhook] Error sending message:', error);
  }
}
