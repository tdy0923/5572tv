import { isNonRoutableHost, resolvePublicBaseUrl } from '../site-url';

describe('isNonRoutableHost', () => {
  it.each([
    ['0.0.0.0:3000', true],
    ['localhost:3000', true],
    ['127.0.0.1:3000', true],
    ['10.1.2.3', true],
    ['192.168.1.10', true],
    ['172.20.0.2:3000', true],
    ['www.5572.net', false],
    ['example.com:8443', false],
  ])('classifies %s as %s', (host, expected) => {
    expect(isNonRoutableHost(host as string)).toBe(expected as boolean);
  });
});

describe('resolvePublicBaseUrl', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prefers a routable request host', () => {
    jest.replaceProperty(process, 'env', { ...process.env });
    expect(resolvePublicBaseUrl('www.5572.net', 'https')).toBe(
      'https://www.5572.net',
    );
  });

  it('falls back to SITE_BASE for container hosts', () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      SITE_BASE: 'https://www.5572.net',
    });
    expect(resolvePublicBaseUrl('0.0.0.0:3000', 'http')).toBe(
      'https://www.5572.net',
    );
  });

  it('uses the request host when no SITE_BASE exists', () => {
    const env = { ...process.env };
    delete env.SITE_BASE;
    jest.replaceProperty(process, 'env', env);
    expect(resolvePublicBaseUrl('0.0.0.0:3000', 'http')).toBe(
      'http://0.0.0.0:3000',
    );
  });
});
