/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { ensureAdmin } from '@/lib/admin-auth';
import { cleanupExpiredCache, getCacheStats } from '@/lib/video-cache';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await ensureAdmin(request);
    const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;

    if (storageType !== 'kvrocks') {
      return NextResponse.json(
        {
          code: 400,
          message: '当前存储类型不支持视频缓存清理',
        },
        { status: 400 },
      );
    }

    console.log('[VideoCache] 开始清理过期缓存...');
    await cleanupExpiredCache();

    const stats = await getCacheStats();

    return NextResponse.json({
      code: 200,
      message: '清理完成',
      data: {
        totalSize: stats.totalSize,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
        fileCount: stats.fileCount,
        maxSizeMB: (stats.maxSize / 1024 / 1024).toFixed(2),
      },
    });
  } catch (error) {
    console.error('[VideoCache] 清理失败:', error);
    return NextResponse.json(
      {
        code: 500,
        message: '清理失败',
      },
      { status: 500 },
    );
  }
}
