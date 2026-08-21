/* eslint-disable no-console */

import type { NextResponse as NextResponseType } from 'next/server';
import { NextRequest } from 'next/server';

// ── Token Revocation (Redis-backed) ──

async function getRevocationClient() {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_URL;
    const token = process.env.UPSTASH_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

function tokenKey(username: string, timestamp: number): string {
  return `revoked:${username}:${timestamp}`;
}

export async function revokeToken(
  username: string,
  timestamp: number,
): Promise<void> {
  const client = await getRevocationClient();
  if (!client) return;
  const key = tokenKey(username, timestamp);
  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  await client.set(key, '1', { ex: SEVEN_DAYS });
}

export async function isTokenRevoked(
  username: string,
  timestamp: number,
): Promise<boolean> {
  const client = await getRevocationClient();
  if (!client) return false;
  const key = tokenKey(username, timestamp);
  const result = await client.get(key);
  return result === '1';
}

// Set auth cookies on response — user_auth (httpOnly) + user_info (client-readable)
export function setAuthClientCookies(
  response: NextResponseType,
  authCookieValue: string,
  expires: Date,
  username: string,
  role: 'owner' | 'admin' | 'user' = 'user',
): void {
  response.cookies.set('user_auth', authCookieValue, {
    path: '/',
    expires,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  const userInfo = JSON.stringify({ username, role });
  response.cookies.set('user_info', userInfo, {
    path: '/',
    expires,
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
}

// Clear both auth cookies on logout
export function clearAuthClientCookies(response: NextResponseType): void {
  response.cookies.set('user_auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  response.cookies.set('user_info', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
  response.cookies.set('auth', '', {
    path: '/',
    expires: new Date(0),
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}

function getPasswordSecret(): string {
  const pwd = process.env.PASSWORD;
  if (!pwd) {
    console.error(
      '[CRITICAL] PASSWORD environment variable is not set! ' +
        'Authentication will be disabled. Set a strong PASSWORD in production.',
    );
  }
  return pwd || '';
}

// OIDC 会话签名密钥：优先独立 AUTH_SECRET，未配置时回退 PASSWORD（向后兼容）
function getOidcSessionSecret(): string {
  return process.env.AUTH_SECRET || getPasswordSecret();
}

// 异步签名 OIDC 会话字符串，返回 `${payload}.${signature}`
export async function signOidcSessionValue(payload: string): Promise<string> {
  const signature = await signHmac(getOidcSessionSecret(), payload);
  return `${payload}.${signature}`;
}

// 校验并还原 OIDC 会话字符串；无效返回 null
export async function verifyOidcSessionValue(
  token: string,
): Promise<string | null> {
  const lastDot = token.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!payload || !signature) return null;
  const ok = await verifyHmac(getOidcSessionSecret(), payload, signature);
  return ok ? payload : null;
}

async function signHmac(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyHmac(
  secret: string,
  data: string,
  signatureHex: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signatureBuffer = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
    );
    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(data),
    );
  } catch {
    return false;
  }
}

// Verify HMAC signature to prevent cookie forgery
async function verifySignature(
  data: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [],
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      messageData,
    );
  } catch {
    return false;
  }
}

// 尝试用 AUTH_SECRET 或 PASSWORD 校验，兼容旧 cookie
async function verifySignatureWithFallback(
  data: string,
  signature: string,
): Promise<boolean> {
  const primary = getOidcSessionSecret();
  if (primary) {
    if (await verifySignature(data, signature, primary)) return true;
  }
  const fallback = getPasswordSecret();
  if (fallback && fallback !== primary) {
    if (await verifySignature(data, signature, fallback)) return true;
  }
  return false;
}

// 从cookie获取认证信息并验证签名 (服务端使用)
export async function getAuthInfoFromCookie(request: NextRequest): Promise<{
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  loginTime?: number;
  trustedNetwork?: boolean;
  role?: 'owner' | 'admin' | 'user';
} | null> {
  // 尝试新的 cookie 名称 user_auth，如果没有则尝试旧的 auth
  const authCookie =
    request.cookies.get('user_auth') || request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  try {
    let authData: any;
    try {
      // New format: cookie value is single-encoded (JSON.stringify only)
      // Next.js cookies.get() returns the decoded value directly
      authData = JSON.parse(authCookie.value);
    } catch {
      // Old format: cookie value was encodeURIComponent'd, causing double-encoding
      // First decodeURIComponent gives us the single-encoded string, second gives JSON
      const decoded = decodeURIComponent(authCookie.value);
      try {
        authData = JSON.parse(decoded);
      } catch {
        // Triple-encoded fallback (very old cookies)
        authData = JSON.parse(decodeURIComponent(decoded));
      }
    }

    // Verify HMAC signature is present (required for forgery protection)
    if (!authData.signature || !authData.username) {
      return null;
    }

    // Verify HMAC signature (support both old and new formats, AUTH_SECRET 优先)
    const newSignData = `${authData.username}:${authData.role || 'user'}`;
    let isValid = false;

    const hasSecret = getOidcSessionSecret() || getPasswordSecret();
    if (hasSecret) {
      isValid = await verifySignatureWithFallback(
        newSignData,
        authData.signature,
      );

      // Backward compatibility: old format sign(username)
      if (!isValid) {
        isValid = await verifySignatureWithFallback(
          authData.username,
          authData.signature,
        );
      }
    } else {
      // No secret set — reject all authentication attempts
      console.error(
        '[Auth] PASSWORD/AUTH_SECRET environment variable is not set. ' +
          'Authentication is disabled for security. ' +
          'Set a strong secret in production.',
      );
      return null;
    }

    if (!isValid) {
      console.warn(
        '[Auth] Cookie signature verification failed:',
        authData.username,
      );
      return null;
    }

    // Check token revocation (e.g., after password change or forced logout)
    if (await isTokenRevoked(authData.username, authData.timestamp)) {
      console.warn('[Auth] Token revoked:', authData.username);
      return null;
    }

    // Verify timestamp (prevent expired cookies)
    if (!authData.timestamp) {
      return null;
    }
    const age = Date.now() - authData.timestamp;
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (age > MAX_AGE) {
      console.warn('[Auth] Cookie expired:', authData.username);
      return null;
    }

    return authData;
  } catch {
    return null;
  }
}

// 验证认证 cookie 的完整性和有效性 (alias for backward compatibility)
export const verifyAuthCookie = getAuthInfoFromCookie;

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  loginTime?: number;
  trustedNetwork?: boolean;
  role?: 'owner' | 'admin' | 'user';
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cookies = document.cookie.split(';').reduce(
      (acc, cookie) => {
        const trimmed = cookie.trim();
        const firstEqualIndex = trimmed.indexOf('=');
        if (firstEqualIndex > 0) {
          const key = trimmed.substring(0, firstEqualIndex);
          const value = trimmed.substring(firstEqualIndex + 1);
          if (key && value) {
            acc[key] = value;
          }
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    // 优先读取 user_info（轻量级客户端 cookie），回退到 user_auth
    const infoCookie = cookies['user_info'];
    if (infoCookie) {
      let decoded = decodeURIComponent(infoCookie);
      if (decoded.includes('%')) {
        decoded = decodeURIComponent(decoded);
      }
      return JSON.parse(decoded);
    }

    const authCookie = cookies['user_auth'] || cookies['auth'];
    if (!authCookie) {
      return null;
    }

    let decoded = decodeURIComponent(authCookie);
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
