import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { title, episode, plot } = await request.json();

    if (!title) {
      return NextResponse.json({ error: '缺少标题' }, { status: 400 });
    }

    const config = await getConfig();
    const aiConfig = config.AIRecommendConfig;

    if (!aiConfig?.enabled || !aiConfig?.apiKey) {
      return NextResponse.json({ error: 'AI 未配置' }, { status: 400 });
    }

    const prompt = plot
      ? `请用中文为以下剧集生成一个简洁的剧情摘要（不超过100字）：\n剧名：${title}\n集数：${episode || '第1集'}\n剧情：${plot}`
      : `请用中文为以下剧集生成一个简洁的剧情摘要（不超过100字）：\n剧名：${title}\n集数：${episode || '第1集'}`;

    const response = await fetch(`${aiConfig.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI 请求失败' }, { status: 502 });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || '无法生成摘要';

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: '生成摘要失败' }, { status: 500 });
  }
}
