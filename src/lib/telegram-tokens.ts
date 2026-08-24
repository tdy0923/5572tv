/* eslint-disable no-console */
import { db } from './db';

export interface TelegramTokenData {
  telegramUsername: string;
  expiresAt: number;
  baseUrl?: string;
  /** 用户在 Telegram 中按下 /start 后由 webhook 置为 true，表示已确认身份 */
  confirmed?: boolean;
}

// 存储 token 到数据库
export async function setTelegramToken(
  token: string,
  data: TelegramTokenData,
): Promise<void> {
  const key = `telegram_token:${token}`;
  const now = Date.now();
  const ttlMs = data.expiresAt - now;
  const ttl = Math.floor(ttlMs / 1000); // 转换为秒

  // 验证 TTL 是否有效
  if (ttl <= 0) {
    const error = new Error(
      `Invalid TTL: ${ttl} seconds (expiresAt: ${data.expiresAt}, now: ${now})`,
    );
    console.error('[TelegramToken] TTL validation failed:', error.message);
    throw error;
  }

  // Kvrocks 特殊处理：确保 TTL 至少为 1 秒，避免立即过期的边缘情况
  const finalTtl = Math.max(ttl, 1);

  if (finalTtl !== ttl) {
    console.warn(
      '[TelegramToken] TTL adjusted from',
      ttl,
      'to',
      finalTtl,
      'seconds for compatibility',
    );
  }

  try {
    // 使用通用缓存接口，自动兼容所有存储类型
    await db.setCache(key, data, finalTtl);
  } catch (error) {
    console.error('[TelegramToken] Failed to store token:', error);
    throw error;
  }
}

// 从数据库获取 token（用于 webhook，仅读取不删除）
export async function getTelegramToken(
  token: string,
): Promise<TelegramTokenData | null> {
  const key = `telegram_token:${token}`;

  try {
    const data = await db.getCache(key);

    if (!data) {
      return null;
    }

    // 仅检查过期但不删除（让 Redis TTL 自动处理过期）
    // 这样 webhook 可以多次读取同一个 token
    if (data.expiresAt < Date.now()) {
      return null;
    }

    return data as TelegramTokenData;
  } catch (error) {
    console.error('[TelegramToken] Failed to get token:', error);
    console.error(
      '[TelegramToken] Error stack:',
      error instanceof Error ? error.stack : 'N/A',
    );
    return null;
  }
}

// 回填/标记 token（用于 webhook：写入真实 Telegram 用户名并标记已确认，保留原 TTL）
export async function updateTelegramToken(
  token: string,
  patch: Partial<TelegramTokenData>,
): Promise<void> {
  const key = `telegram_token:${token}`;
  const data = await db.getCache(key);
  if (!data) return;

  const merged: TelegramTokenData = { ...data, ...patch };
  const now = Date.now();
  const ttl = Math.max(Math.floor((merged.expiresAt - now) / 1000), 1);
  await db.setCache(key, merged, ttl);
}

// 验证并消费 token（用于 verify，验证后立即删除）
export async function verifyAndConsumeTelegramToken(
  token: string,
): Promise<TelegramTokenData | null> {
  const key = `telegram_token:${token}`;

  try {
    const data = await db.getCache(key);

    if (!data) {
      return null;
    }

    // 检查是否过期
    if (data.expiresAt < Date.now()) {
      await deleteTelegramToken(token);
      return null;
    }

    // 立即删除 token（一次性使用）
    await deleteTelegramToken(token);

    return data as TelegramTokenData;
  } catch (error) {
    console.error('[TelegramToken] Failed to verify and consume token:', error);
    return null;
  }
}

// 删除 token
export async function deleteTelegramToken(token: string): Promise<void> {
  const key = `telegram_token:${token}`;

  try {
    await db.deleteCache(key);
  } catch (error) {
    console.error('[TelegramToken] Failed to delete token:', error);
  }
}

// 为了兼容性，保留 Map（但不再使用）
export const magicLinkTokens = new Map<string, TelegramTokenData>();

export function cleanExpiredTokens() {
  // 不再需要手动清理，Redis TTL 会自动处理
}
