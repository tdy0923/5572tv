import {
  hashPassword,
  isHashed,
  isSha256Hash,
  verifyPassword,
} from '@/lib/password';

describe('password', () => {
  const testPassword = 'testPassword123!@#';

  it('should hash and verify password correctly', async () => {
    const hashed = await hashPassword(testPassword);
    expect(hashed).not.toBe(testPassword);
    expect(hashed).toContain(':');
    expect(isHashed(hashed)).toBe(true);

    const valid = await verifyPassword(testPassword, hashed);
    expect(valid).toBe(true);

    const invalid = await verifyPassword('wrongPassword', hashed);
    expect(invalid).toBe(false);
  });

  it('should produce different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword(testPassword);
    const hash2 = await hashPassword(testPassword);
    expect(hash1).not.toBe(hash2);
  });

  it('should verify SHA-256 legacy format', async () => {
    const crypto = require('crypto');
    const sha256Hash = crypto
      .createHash('sha256')
      .update(testPassword)
      .digest('hex');

    expect(isSha256Hash(sha256Hash)).toBe(true);
    expect(isHashed(sha256Hash)).toBe(true);

    const valid = await verifyPassword(testPassword, sha256Hash);
    expect(valid).toBe(true);
  });

  it('should verify plaintext legacy format', async () => {
    const valid = await verifyPassword(testPassword, testPassword);
    expect(valid).toBe(true);

    const invalid = await verifyPassword('wrong', testPassword);
    expect(invalid).toBe(false);
  });

  it('should reject wrong-length hash format gracefully', async () => {
    const valid = await verifyPassword(testPassword, 'short:hash');
    expect(valid).toBe(false);
  });
});
