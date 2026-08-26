import { NextResponse } from 'next/server';

import {
  applyShortDramaCacheHeaders,
  SHORTDRAMA_CACHE_SECONDS,
} from '@/lib/shortdrama-constants';
import { getAllCategoriesWithSource } from '@/lib/shortdrama-sources';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 🚀 服务端内存缓存：分类探测（逐源请求）较慢，缓存 5 分钟避免每次请求都实时探测
let categoriesCache: { data: unknown; fetchedAt: number } | null = null;
const CATEGORIES_CACHE_TTL = 5 * 60 * 1000;

// 并行验证分类是否有内容（带并发限制）
async function validateCategoriesHasContent(
  categories: {
    type_id: number;
    type_name: string;
    source: string;
    source_api: string;
  }[],
  concurrency = 5,
): Promise<{ type_id: number; type_name: string; source: string }[]> {
  const results: { type_id: number; type_name: string; source: string }[] = [];

  // 分批并行处理，每批 concurrency 个
  for (let i = 0; i < categories.length; i += concurrency) {
    const batch = categories.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (cat) => {
        try {
          const testUrl = `${cat.source_api}?ac=detail&t=${cat.type_id}&pg=1`;
          const testResponse = await fetch(testUrl, {
            headers: {
              'User-Agent': DEFAULT_USER_AGENT,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(3000),
          });

          if (testResponse.ok) {
            const testData = await testResponse.json();
            const itemCount = testData.list?.length || testData.total || 0;
            return itemCount > 0
              ? {
                  type_id: cat.type_id,
                  type_name: cat.type_name,
                  source: cat.source,
                }
              : null;
          }
          return null;
        } catch {
          return {
            type_id: cat.type_id,
            type_name: cat.type_name,
            source: cat.source,
          };
        }
      }),
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });
  }

  return results;
}

export async function GET() {
  try {
    // 命中内存缓存直接返回
    if (
      categoriesCache &&
      Date.now() - categoriesCache.fetchedAt < CATEGORIES_CACHE_TTL
    ) {
      const cachedResponse = NextResponse.json(categoriesCache.data);
      return applyShortDramaCacheHeaders(
        cachedResponse,
        SHORTDRAMA_CACHE_SECONDS.categories,
      );
    }

    // 从多源配置获取所有分类（含主源自动发现）
    const allCategories = await getAllCategoriesWithSource();

    // 并行验证分类是否有内容
    const validatedCategories =
      await validateCategoriesHasContent(allCategories);

    categoriesCache = { data: validatedCategories, fetchedAt: Date.now() };

    const response = NextResponse.json(validatedCategories);
    return applyShortDramaCacheHeaders(
      response,
      SHORTDRAMA_CACHE_SECONDS.categories,
    );
  } catch (error) {
    console.error('获取短剧分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
