/* eslint-disable no-console */

import { NextRequest } from 'next/server';

function getPasswordSecret(): string {
  return process.env.PASSWORD || '';
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
    const decoded = decodeURIComponent(authCookie.value);
    const authData = JSON.parse(decoded);

    // Verify HMAC signature is present (required for forgery protection)
    if (!authData.signature || !authData.username) {
      return null;
    }

    // Verify HMAC signature (support both old and new formats)
    const secret = getPasswordSecret();

    // New format: sign(username:role)
    const newSignData = `${authData.username}:${authData.role || 'user'}`;
    let isValid = false;

    if (secret) {
      isValid = await verifySignature(newSignData, authData.signature, secret);

      // Backward compatibility: old format sign(username)
      if (!isValid) {
        isValid = await verifySignature(
          authData.username,
          authData.signature,
          secret,
        );
      }
    } else {
      // No PASSWORD set — skip signature verification (legacy mode)
      isValid = true;
    }

    if (!isValid) {
      console.warn(
        '[Auth] Cookie signature verification failed:',
        authData.username,
      );
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
