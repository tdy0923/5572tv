/* eslint-disable no-console */
import { NextResponse } from 'next/server';

import {
  applyShortDramaCacheHeaders,
  DEFAULT_SHORT_DRAMA_API,
  isExcludedCategory,
  isShortDramaCategory,
  SHORTDRAMA_CACHE_SECONDS,
} from '@/lib/shortdrama-constants';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 并行验证分类是否有内容（带并发限制）
async function validateCategoriesHasContent(
  categories: { type_id: number; type_name: string }[],
  api: string,
  concurrency = 5,
): Promise<{ type_id: number; type_name: string }[]> {
  const results: { type_id: number; type_name: string }[] = [];

  // 分批并行处理，每批 concurrency 个
  for (let i = 0; i < categories.length; i += concurrency) {
    const batch = categories.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (cat) => {
        try {
          const testUrl = `${api}?ac=detail&t=${cat.type_id}&pg=1`;
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
          // 如果检查失败，仍然保留该分类
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

// 从单个源获取短剧分类
async function getCategoriesFromSource(
  api: string,
): Promise<{ type_id: number; type_name: string }[]> {
  const response = await fetch(`${api}?ac=list`, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const categories = data.class || [];

  const safeCategories = categories
    .filter((cat: any) => cat.type_name)
    .filter((cat: any) => {
      const name = String(cat.type_name || '');
      // 排除不相关分类
      if (isExcludedCategory(name)) {
        return false;
      }
      // 只保留短剧相关分类
      return isShortDramaCategory(name);
    })
    .map((cat: any) => ({
      type_id: cat.type_id,
      type_name: cat.type_name,
    }));

  // 优先把包含“短剧”的分类排到前面，其余分类保留供用户选择
  return safeCategories.sort((a, b) => {
    const aShort = a.type_name.includes('短剧') ? 1 : 0;
    const bShort = b.type_name.includes('短剧') ? 1 : 0;
    return (
      bShort - aShort || String(a.type_id).localeCompare(String(b.type_id))
    );
  });
}

// 从采集源中查找短剧分类
async function getShortDramaCategoriesFromSources(
  config: any,
): Promise<{ type_id: number; type_name: string }[]> {
  const sources = (config.SourceConfig || [])
    .filter((s: any) => s.api && !s.disabled)
    .slice(0, 10);

  const results = await Promise.allSettled(
    sources.map(async (source: any) => {
      try {
        const response = await fetch(`${source.api}?ac=list`, {
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return [];
        const data = await response.json();
        const classes = data.class || [];
        return classes
          .filter((c: any) => {
            const name = String(c.type_name || '');
            return isShortDramaCategory(name);
          })
          .map((c: any) => ({ type_id: c.type_id, type_name: c.type_name }));
      } catch {
        return [];
      }
    }),
  );

  const categories: { type_id: number; type_name: string }[] = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') categories.push(...r.value);
  });
  return categories;
}

// 从配置的短剧源获取分类
async function getShortDramaCategoriesInternal() {
  // 直接使用默认短剧源获取分类
  console.log(`📋 [CATEGORIES] 使用默认短剧源: ${DEFAULT_SHORT_DRAMA_API}`);

  const defaultCategories = await getCategoriesFromSource(
    DEFAULT_SHORT_DRAMA_API,
  );

  console.log(`📋 短剧相关分类: ${defaultCategories.length} 个`);

  // 并行检查每个分类是否有内容
  return await validateCategoriesHasContent(
    defaultCategories,
    DEFAULT_SHORT_DRAMA_API,
  );
}

export async function GET() {
  try {
    const categories = await getShortDramaCategoriesInternal();

    const response = NextResponse.json(categories);
    return applyShortDramaCacheHeaders(
      response,
      SHORTDRAMA_CACHE_SECONDS.categories,
    );
  } catch (error) {
    console.error('获取短剧分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
