/**
 * SSRF Protection utility — blocks requests to internal/private IPs
 */

import dns from 'dns/promises';

function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  if (
    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[0-2][0-7])\.)/.test(
      hostname,
    )
  ) {
    return true;
  }
  // IPv4 benchmark/test ranges (198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24)
  if (/^198\.1[89]\./.test(hostname)) {
    return true;
  }
  if (/^198\.51\.100\./.test(hostname)) {
    return true;
  }
  if (/^203\.0\.113\./.test(hostname)) {
    return true;
  }
  // IPv6 private ranges
  if (/^(fc|fd|fe80|::1|::)/i.test(hostname)) {
    return true;
  }
  // Common internal hostnames
  if (
    ['localhost', 'metadata.google.internal', '169.254.169.254'].includes(
      hostname,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Validates that a URL does not point to an internal/private IP.
 * Returns true if the URL is safe (not SSRF), false if it should be blocked.
 */
export function isUrlSafe(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname;
    return !isPrivateIP(hostname);
  } catch {
    // Invalid URLs are blocked
    return false;
  }
}

/**
 * Get the reason why a URL is blocked (for error messages)
 */
export function getSsrfBlockReason(targetUrl: string): string | null {
  try {
    const parsed = new URL(targetUrl);
    if (isPrivateIP(parsed.hostname)) {
      return `Access to private/internal IP '${parsed.hostname}' is not allowed`;
    }
    return null;
  } catch {
    return 'Invalid URL';
  }
}

/**
 * Enhanced SSRF check with DNS resolution.
 * Performs both hostname string matching AND DNS resolution to defend against DNS rebinding.
 * Returns true if the URL is safe, false if it should be blocked.
 */
export async function isUrlSafeDeep(targetUrl: string): Promise<boolean> {
  // First pass: fast string-based check
  if (!isUrlSafe(targetUrl)) return false;

  // Second pass: DNS resolution check
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname;

    // Skip DNS check for bare IP addresses (already checked by isUrlSafe)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return true;
    if (/^\[?[0-9a-f:]+\]?$/i.test(hostname)) return true;

    // Resolve IPv4 addresses
    const addresses = await dns.resolve4(hostname).catch(() => []);
    for (const ip of addresses) {
      if (isPrivateIP(ip)) return false;
    }

    // Resolve IPv6 addresses
    const v6addresses = await dns.resolve6(hostname).catch(() => []);
    for (const ip of v6addresses) {
      if (isPrivateIP(ip)) return false;
    }

    return true;
  } catch {
    // DNS resolution failure — allow through (conservative: don't block on DNS failure)
    return true;
  }
}
