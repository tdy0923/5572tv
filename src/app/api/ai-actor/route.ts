import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UNLIMITED_API_KEY =
  process.env.UNLIMITED_AI_KEY || 'ua_DyQKfu0RBU_Daj879dXqYpsczzCJH7q4';
const UNLIMITED_API_URL = 'https://unlimited.surf/api/chat';

async function analyzeActor(actorName: string): Promise<{
  biography: string;
  famousWorks: string[];
  collaborators: string[];
  style: string;
}> {
  const systemPrompt = `你是一个影视行业分析师。根据演员名字，提供简洁的分析。

返回 JSON 格式（不要返回 markdown 代码块）：
{
  "biography": "30字以内的简介",
  "famousWorks": ["代表作1", "代表作2", "代表作3"],
  "collaborators": ["常合作演员1", "常合作演员2"],
  "style": "表演风格描述（20字以内）"
}`;

  const userPrompt = `演员：${actorName}`;

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

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

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

    return { biography: '', famousWorks: [], collaborators: [], style: '' };
  } catch (error) {
    console.error('AI actor analysis failed:', error);
    return { biography: '', famousWorks: [], collaborators: [], style: '' };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const actorName = searchParams.get('name');

  if (!actorName) {
    return NextResponse.json({ error: '缺少演员名字参数' }, { status: 400 });
  }

  try {
    const analysis = await analyzeActor(actorName);
    return NextResponse.json({ success: true, ...analysis });
  } catch (error) {
    console.error('AI actor analysis API error:', error);
    return NextResponse.json({ error: '分析失败' }, { status: 500 });
  }
}
