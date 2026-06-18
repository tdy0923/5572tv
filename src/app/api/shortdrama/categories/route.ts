/* eslint-disable no-console */
import { NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

// 强制动态路由，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// 默认短剧源（域名已迁移）
const DEFAULT_SHORT_DRAMA_API = 'https://tyyszy.com/api.php/provide/vod';

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

  const excludeKeywords = [
    '18+',
    '成人',
    '伦理',
    '禁片',
    '成人专区',
    '国产自拍',
    '自拍偷拍',
    '教程',
    '采集',
    '教学',
    '软件',
    '工具',
    '资源',
  ];

  // 短剧相关分类关键词
  const shortDramaKeywords = [
    '短剧',
    '女频恋爱',
    '反转爽剧',
    '古装仙侠',
    '年代穿越',
    '脑洞悬疑',
    '现代都市',
    '短篇',
    '短集',
    '擦边',
    '甜宠',
    '虐恋',
    '穿越',
    '重生',
    '总裁',
    '豪门',
    '逆袭',
    '复仇',
    '宠妻',
    '战神',
    '神医',
    '赘婿',
    '霸总',
    '甜剧',
    '虐剧',
    '爽剧',
  ];

  const safeCategories = categories
    .filter((cat: any) => cat.type_name)
    .filter((cat: any) => {
      const name = String(cat.type_name || '');
      // 排除不相关分类
      if (excludeKeywords.some((keyword) => name.includes(keyword))) {
        return false;
      }
      // 只保留短剧相关分类
      return shortDramaKeywords.some((keyword) => name.includes(keyword));
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
            return (
              name.includes('短剧') ||
              name.includes('女频恋爱') ||
              name.includes('反转爽剧') ||
              name.includes('古装仙侠') ||
              name.includes('年代穿越') ||
              name.includes('脑洞悬疑') ||
              name.includes('现代都市') ||
              name.includes('短篇') ||
              name.includes('短集')
            );
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
  const config = await getConfig();

  // 筛选出所有启用的短剧源
  const shortDramaSources = config.SourceConfig.filter(
    (source) => source.type === 'shortdrama' && !source.disabled,
  );

  // 如果有配置短剧源，从配置的源获取分类
  if (shortDramaSources.length > 0) {
    console.log(
      `📋 [CATEGORIES] 从 ${shortDramaSources.length} 个配置的短剧源获取分类`,
    );

    const results = await Promise.allSettled(
      shortDramaSources.map((source) => {
        console.log(`  → 尝试源: ${source.name} (${source.api})`);
        return getCategoriesFromSource(source.api);
      }),
    );

    // 合并所有成功的结果并去重
    const allCategories: { type_id: number; type_name: string }[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(
          `  ✅ 源 ${shortDramaSources[index].name} 返回 ${result.value.length} 个分类`,
        );
        allCategories.push(...result.value);
      } else if (result.status === 'rejected') {
        console.log(
          `  ❌ 源 ${shortDramaSources[index].name} 失败:`,
          result.reason?.message,
        );
      }
    });

    if (allCategories.length > 0) {
      // 按 type_id 去重
      const uniqueCategories = Array.from(
        new Map(
          allCategories.map((cat) => [`${cat.type_id}_${cat.type_name}`, cat]),
        ).values(),
      );

      // 过滤掉空分类（检查每个分类是否有内容）
      const categoriesWithContent: { type_id: number; type_name: string }[] =
        [];
      const defaultApi = shortDramaSources[0]?.api || DEFAULT_SHORT_DRAMA_API;

      for (const cat of uniqueCategories) {
        try {
          const testUrl = `${defaultApi}?ac=detail&t=${cat.type_id}&pg=1`;
          console.log(
            `  🔍 检查分类 ${cat.type_name}(ID:${cat.type_id}): ${testUrl}`,
          );
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
            console.log(`  📊 分类 ${cat.type_name}: itemCount=${itemCount}`);

            // 只保留有内容的分类
            if (itemCount > 0) {
              categoriesWithContent.push(cat);
            }
          }
        } catch {
          // 如果检查失败，仍然保留该分类
          categoriesWithContent.push(cat);
        }
      }

      return categoriesWithContent;
    }

    // 从采集源中查找短剧分类
    console.log('📋 [CATEGORIES] 从采集源中查找短剧分类...');
    const sourceCategories = await getShortDramaCategoriesFromSources(config);
    if (sourceCategories.length > 0) {
      console.log(`  ✅ 从采集源找到 ${sourceCategories.length} 个短剧分类`);
      // 按 type_id 去重并转换格式
      const uniqueSourceCategories = Array.from(
        new Map(
          sourceCategories.map((c) => [
            `${c.type_id}_${c.type_name}`,
            { type_id: c.type_id, type_name: c.type_name },
          ]),
        ).values(),
      );
      return uniqueSourceCategories;
    }

    console.log('⚠️ 所有配置的短剧源都未返回分类，检查普通源...');
  }

  // 检查普通源是否有短剧分类
  const regularSources = config.SourceConfig.filter(
    (source: any) => !source.disabled && source.type !== 'shortdrama',
  );

  const regularCategories: { type_id: number; type_name: string }[] = [];

  // 并发检查前20个源（减少检查数量以提高速度）
  const sourcesToCheck = regularSources.slice(0, 20);
  const batchSize = 10;
  for (let i = 0; i < sourcesToCheck.length; i += batchSize) {
    const batch = sourcesToCheck.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (source: any) => {
        try {
          const response = await fetch(`${source.api}?ac=list`, {
            headers: {
              'User-Agent': DEFAULT_USER_AGENT,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(3000),
          });
          if (!response.ok) return [];
          const data = await response.json();
          const classes = data.class || [];
          return classes
            .filter(
              (c: any) =>
                c.type_name &&
                (c.type_name.includes('短剧') || c.type_name.includes('爽文')),
            )
            .map((c: any) => ({ type_id: c.type_id, type_name: c.type_name }));
        } catch {
          return [];
        }
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        regularCategories.push(...result.value);
      }
    }
  }

  if (regularCategories.length > 0) {
    console.log(`📋 从普通源找到 ${regularCategories.length} 个短剧分类`);
    // 按名称合并同名分类（不同源的同名分类合并为一个）
    const mergedCategories = new Map<
      string,
      { type_id: number; type_name: string }
    >();

    for (const cat of regularCategories) {
      const name = cat.type_name;
      if (!mergedCategories.has(name)) {
        mergedCategories.set(name, cat);
      }
      // 保留第一个出现的 type_id
    }

    const uniqueRegularCategories = Array.from(mergedCategories.values());
    console.log(`📋 合并后 ${uniqueRegularCategories.length} 个分类`);
    return uniqueRegularCategories;
  }

  // 没有配置短剧源或全部失败，使用默认源
  console.log(`📋 [CATEGORIES] 使用默认短剧源: ${DEFAULT_SHORT_DRAMA_API}`);
  const defaultCategories = await getCategoriesFromSource(
    DEFAULT_SHORT_DRAMA_API,
  );

  // 检查每个分类是否有内容，过滤掉空分类
  const categoriesWithContent: { type_id: number; type_name: string }[] = [];
  for (const cat of defaultCategories) {
    try {
      const testUrl = `${DEFAULT_SHORT_DRAMA_API}?ac=detail&t=${cat.type_id}&pg=1`;
      console.log(`  🔍 检查分类 ${cat.type_name}(ID:${cat.type_id})`);
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
        console.log(`  📊 分类 ${cat.type_name}: itemCount=${itemCount}`);

        if (itemCount > 0) {
          categoriesWithContent.push(cat);
        }
      }
    } catch {
      categoriesWithContent.push(cat);
    }
  }

  return categoriesWithContent;
}

export async function GET() {
  try {
    const categories = await getShortDramaCategoriesInternal();

    // 设置与网页端一致的缓存策略（categories: 4小时）
    const response = NextResponse.json(categories);

    console.log(
      '🕐 [CATEGORIES] 设置4小时HTTP缓存 - 与网页端categories缓存一致',
    );

    // 4小时 = 14400秒（与网页端SHORTDRAMA_CACHE_EXPIRE.categories一致）
    const cacheTime = 14400;
    response.headers.set(
      'Cache-Control',
      `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
    );
    response.headers.set('CDN-Cache-Control', `public, s-maxage=${cacheTime}`);
    response.headers.set(
      'Vercel-CDN-Cache-Control',
      `public, s-maxage=${cacheTime}`,
    );

    // 调试信息
    response.headers.set('X-Cache-Duration', '4hour');
    response.headers.set(
      'X-Cache-Expires-At',
      new Date(Date.now() + cacheTime * 1000).toISOString(),
    );
    response.headers.set('X-Debug-Timestamp', new Date().toISOString());

    // Vary头确保不同设备有不同缓存
    response.headers.set('Vary', 'Accept-Encoding, User-Agent');

    return response;
  } catch (error) {
    console.error('获取短剧分类失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
// redeploy
