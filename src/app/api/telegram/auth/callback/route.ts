/* eslint-disable no-console */
import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { setAuthClientCookies } from '@/lib/auth';
import { clearConfigCache } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 生成随机密码
function generatePassword(length = 8): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

// WebApp / Telegram Login Widget 的 hash 校验
function isSignatureValid(
  botToken: string,
  data: Record<string, string>,
): boolean {
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const checkString = Object.keys(data)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n');
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(checkString)
    .digest('hex');
  return hmac === data.hash;
}

// 生成认证 Cookie（与 password 登录签名一致）
async function generateAuthCookie(
  username: string,
  role: 'owner' | 'admin' | 'user' = 'user',
): Promise<string> {
  const authData: Record<string, any> = { role };
  if (username && process.env.PASSWORD) {
    authData.username = username;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(process.env.PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${username}:${role}`),
    );
    authData.signature = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    authData.timestamp = Date.now();
    authData.loginTime = Date.now();
  }
  return JSON.stringify(authData);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectParam = searchParams.get('redirect') || '/';
    const safeRedirect =
      redirectParam.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : '/';

    // Telegram Login Widget 回调参数
    const data: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) {
      if (k !== 'redirect') data[k] = v;
    }
    const tgUserId = data.id;
    const tgUsername = (data.username || `user${tgUserId}`).toLowerCase();
    const providedHash = data.hash;

    if (!tgUserId || !providedHash) {
      return redirectWithMessage(
        safeRedirect,
        'Telegram 授权参数不完整，请重试',
      );
    }

    const config = await db.getAdminConfig();
    const telegramConfig = config?.TelegramAuthConfig;
    if (!telegramConfig?.enabled || !telegramConfig.botToken) {
      return redirectWithMessage(safeRedirect, 'Telegram 登录未启用');
    }

    // 校验签名，防止伪造回调
    if (!isSignatureValid(telegramConfig.botToken, data)) {
      console.warn('[TG Widget] Signature invalid for user:', tgUsername);
      return redirectWithMessage(safeRedirect, '登录校验失败，请重试');
    }

    // 复用现有用户体系：tg_<username>
    const username = `tg_${tgUsername}`;
    const userExists = await db.checkUserExist(username);
    let initialPassword = '';
    let isNewUser = false;

    if (!userExists) {
      if (!telegramConfig.autoRegister) {
        return redirectWithMessage(safeRedirect, '该 Telegram 账号尚未注册');
      }
      initialPassword = generatePassword();
      await db.registerUser(username, initialPassword);
      await clearConfigCache();
      isNewUser = true;
    }

    const authDataString = await generateAuthCookie(username, 'user');
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    try {
      await db.updateUserLoginStats(username, Date.now(), isNewUser);
    } catch {
      // 不影响登录
    }

    if (isNewUser && initialPassword) {
      const newUserExpires = new Date();
      newUserExpires.setSeconds(newUserExpires.getSeconds() + 60);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
        document.cookie = "telegram_new_user=${encodeURIComponent(
          JSON.stringify({ username, password: initialPassword }),
        )}; path=/; max-age=60";
        window.location.replace('${safeRedirect}');
      </script></body></html>`;
      const res = new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
      setAuthClientCookies(res, authDataString, expires, username, 'user');
      return res;
    }

    // 老用户直接设 cookie 后跳转
    const res = new NextResponse(null, {
      status: 302,
      headers: { Location: safeRedirect },
    });
    setAuthClientCookies(res, authDataString, expires, username, 'user');
    return res;
  } catch (error) {
    console.error('[TG Widget] Callback error:', error);
    const { searchParams } = new URL(request.url);
    const redirectParam = searchParams.get('redirect') || '/';
    const safeRedirect =
      redirectParam.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : '/';
    return redirectWithMessage(safeRedirect, '服务器错误，请稍后重试');
  }
}

function redirectWithMessage(path: string, message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>提示</title></head>
<body>
<p>${message}</p>
<p><a href="${path}">返回</a></p>
</body></html>`;
  return new NextResponse(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
