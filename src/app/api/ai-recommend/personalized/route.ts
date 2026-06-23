import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UNLIMITED_API_KEY =
  process.env.UNLIMITED_AI_KEY || 'ua_DyQKfu0RBU_Daj879dXqYpsczzCJH7q4';
const UNLIMITED_API_URL = 'https://unlimited.surf/api/chat';

async function askAIForRecommendations(
  viewingHistory: string[],
  favoriteGenres: string[],
): Promise<string[]> {
  const systemPrompt = `你是一个影视推荐助手。根据用户的观看历史和偏好，推荐他们可能喜欢的影视内容。

返回 JSON 格式（不要返回 markdown 代码块）：
{
  "recommendations": ["推荐内容1", "推荐内容2", "推荐内容3", "推荐内容4", "推荐内容5"],
  "reasoning": "推荐理由"
}

示例：
观看历史：鱿鱼游戏, 犯罪都市, 汉江怪物
推荐：["甜蜜家园", "地狱公使", "僵尸校园", "遗赠之城", "狩猎"]
理由：用户喜欢韩国悬疑/惊悚类型`;

  const userPrompt = `观看历史：${viewingHistory.join(', ')}
偏好类型：${favoriteGenres.join(', ') || '未指定'}

请推荐5部类似的影视内容。`;

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
      signal: AbortSignal.timeout(15000),
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
              if (data.delta) {
                fullResponse += data.delta;
              }
            } catch {}
          }
        }
      }
    }

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.recommendations || [];
    }

    return [];
  } catch (error) {
    console.error('AI recommendation failed:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取用户播放记录
    const allRecords = await db.getAllPlayRecords(authInfo.username);
    const userRecords = Object.values(allRecords);

    if (userRecords.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: '暂无观看记录，无法生成推荐',
      });
    }

    // 提取观看历史（标题列表）
    const viewingHistory = userRecords
      .slice(0, 20)
      .map((record: any) => record.title)
      .filter(Boolean);

    // 提取偏好类型
    const typeCounts: Record<string, number> = {};
    userRecords.forEach((record: any) => {
      if (record.type_name) {
        typeCounts[record.type_name] = (typeCounts[record.type_name] || 0) + 1;
      }
    });
    const favoriteGenres = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type);

    // 调用 AI 获取推荐
    const recommendations = await askAIForRecommendations(
      viewingHistory,
      favoriteGenres,
    );

    return NextResponse.json({
      success: true,
      recommendations,
      viewingHistory: viewingHistory.slice(0, 10),
      favoriteGenres,
    });
  } catch (error) {
    console.error('AI personalized recommendation failed:', error);
    return NextResponse.json({ error: '推荐生成失败' }, { status: 500 });
  }
}
