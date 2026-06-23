import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UNLIMITED_API_KEY =
  process.env.UNLIMITED_AI_KEY || 'ua_DyQKfu0RBU_Daj879dXqYpsczzCJH7q4';
const UNLIMITED_API_URL = 'https://unlimited.surf/api/chat';

async function generateSummary(
  title: string,
  description: string,
  year: string,
): Promise<{
  summary: string;
  highlights: string[];
  review: string;
}> {
  const systemPrompt = `你是一个专业的影视评论助手。根据影片信息生成简洁的摘要和评价。

返回 JSON 格式（不要返回 markdown 代码块）：
{
  "summary": "50字以内的剧情简介",
  "highlights": ["看点1", "看点2", "看点3"],
  "review": "一句话评价（20字以内）"
}

要求：
- summary：简洁概括核心剧情，不要剧透
- highlights：3个主要看点/卖点
- review：精炼的评价`;

  const userPrompt = `影片：${title}（${year}年）
简介：${description || '暂无简介'}`;

  try {
    const response = await fetch(UNLIMITED_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UNLIMITED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userPrompt,
        model: 'gateway-gpt-5-mini',
        systemPrompt,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.delta) fullResponse += data.delta;
            } catch {}
          }
        }
      }
    }

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { summary: description || '暂无摘要', highlights: [], review: '' };
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return { summary: description || '暂无摘要', highlights: [], review: '' };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const description = searchParams.get('description') || '';
  const year = searchParams.get('year') || '';

  if (!title) {
    return NextResponse.json({ error: '缺少标题参数' }, { status: 400 });
  }

  try {
    const summary = await generateSummary(title, description, year);
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('AI summary API error:', error);
    return NextResponse.json({ error: '摘要生成失败' }, { status: 500 });
  }
}
