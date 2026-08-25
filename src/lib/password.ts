import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SCRYPT_COST = 16384; // N
const BLOCK_SIZE = 8; // r
const PARALLELIZATION = 1; // p

interface ScryptOptions {
  N?: number;
  r?: number;
  p?: number;
  maxmem?: number;
}

// 异步 scrypt 包装（避免 scryptSync 阻塞事件循环）
function scryptAsync(
  password: string,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * 对密码进行加盐哈希，返回格式: `salt:hash`
 * 使用异步 scrypt，避免阻塞事件循环（scryptSync 可被多请求 DoS）
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
  });
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * 判断是否为 SHA-256 哈希格式（旧版 V2 使用）
 */
export function isSha256Hash(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

/**
 * 验证密码是否匹配存储的哈希值
 * 支持三种格式:
 * - 加盐哈希: `salt:hash` (scrypt，新格式)
 * - SHA-256 哈希: 64位十六进制 (旧 V2 格式)
 * - 明文密码 (最旧格式，兼容迁移期)
 */
export async function verifyPassword(
  password: string,
  storedValue: string,
): Promise<boolean> {
  const parts = storedValue.split(':');
  if (
    parts.length === 2 &&
    parts[0].length === SALT_LENGTH * 2 &&
    parts[1].length === KEY_LENGTH * 2
  ) {
    const [salt, storedHash] = parts;
    const hash = await scryptAsync(password, salt, KEY_LENGTH, {
      N: SCRYPT_COST,
      r: BLOCK_SIZE,
      p: PARALLELIZATION,
    });
    const storedHashBuf = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(hash, storedHashBuf);
  }
  // SHA-256 哈希格式（旧 V2 迁移期使用，无盐）
  if (parts.length === 1 && isSha256Hash(storedValue)) {
    const hash = createHash('sha256').update(password).digest('hex');
    return hash === storedValue;
  }
  // 旧格式：明文密码直接比较
  return storedValue === password;
}

/**
 * 判断存储的密码值是否已经过哈希处理
 */
export function isHashed(storedValue: string): boolean {
  const parts = storedValue.split(':');
  if (
    parts.length === 2 &&
    parts[0].length === SALT_LENGTH * 2 &&
    parts[1].length === KEY_LENGTH * 2
  ) {
    return true;
  }
  // SHA-256 哈希也被视为已哈希
  if (parts.length === 1 && isSha256Hash(storedValue)) {
    return true;
  }
  return false;
}
