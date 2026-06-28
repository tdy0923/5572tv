import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

export const runtime = 'nodejs';

const CACHE_DIR = join(process.cwd(), 'public', 'poster-cache');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
  for (const ext of extensions) {
    const filePath = join(CACHE_DIR, `${id}${ext}`);
    if (existsSync(filePath)) {
      const data = await readFile(filePath);
      const contentType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : 'image/jpeg';
      return new NextResponse(data, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control':
            'public, max-age=2592000, s-maxage=2592000, immutable',
          'Access-Control-Allow-Origin': '*',
          Vary: '',
        },
      });
    }
  }

  return new NextResponse('Not Found', { status: 404 });
}
