/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import {
  checkFail2Ban,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from '@/lib/fail2ban';

export const runtime = 'nodejs';

// 读取存储类型环境变量，默认 localstorage
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

// 生成签名
async function generateSignature(
  data: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // 生成签名
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成认证Cookie（带签名）
async function generateAuthCookie(
  username?: string,
  password?: string,
  role?: 'owner' | 'admin' | 'user',
  includePassword = false,
): Promise<string> {
  const authData: any = { role: role || 'user' };

  // 只在需要时包含 password
  if (includePassword && password) {
    authData.password = password;
  }

  if (username && process.env.PASSWORD) {
    authData.username = username;
    // 签名包含username和role，防止role篡改
    const signData = `${username}:${role || 'user'}`;
    const signature = await generateSignature(signData, process.env.PASSWORD);
    authData.signature = signature;
    authData.timestamp = Date.now(); // 添加时间戳防重放攻击
    authData.loginTime = Date.now(); // 添加登入时间记录
  }

  return encodeURIComponent(JSON.stringify(authData));
}

// 记录设备信息
async function trackDevice(
  username: string,
  userAgent: string,
  ip: string,
): Promise<void> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${userAgent}:${ip}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const deviceId = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const lowerUa = userAgent.toLowerCase();
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
    let deviceName = 'Unknown Device';

    if (
      lowerUa.includes('mobile') ||
      (lowerUa.includes('android') && !lowerUa.includes('tablet')) ||
      lowerUa.includes('iphone') ||
      lowerUa.includes('windows phone')
    ) {
      deviceType = 'mobile';
      if (lowerUa.includes('iphone')) deviceName = 'iPhone';
      else if (lowerUa.includes('android')) deviceName = 'Android Device';
      else deviceName = 'Mobile Device';
    } else if (
      lowerUa.includes('tablet') ||
      lowerUa.includes('ipad') ||
      (lowerUa.includes('android') && !lowerUa.includes('mobile'))
    ) {
      deviceType = 'tablet';
      deviceName = lowerUa.includes('ipad') ? 'iPad' : 'Tablet';
    } else if (
      lowerUa.includes('windows') ||
      lowerUa.includes('macintosh') ||
      lowerUa.includes('linux')
    ) {
      deviceType = 'desktop';
      if (lowerUa.includes('windows')) deviceName = 'Windows PC';
      else if (lowerUa.includes('macintosh')) deviceName = 'Mac';
      else deviceName = 'Linux PC';

      if (lowerUa.includes('chrome') && !lowerUa.includes('edg'))
        deviceName += ' (Chrome)';
      else if (lowerUa.includes('firefox')) deviceName += ' (Firefox)';
      else if (lowerUa.includes('safari') && !lowerUa.includes('chrome'))
        deviceName += ' (Safari)';
      else if (lowerUa.includes('edg')) deviceName += ' (Edge)';
    }

    const devicesKey = `device:${username}`;
    const devices: Record<string, any> = (await db.getCache(devicesKey)) || {};
    const now = Date.now();

    if (devices[deviceId]) {
      devices[deviceId].lastSeen = now;
      devices[deviceId].ip = ip;
    } else {
      devices[deviceId] = {
        id: deviceId,
        username,
        userAgent,
        ip,
        loginTime: now,
        lastSeen: now,
        deviceType,
        deviceName,
      };
    }

    await db.setCache(devicesKey, devices);
  } catch (error) {
    console.error('记录设备信息失败:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Basic rate limiting using in-memory store
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `login:${ip}`;
    const now = Date.now();
    const WINDOW = 60000; // 1 minute
    const MAX_ATTEMPTS = 10;

    // Simple in-memory rate limiter (works for single instance)
    if (!(globalThis as any).__rateLimit)
      (globalThis as any).__rateLimit = new Map();
    const rl = (globalThis as any).__rateLimit;
    const attempts = rl.get(rateLimitKey) || {
      count: 0,
      resetTime: now + WINDOW,
    };
    if (now > attempts.resetTime) {
      attempts.count = 0;
      attempts.resetTime = now + WINDOW;
    }
    attempts.count++;
    rl.set(rateLimitKey, attempts);
    if (attempts.count > MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: '登录尝试过于频繁，请稍后再试' },
        { status: 429 },
      );
    }

    // Fail2ban check
    const f2b = checkFail2Ban(ip);
    if (f2b.blocked) {
      const res = NextResponse.json(
        { error: '访问已被暂时封禁，请稍后再试' },
        { status: 429 },
      );
      if (f2b.retryAfter) {
        res.headers.set('Retry-After', String(f2b.retryAfter));
      }
      return res;
    }

    // 本地 / localStorage 模式——仅校验固定密码
    if (STORAGE_TYPE === 'localstorage') {
      const envPassword = process.env.PASSWORD;

      // 未配置 PASSWORD 时直接放行
      if (!envPassword) {
        const response = NextResponse.json({ ok: true });

        // 清除可能存在的认证cookie
        response.cookies.set('user_auth', '', {
          path: '/',
          expires: new Date(0),
          sameSite: 'lax',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
        });

        return response;
      }

      const { password } = await req.json();
      if (typeof password !== 'string') {
        return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
      }

      if (password !== envPassword) {
        recordFailedAttempt(ip);
        return NextResponse.json(
          { ok: false, error: '密码错误' },
          { status: 401 },
        );
      }

      recordSuccessfulLogin(ip);
      // 记录设备信息
      const userAgent = req.headers.get('user-agent') || '';
      await trackDevice('local_user', userAgent, ip);

      // 验证成功，设置认证cookie
      const response = NextResponse.json({ ok: true });
      const cookieValue = await generateAuthCookie(
        undefined,
        password,
        'user',
        true,
      ); // localstorage 模式包含 password
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('user_auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;
    }

    // 数据库 / redis 模式——校验用户名并尝试连接数据库
    const { username, password } = await req.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    // 可能是站长，直接读环境变量
    if (
      username === process.env.USERNAME &&
      password === process.env.PASSWORD
    ) {
      // 记录设备信息
      const userAgent = req.headers.get('user-agent') || '';
      await trackDevice(username, userAgent, ip);

      // 验证成功，设置认证cookie
      const response = NextResponse.json({ ok: true });
      const cookieValue = await generateAuthCookie(
        username,
        password,
        'owner',
        false,
      ); // 数据库模式不包含 password
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('user_auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
      });

      recordSuccessfulLogin(ip);
      return response;
    } else if (username === process.env.USERNAME) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const config = await getConfig();
    const legacyUser = config.UserConfig.Users.find(
      (u) => u.username === username,
    );
    const userV2 = await db.getUserInfoV2(username);
    const user = userV2 || legacyUser;
    if (user?.banned) {
      return NextResponse.json({ error: '用户被封禁' }, { status: 401 });
    }

    // 优先校验 V2 用户密码，失败后回退到 V1（兼容老用户）
    try {
      let pass = false;

      if (userV2) {
        pass = await db.verifyUserV2(username, password);
      } else {
        pass = await db.verifyUser(username, password);
      }

      if (!pass) {
        recordFailedAttempt(ip);
        return NextResponse.json(
          { error: '用户名或密码错误' },
          { status: 401 },
        );
      }

      recordSuccessfulLogin(ip);
      // 记录设备信息
      const userAgent = req.headers.get('user-agent') || '';
      await trackDevice(username, userAgent, ip);

      // 验证成功，设置认证cookie
      const response = NextResponse.json({ ok: true });
      const cookieValue = await generateAuthCookie(
        username,
        password,
        user?.role || 'user',
        false,
      );
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('user_auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
      });

      return response;
    } catch (err) {
      console.error('数据库验证失败', err);
      return NextResponse.json({ error: '数据库错误' }, { status: 500 });
    }
  } catch (error) {
    console.error('登录接口异常', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
