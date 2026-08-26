import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WALLPAPER_CACHE_SECONDS = 60 * 60;

function createWallpaperResponse(payload: {
  url: string;
  copyright: string;
  title: string;
  source: string;
}) {
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': `public, max-age=${WALLPAPER_CACHE_SECONDS}, s-maxage=${WALLPAPER_CACHE_SECONDS}, stale-while-revalidate=86400`,
      'CDN-Cache-Control': `public, s-maxage=${WALLPAPER_CACHE_SECONDS}`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${WALLPAPER_CACHE_SECONDS}`,
    },
  });
}

export async function GET() {
  try {
    // 随机选择壁纸来源：70% Bing, 30% Lorem Picsum
    const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const useBing = hourBucket % 10 < 7;

    if (useBing) {
      // Bing 随机壁纸（从过去 0-7 天中随机选择）
      const randomIdx = hourBucket % 8;
      const response = await fetch(
        `https://www.bing.com/HPImageArchive.aspx?format=js&idx=${randomIdx}&n=1&mkt=zh-CN`,
        {
          next: { revalidate: WALLPAPER_CACHE_SECONDS },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Bing wallpaper');
      }

      const data = await response.json();

      if (data.images && data.images[0]) {
        const imageUrl = `https://www.bing.com${data.images[0].url}`;

        return createWallpaperResponse({
          url: imageUrl,
          copyright: data.images[0].copyright,
          title: data.images[0].title,
          source: 'bing',
        });
      }
    }

    // 如果 Bing 失败或选择了 Lorem Picsum
    // Lorem Picsum 随机壁纸（高质量，1920x1080）
    const loremUrl = `https://picsum.photos/1920/1080?random=${hourBucket}`;

    return createWallpaperResponse({
      url: loremUrl,
      copyright: 'Lorem Picsum - Free random images',
      title: 'Random Photo',
      source: 'picsum',
    });
  } catch (error) {
    console.error('Error fetching wallpaper:', error);

    // 如果出错，返回 Lorem Picsum 作为备用
    const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const loremUrl = `https://picsum.photos/1920/1080?random=${hourBucket}`;
    return createWallpaperResponse({
      url: loremUrl,
      copyright: 'Lorem Picsum - Free random images',
      title: 'Random Photo',
      source: 'picsum',
    });
  }
}
