import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { join } from 'path';

const APK_PATH = join(
  process.cwd(),
  'public',
  'download',
  '5572tv-android.apk',
);

export async function GET() {
  try {
    const buffer = await readFile(APK_PATH);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="5572tv-android.apk"',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'APK not found' }, { status: 404 });
  }
}
