/* eslint-disable no-console */
import { NextResponse } from 'next/server';

import {
  applyShortDramaCacheHeaders,
  SHORTDRAMA_CACHE_SECONDS,
} from '@/lib/shortdrama-constants';
import { getAllCategories } from '@/lib/shortdrama-sources';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 并行验证分类是否有内容（带并发限制）
async function validateCategoriesHasContent(
  categories: { type_id: number; type_name: string; source: string }[],
  concurrency = 5,
): Promise<{ type_id: number; type_name: string; source: string }[]> {
  const results: { type_id: number; type_name: string; source: string }[] = [];

  // 分批并行处理，每批 concurrency 个
  for (let i = 0; i < categories.length; i += concurrency) {
    const batch = categories.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (cat) => {
        try {
          // 根据源名称找到对应的 API
          const sourceConfig = (
            await import('@/lib/shortdrama-sources')
          ).SHORT_DRAMA_SOURCES.find((s) => s.name === cat.source);
          if (!sourceConfig) return null;

          const testUrl = `${sourceConfig.api}?ac=detail&t=${cat.type_id}&pg=1`;
          const testResponse = await fetch(testUrl, {
            headers: {
              'User-Agent': DEFAULT_USER_AGENT,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          });

          if (testResponse.ok) {
            const testData = await testResponse.json();
            const itemCount = testData.list?.length || testData.total || 0;
            return itemCount > 0 ? cat : null;
          }
          return null;
        } catch {
          return cat;
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
    // 从多源配置获取所有分类
    const allCategories = getAllCategories();
    console.log(`📋 [CATEGORIES] 从 ${allCategories.length} 个分类`);

    // 并行验证分类是否有内容
    const validatedCategories =
      await validateCategoriesHasContent(allCategories);

    console.log(`📋 [CATEGORIES] 验证后 ${validatedCategories.length} 个分类`);

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
