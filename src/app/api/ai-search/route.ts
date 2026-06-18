/* eslint-disable no-console */

/**
 * AI Search Assistant API
 * Uses AI to convert natural language queries to searchable titles
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface AiSearchResult {
  query: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  year?: string;
  type?: 'movie' | 'tv' | 'show' | 'unknown';
}

interface AiSearchResponse {
  answer: string;
  candidates: AiSearchResult[];
  suggestions?: string[];
}

/**
 * System prompt for AI assistant
 */
const SYSTEM_PROMPT = `You are a movie/TV search assistant. Your job is to turn a user's natural-language request into concrete movie, TV series, or variety-show search candidates.

Rules:
1. Must return concrete Chinese titles (not English descriptions)
2. Max 5 candidates
3. No tool calls or web browsing
4. Unrelated queries → return empty candidates with a follow-up suggestion
5. Output JSON format only`;

/**
 * Build user prompt
 */
function buildUserPrompt(query: string): string {
  return `用户想找片：${query}

请直接给出最可能的片名候选，优先输出具体片名，不要输出工具调用、联网验证计划或额外解释。

返回格式：
{
  "answer": "简短中文描述",
  "candidates": [
    {
      "query": "搜索关键词",
      "reason": "简短原因",
      "confidence": "low|medium|high",
      "year": "可选年份",
      "type": "movie|tv|show|unknown"
    }
  ],
  "suggestions": ["可选的后续搜索建议"]
}`;
}

/**
 * Parse AI response
 */
function parseAiResponse(response: string): AiSearchResponse {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  // Fallback: treat entire response as search query
  return {
    answer: response.slice(0, 100),
    candidates: [
      {
        query: response.slice(0, 50),
        reason: 'AI建议',
        confidence: 'low',
      },
    ],
  };
}

/**
 * Extract keywords from natural language
 */
function extractKeywords(query: string): string[] {
  const keywords: string[] = [];

  // Remove common words
  const cleaned = query
    .replace(/[我想看我要找帮我找搜索一下有什么好看的]/g, '')
    .replace(/[的了吗呢吧啊哦呀]/g, '')
    .trim();

  // Split by common separators
  const parts = cleaned.split(/[\s,，、]+/);

  for (const part of parts) {
    if (part.length > 0) {
      keywords.push(part);
    }
  }

  return keywords;
}

/**
 * Detect content type from query
 */
function detectContentType(query: string): 'movie' | 'tv' | 'show' | 'unknown' {
  const lower = query.toLowerCase();

  if (
    lower.includes('电影') ||
    lower.includes('片') ||
    lower.includes('大电影')
  ) {
    return 'movie';
  }
  if (
    lower.includes('剧') ||
    lower.includes('连续剧') ||
    lower.includes('电视剧')
  ) {
    return 'tv';
  }
  if (
    lower.includes('综艺') ||
    lower.includes('节目') ||
    lower.includes('真人秀')
  ) {
    return 'show';
  }

  return 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing q parameter' },
        { status: 400 },
      );
    }

    // Simple keyword extraction without AI
    const keywords = extractKeywords(query);
    const contentType = detectContentType(query);

    // Build response
    const response: AiSearchResponse = {
      answer: `正在搜索: ${query}`,
      candidates: keywords.map((kw) => ({
        query: kw,
        reason: '关键词提取',
        confidence: 'medium' as const,
        type: contentType,
      })),
      suggestions: [`搜索 "${keywords.join(' ')}"`, `搜索 "${query}"`],
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
