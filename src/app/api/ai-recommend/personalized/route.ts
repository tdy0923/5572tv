import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';
import { db } from '@/lib/db';
import { searchFromApi } from '@/lib/downstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UNLIMITED_API_KEY = process.env.UNLIMITED_AI_KEY || '';
const UNLIMITED_API_URL = 'https://unlimited.surf/api/chat';

// 内存缓存，避免频繁调用AI API
const recommendationCache = new Map<
  string,
  { data: any[]; timestamp: number }
>();
const CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

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

  if (!UNLIMITED_API_KEY) return [];

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
      signal: AbortSignal.timeout(8000), // 减少到8秒超时
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

async function enrichRecommendations(titles: string[]) {
  const apiSites = await getAvailableApiSites();
  if (!apiSites.length || !titles.length) return [];

  // 并行搜索所有标题，但限制并发数避免过载
  const searchPromises = titles.map(async (title) => {
    try {
      const results = await Promise.race([
        searchFromApi(apiSites[0], title, [title]),
        new Promise<[]>(
          (_, rej) => setTimeout(() => rej(new Error('timeout')), 3000), // 减少到3秒超时
        ),
      ]);
      if (results && results.length > 0) {
        const match =
          results.find((r: any) => r.title && r.title.includes(title)) ||
          results[0];
        return {
          title: match.title || title,
          poster: match.poster || '',
          year: match.year || '',
          rate: (match as any).rate || '',
          source: match.source || '',
          id: match.id || '',
          type: (match as any).type_name || 'movie',
        };
      }
    } catch {}
    return {
      title,
      poster: '',
      year: '',
      rate: '',
      source: '',
      id: '',
      type: 'movie',
    };
  });

  return Promise.all(searchPromises);
}

// 从热门数据随机推荐（兜底方案）
async function getTrendingFallback(
  request: NextRequest,
  cacheKey: string,
): Promise<NextResponse> {
  try {
    const trendingRes = await fetch(
      `${new URL(request.url).origin}/api/trending`,
    );
    if (trendingRes.ok) {
      const trending = await trendingRes.json();
      const allItems: any[] = [];
      for (const group of trending.results || []) {
        for (const item of group.items || []) {
          allItems.push({
            title: item.title || item.vod_name,
            poster: item.poster || item.vod_pic || '',
            year: item.year || '',
            rate: item.rate || '',
            source: item.source || 'douban',
            id: item.id || '',
            type: item.type_name || 'movie',
          });
        }
      }
      const shuffled = allItems.sort(() => Math.random() - 0.5).slice(0, 6);
      recommendationCache.set(cacheKey, {
        data: shuffled,
        timestamp: Date.now(),
      });
      return NextResponse.json({
        success: true,
        recommendations: shuffled,
      });
    }
  } catch {}
  return NextResponse.json({ success: true, recommendations: [] });
}

export async function GET(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 检查缓存
    const cacheKey = authInfo.username;
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, recommendations: cached.data });
    }

    const allRecords = await db.getAllPlayRecords(authInfo.username);
    const userRecords = Object.values(allRecords);

    // 没有播放记录时，从热门数据中随机推荐
    if (userRecords.length === 0) {
      return await getTrendingFallback(request, cacheKey);
    }

    const viewingHistory = userRecords
      .slice(0, 20)
      .map((record: any) => record.title)
      .filter(Boolean);

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

    let titles: string[];
    // 没有配置 AI Key 时直接回退到热门推荐，而不是返回空
    if (!UNLIMITED_API_KEY) {
      titles = [];
    } else {
      titles = await askAIForRecommendations(viewingHistory, favoriteGenres);
    }
    const recommendations = await enrichRecommendations(titles);

    // AI 推荐无结果时，回退到热门推荐兜底
    if (recommendations.length === 0) {
      return await getTrendingFallback(request, cacheKey);
    }

    // 缓存结果
    recommendationCache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now(),
    });

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
