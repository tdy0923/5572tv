/**
 * @jest-environment node
 */
import { isUrlSafe, isUrlSafeDeep } from '@/lib/ssrf-protection';

describe('ssrf-protection isUrlSafe (sync)', () => {
  const blocked = [
    'http://127.0.0.1:6379/',
    'http://localhost/admin',
    'http://10.0.0.5/x',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'not-a-url',
  ];
  blocked.forEach((u) => {
    it(`blocks ${u}`, () => {
      expect(isUrlSafe(u)).toBe(false);
    });
  });

  it('allows a public IP literal', () => {
    expect(isUrlSafe('https://8.8.8.8/dns-query')).toBe(true);
  });
});

describe('ssrf-protection isUrlSafeDeep (async)', () => {
  it('rejects internal/private targets', async () => {
    for (const u of [
      'http://127.0.0.1:6379/',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.1.2.3/',
      'http://metadata.google.internal/',
    ]) {
      await expect(isUrlSafeDeep(u)).resolves.toBe(false);
    }
  });

  it('allows a public IP literal without needing DNS', async () => {
    await expect(isUrlSafeDeep('https://8.8.8.8/x.jpg')).resolves.toBe(true);
  });
});
