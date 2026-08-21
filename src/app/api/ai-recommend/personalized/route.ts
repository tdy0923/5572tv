import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';
import { db } from '@/lib/db';
import { searchFromApi } from '@/lib/downstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AI_API_BASE = process.env.AI_API_BASE || 'https://apihub.agnes-ai.com/v1';
// Agnes 网关不支持 gpt-4o-mini（503 model_not_found），默认用其自有模型；
// 可通过 AI_MODEL 覆盖
const AI_MODEL = process.env.AI_MODEL || 'agnes-2.0-flash';
// 模型回退链：首选模型失败时依次尝试
const AI_MODEL_FALLBACKS = [AI_MODEL, 'agnes-2.0-flash'].filter(
  (m, i, arr) => m && arr.indexOf(m) === i,
);

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
  popularCandidates: string[] = [],
): Promise<string[]> {
  const isNewUser = viewingHistory.length === 0;
  const systemPrompt = `你是一个影视推荐助手。${
    isNewUser
      ? '用户是新访客，没有观看记录，请从网站热门内容中挑选值得推荐的影视。'
      : '根据用户的观看历史和偏好，推荐他们可能喜欢的影视内容。'
  }

返回 JSON 格式（不要返回 markdown 代码块）：
{
  "recommendations": ["推荐内容1", "推荐内容2", "...多个"],
  "reasoning": "推荐理由"
}

示例：
观看历史：鱿鱼游戏, 犯罪都市, 汉江怪物
推荐：["甜蜜家园", "地狱公使", "僵尸校园", "遗赠之城", "狩猎", "王国", "他人即地狱", "窥探"]
理由：用户喜欢韩国悬疑/惊悚类型`;

  const userPrompt = `观看历史：${viewingHistory.join(', ') || '无'}
偏好类型：${favoriteGenres.join(', ') || '未指定'}
${
  popularCandidates.length > 0
    ? `网站当前热门内容（可从中挑选合适的推荐）：${popularCandidates.join(', ')}`
    : ''
}

请推荐所有相关的影视内容，${isNewUser ? '优先从网站热门内容中挑选，' : ''}数量由你根据相关性自行决定，至少5部，推荐列表要足够丰富。`;

  if (!AI_KEYS.length) return [];

  const errors: string[] = [];
  // 遍历模型回退链 × key 轮询，任一组合成功即返回
  for (const model of AI_MODEL_FALLBACKS) {
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
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          errors.push(
            `model=${model} Key attempt ${attempt + 1}: ${response.status}`,
          );
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.recommendations?.length) {
              return parsed.recommendations;
            }
          } catch {
            // AI 返回非法 JSON，继续尝试
          }
        }
      } catch (error: any) {
        errors.push(
          `model=${model} Key attempt ${attempt + 1}: ${error.message}`,
        );
      }
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

// 兜底：内部 trending 调用失败时直接拉豆瓣热门，保证永不返回空
async function fetchDoubanTrending(): Promise<any[]> {
  try {
    const res = await fetch(
      'https://movie.douban.com/j/search_subjects?type=tv&tag=热门&sort=recommend&page_limit=20&page_start=0',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://movie.douban.com/',
        },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.subjects || []).map((item: any) => ({
      title: item.title,
      poster: item.cover ? item.cover.replace('/s_ratio_poster/', '/l/') : '',
      year: '',
      rate: item.rate || '',
      source: 'douban',
      id: item.id || '',
      type: 'movie',
    }));
  } catch {
    return [];
  }
}

// 拉取热门候选标题（喂给AI做冷启动，或极少数无AI时的兜底）
async function getPopularCandidates(): Promise<string[]> {
  let items: any[] = [];
  try {
    // 优先内部直连自身（localhost）拉取热门，避免经公网域名被 CDN/WAF 拦截
    const trendingRes = await fetch(
      `http://127.0.0.1:${process.env.PORT || 3000}/api/trending`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (trendingRes.ok) {
      const trending = await trendingRes.json();
      for (const group of trending.results || []) {
        for (const item of group.items || []) {
          items.push({
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
    }
  } catch {}
  // 内部调用失败时直接拉豆瓣兜底
  if (items.length === 0) {
    items = await fetchDoubanTrending();
  }
  return items.map((i) => i.title).filter(Boolean);
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

    // 热门候选：新用户作冷启动，老用户作 AI 参考
    const popularCandidates = await getPopularCandidates();

    // 全程 AI 接管：无观看历史也喂热门候选让 AI 推荐
    let titles: string[];
    if (AI_KEYS.length > 0) {
      titles = await askAIForRecommendations(
        viewingHistory,
        favoriteGenres,
        popularCandidates,
      );
    } else if (popularCandidates.length > 0) {
      // 无 AI 密钥时的兜底：用全部热门候选，不做数量截断
      titles = popularCandidates;
    } else {
      titles = viewingHistory;
    }

    // AI 无结果显示（如密钥失效），让前端隐藏该区块而非展示占位
    if (titles.length === 0) {
      return emptyRecommendation();
    }

    const recommendations = await enrichRecommendations(titles);

    if (recommendations.length === 0) {
      return emptyRecommendation();
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
    return emptyRecommendation();
  }
}

// 无推荐结果时返回空数组，前端据此隐藏整个区块
function emptyRecommendation(): NextResponse {
  return NextResponse.json({ success: true, recommendations: [] });
}
