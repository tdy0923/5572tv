import crypto from 'crypto';
import { NextResponse } from 'next/server';

export function middleware(_request: Request) {
  const response = NextResponse.next();

  // Generate a random nonce for this request
  const nonce = crypto.randomBytes(16).toString('base64');

  // Set CSP header with nonce
  const csp = `default-src 'self' https: http:; script-src 'self' 'nonce-${nonce}' https://tg.yunku.de https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: data: blob:; media-src 'self' https: http: blob:; connect-src 'self' https: http:; font-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'none';`;

  response.headers.set('Content-Security-Policy', csp);
  // Store nonce in a header so layout.tsx can read it
  response.headers.set('x-csp-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)',
  ],
};
