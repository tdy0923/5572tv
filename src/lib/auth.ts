import { NextRequest } from 'next/server';

// WARNING: This function does NOT verify the HMAC signature. It only parses the
// JSON cookie value. Callers handling authentication should prefer
// `verifyAuthCookie()` instead to prevent cookie forgery attacks.
// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(request: NextRequest): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  loginTime?: number;
  trustedNetwork?: boolean;
  role?: 'owner' | 'admin' | 'user';
} | null {
  // 尝试新的 cookie 名称 user_auth，如果没有则尝试旧的 auth
  const authCookie = request.cookies.get('user_auth') || request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(authCookie.value);
    const authData = JSON.parse(decoded);
    return authData;
  } catch (error) {
    console.debug('[Auth] Parse error:', error);
    return null;
  }
}

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
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
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
    }, {} as Record<string, string>);

    // 尝试新的 cookie 名称 user_auth，如果没有则尝试旧的 auth
    const authCookie = cookies['user_auth'] || cookies['auth'];
    if (!authCookie) {
      return null;
    }

    // 处理可能的双重编码
    let decoded = decodeURIComponent(authCookie);

    // 如果解码后仍然包含 %，说明是双重编码，需要再次解码
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }

    const authData = JSON.parse(decoded);
    return authData;
  } catch (error) {
    console.debug('[Auth] Parse error:', error);
    return null;
  }
}

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
  } catch (error) {
    console.debug('[Auth] Parse error:', error);
    return false;
  }
}

// 验证认证 cookie 的完整性和有效性
export async function verifyAuthCookie(request: NextRequest): Promise<{
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  loginTime?: number;
  trustedNetwork?: boolean;
  role?: 'owner' | 'admin' | 'user';
} | null> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo) return null;

  // 验证签名
  if (authInfo.signature && authInfo.username) {
    const isValid = await verifySignature(
      authInfo.username,
      authInfo.signature,
      process.env.PASSWORD || '',
    );
    if (!isValid) {
      console.warn('Cookie 签名验证失败:', authInfo.username);
      return null;
    }
  }

  // 验证时间戳（防止过期 cookie）
  if (authInfo.timestamp) {
    const age = Date.now() - authInfo.timestamp;
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (age > MAX_AGE) {
      console.warn('Cookie 已过期:', authInfo.username);
      return null;
    }
  }

  return authInfo;
}
