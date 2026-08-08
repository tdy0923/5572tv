import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';
import { db } from '@/lib/db';
import { searchFromApi } from '@/lib/downstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AI_API_BASE = process.env.AI_API_BASE || 'https://apihub.agnes-ai.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

const AI_KEYS = [
  process.env.AI_API_KEY_1,
  process.env.AI_API_KEY_2,
  process.env.AI_API_KEY_3,
  process.env.AI_API_KEY_4,
  process.env.AI_API_KEY_5,
  process.env.AI_API_KEY_6,
].filter(Boolean) as string[];

// Fallback to single key env vars
if (AI_KEYS.length === 0) {
  const single =
    process.env.AI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    '';
  if (single) AI_KEYS.push(single);
}

let keyIndex = 0;
function getNextKey(): string {
  const key = AI_KEYS[keyIndex % AI_KEYS.length];
  keyIndex++;
  return key;
}

const recommendationCache = new Map<
  string,
  { data: any[]; timestamp: number }
>();
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 1000; // 最大缓存用户数

// 清理过期/超限条目，防止内存无限增长
function pruneRecommendationCache() {
  const now = Date.now();
  for (const [username, entry] of recommendationCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL)
      recommendationCache.delete(username);
  }
  if (recommendationCache.size > CACHE_MAX) {
    const sorted = Array.from(recommendationCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );
    const excess = recommendationCache.size - CACHE_MAX;
    for (let i = 0; i < excess; i++) {
      recommendationCache.delete(sorted[i][0]);
    }
  }
}

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

  if (!AI_KEYS.length) return [];

  const errors: string[] = [];
  // Try each key in round-robin, up to all keys
  for (let attempt = 0; attempt < AI_KEYS.length; attempt++) {
    const apiKey = getNextKey();
    try {
      const response = await fetch(`${AI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        errors.push(`Key attempt ${attempt + 1}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.recommendations?.length) {
          return parsed.recommendations;
        }
      }
      return [];
    } catch (error: any) {
      errors.push(`Key attempt ${attempt + 1}: ${error.message}`);
    }
  }

  console.error('AI recommendation all keys failed:', errors);
  return [];
}

async function enrichRecommendations(titles: string[]) {
  const apiSites = await getAvailableApiSites();
  if (!apiSites.length || !titles.length) return [];

  const searchPromises = titles.map(async (title) => {
    try {
      const results = await Promise.race([
        searchFromApi(apiSites[0], title, [title]),
        new Promise<[]>((_, rej) =>
          setTimeout(() => rej(new Error('timeout')), 3000),
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
      if (recommendationCache.size > CACHE_MAX) {
        pruneRecommendationCache();
      }
      return NextResponse.json({ success: true, recommendations: shuffled });
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

    const cacheKey = authInfo.username;
    const cached = recommendationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, recommendations: cached.data });
    }
    // 缓存未命中时定期清理
    if (recommendationCache.size > CACHE_MAX) {
      pruneRecommendationCache();
    }

    const allRecords = await db.getAllPlayRecords(authInfo.username);
    const userRecords = Object.values(allRecords);

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
    if (AI_KEYS.length > 0) {
      titles = await askAIForRecommendations(viewingHistory, favoriteGenres);
    } else {
      titles = viewingHistory.slice(0, 6);
    }
    const recommendations = await enrichRecommendations(titles);

    if (recommendations.length === 0) {
      return await getTrendingFallback(request, cacheKey);
    }

    recommendationCache.set(cacheKey, {
      data: recommendations,
      timestamp: Date.now(),
    });
    if (recommendationCache.size > CACHE_MAX) {
      pruneRecommendationCache();
    }

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
