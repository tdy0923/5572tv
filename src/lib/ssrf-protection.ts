/**
 * SSRF Protection utility — blocks requests to internal/private IPs
 */

function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  if (
    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[0-2][0-7])\.)/.test(
      hostname,
    )
  ) {
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
