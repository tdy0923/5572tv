function hostPart(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(1).split(']')[0];
  return h.split(':')[0];
}

export function isNonRoutableHost(host: string): boolean {
  const h = hostPart(host);
  if (h === '' || h === '0.0.0.0' || h === 'localhost') return true;
  const v4 = h.split('.');
  if (v4.length === 4 && v4.every((p) => /^\d+$/.test(p) && Number(p) < 256)) {
    const [a, b] = v4.map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

export function resolvePublicBaseUrl(
  host: string | null | undefined,
  proto: string | null | undefined,
): string {
  if (host && !isNonRoutableHost(host)) {
    const scheme = (proto || 'https').split(',')[0].trim() || 'https';
    return `${scheme}://${host}`;
  }
  const site = process.env.SITE_BASE?.replace(/\/$/, '');
  if (site) return site;
  if (host) {
    const scheme = (proto || 'https').split(',')[0].trim() || 'https';
    return `${scheme}://${host}`;
  }
  return '';
}
