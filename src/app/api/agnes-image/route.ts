/**
 * Agnes AI 图片生成 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/agnes-ai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const result = await generateImage({
      prompt,
      size: size || '1024x768',
    });

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Image generation failed' },
      { status: 500 }
    );
  }
}
