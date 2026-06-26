/**
 * Agnes AI 视频生成 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createVideoTask, getVideoResult } from '@/lib/agnes-ai';

export const runtime = 'nodejs';

// 创建视频任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, imageUrl, width, height, numFrames, frameRate } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const result = await createVideoTask({
      prompt,
      imageUrl,
      width,
      height,
      numFrames,
      frameRate,
    });

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Video task creation error:', error);
    return NextResponse.json(
      { error: 'Video task creation failed' },
      { status: 500 }
    );
  }
}

// 获取视频结果
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const videoId = searchParams.get('video_id');

    if (!videoId) {
      return NextResponse.json({ error: 'Missing video_id' }, { status: 400 });
    }

    const result = await getVideoResult(videoId);

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Video result fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to get video result' },
      { status: 500 }
    );
  }
}
