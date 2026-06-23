import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UNLIMITED_API_KEY =
  process.env.UNLIMITED_AI_KEY || 'ua_DyQKfu0RBU_Daj879dXqYpsczzCJH7q4';
const UNLIMITED_API_URL = 'https://unlimited.surf/api/chat';

interface SearchResult {
  id: string;
  title: string;
  poster: string;
  year: string;
  rate: string;
  type: string;
  source: string;
}

async function askAI(query: string): Promise<{
  keywords: string[];
  genre: string[];
  mood: string[];
  yearRange?: { min?: number; max?: number };
  excludeKeywords: string[];
}> {
  const systemPrompt = `你是一个影视搜索助手。用户会用自然语言描述想看的内容，你需要提取搜索关键词。

返回 JSON 格式（不要返回 markdown 代码块）：
{
  "keywords": ["搜索关键词1", "搜索关键词2"],
  "genre": ["类型"],
  "mood": ["情绪/氛围"],
  "yearRange": {"min": 2020, "max": 2026},
  "excludeKeywords": ["排除的关键词"]
}

示例：
用户：找一部韩剧讲女总裁复仇的
返回：{"keywords":["女总裁","复仇","韩剧"],"genre":["drama"],"mood":["复仇","职场"],"excludeKeywords":[]}

用户：类似鱿鱼游戏的悬疑剧
返回：{"keywords":["鱿鱼游戏","悬疑"],"genre":["thriller","drama"],"mood":["悬疑","紧张"],"excludeKeywords":[]}

用户：轻松搞笑的国产剧
返回：{"keywords":["轻松","搞笑"],"genre":["comedy"],"mood":["轻松","搞笑"],"excludeKeywords":[]}`;

  try {
    const response = await fetch(UNLIMITED_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UNLIMITED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        model: 'gateway-gpt-5-mini',
        systemPrompt,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    // Read SSE response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Parse SSE data frames
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

    // Extract JSON from response
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: treat the whole response as keywords
    return {
      keywords: [query],
      genre: [],
      mood: [],
      excludeKeywords: [],
    };
  } catch (error) {
    console.error('AI parsing failed:', error);
    return {
      keywords: [query],
      genre: [],
      mood: [],
      excludeKeywords: [],
    };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: '缺少查询参数 q' }, { status: 400 });
  }

  try {
    // Step 1: AI 解析用户意图
    const parsed = await askAI(query);

    // Step 2: 构建搜索关键词（合并所有提取的关键词）
    const allKeywords = [
      ...parsed.keywords,
      ...parsed.genre,
      ...parsed.mood,
    ].filter((k) => k && k.length > 0);

    // Step 3: 调用内部搜索 API
    const searchQuery = allKeywords.join(' ');
    const searchResponse = await fetch(
      `${request.nextUrl.origin}/api/search?q=${encodeURIComponent(searchQuery)}`,
      {
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!searchResponse.ok) {
      return NextResponse.json({ error: '搜索失败', parsed }, { status: 500 });
    }

    const searchData = await searchResponse.json();

    // Step 4: 返回结果
    return NextResponse.json({
      success: true,
      query: searchQuery,
      parsed,
      results: searchData.results || [],
      totalResults: (searchData.results || []).length,
    });
  } catch (error) {
    console.error('AI search failed:', error);
    return NextResponse.json({ error: 'AI 搜索失败' }, { status: 500 });
  }
}
