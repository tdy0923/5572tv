/**
 * Fetch Posters API
 * 从数据库获取海报URL列表，供批量下载使用
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const source = searchParams.get('source') || 'douban';
    const limit = parseInt(searchParams.get('limit') || '100');

    // 这里可以从数据库获取海报URL
    // 目前返回示例数据，实际部署时连接数据库
    const posters: string[] = [];

    // 返回URL列表供下载脚本使用
    return NextResponse.json({
      source,
      limit,
      count: posters.length,
      urls: posters,
      message: '请使用下载脚本 ./scripts/download-posters.sh',
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
