/* eslint-disable no-console */

/**
 * Bilibili Search API
 * Based on LunaTV implementation
 *
 * Provides Bilibili video search functionality
 */

import { NextRequest, NextResponse } from 'next/server';

import { getBilibiliVideoInfo, searchBilibili } from '@/lib/bilibili-wbi';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const bvid = searchParams.get('bvid');

    if (!keyword && !bvid) {
      return NextResponse.json(
        { error: 'Missing keyword or bvid parameter' },
        { status: 400 },
      );
    }

    // Get video info by BVid
    if (bvid) {
      try {
        const videoInfo = await getBilibiliVideoInfo(bvid);
        return NextResponse.json({
          ok: true,
          data: {
            bvid: videoInfo.bvid,
            title: videoInfo.title,
            description: videoInfo.desc,
            owner: videoInfo.owner?.name || '',
            pic: videoInfo.pic,
            duration: videoInfo.duration,
            view: videoInfo.stat?.view || 0,
            danmaku: videoInfo.stat?.danmaku || 0,
            pages:
              videoInfo.pages?.map((p: any) => ({
                cid: p.cid,
                page: p.page,
                part: p.part,
                duration: p.duration,
              })) || [],
          },
        });
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message || 'Failed to get video info' },
          { status: 500 },
        );
      }
    }

    // Search Bilibili
    if (!keyword) {
      return NextResponse.json(
        { error: 'Missing keyword parameter' },
        { status: 400 },
      );
    }

    try {
      const result = await searchBilibili(keyword, page, pageSize);

      // Extract video results
      const videos = result.data?.result || [];

      const formattedResults = videos
        .filter((v: any) => v.type === 'video')
        .map((v: any) => ({
          bvid: v.bvid,
          title: v.title?.replace(/<[^>]+>/g, '') || '',
          description: v.description || '',
          owner: v.author || '',
          pic: v.pic?.startsWith('//') ? `https:${v.pic}` : v.pic || '',
          duration: v.duration || '',
          view: v.play || 0,
          danmaku: v.danmaku || 0,
          pubdate: v.pubdate || 0,
          tag: v.tag || '',
        }));

      return NextResponse.json({
        ok: true,
        data: {
          keyword,
          page,
          pageSize,
          total: result.data?.numResults || 0,
          results: formattedResults,
        },
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message || 'Search failed' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Bilibili search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
