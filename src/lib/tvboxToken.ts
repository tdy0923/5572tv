import { randomBytes } from 'crypto';

/**
 * 生成随机 TVBox Token。
 */
export function generateTvboxToken(length = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * 为用户确保存在专属 TVBox Token，不存在则生成并持久化。
 * 返回 login 用户的 tvboxToken。
 */
export async function ensureUserTvboxToken(
  username: string,
  config: import('@/lib/admin.types').AdminConfig,
  save: (c: import('@/lib/admin.types').AdminConfig) => Promise<void>,
): Promise<string | undefined> {
  const user = config.UserConfig.Users.find((u) => u.username === username);
  if (!user) return undefined;

  if (!user.tvboxToken) {
    user.tvboxToken = generateTvboxToken();
    await save(config);
  }

  return user.tvboxToken;
}
