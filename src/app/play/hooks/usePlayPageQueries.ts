'use client';

/**
 * Play Page 数据查询的 TanStack Query Hooks
 *
 * 基于 TanStack Query 源码最佳实践实现：
 * 1. 使用 useQuery 替代 useState + useEffect
 * 2. 实现依赖查询（dependent queries）
 * 3. 设置合适的 staleTime 避免重复请求
 * 4. 自动缓存、重试、后台刷新
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { getDoubanComments, getDoubanDetails } from '@/lib/douban.client';

export interface DoubanDetails {
  id: string;
  title: string;
  rating: number;
  year: string;
  directors: string[];
  actors: string[];
  genres: string[];
  summary: string;
  poster: string;
  [key: string]: any;
}

export interface DoubanComment {
  author: string;
  content: string;
  rating: number;
  time: string;
  [key: string]: any;
}

const doubanDetailsOptions = (doubanId?: number | string) =>
  queryOptions({
    queryKey: ['douban', 'details', doubanId],
    queryFn: async () => {
      if (!doubanId) throw new Error('Douban ID is required');
      const result = await getDoubanDetails(String(doubanId));
      if (result.code === 200 && result.data && result.data.title) {
        return result.data;
      }
      return null;
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });

export function useDoubanDetailsQuery(
  doubanId?: number | string,
  enabled?: boolean,
): UseQueryResult<any, Error> {
  return useQuery({
    ...doubanDetailsOptions(doubanId),
    enabled: enabled !== undefined ? enabled : !!doubanId,
  });
}

const doubanCommentsOptions = (doubanId?: number | string) =>
  queryOptions({
    queryKey: ['douban', 'comments', doubanId],
    queryFn: async () => {
      if (!doubanId) throw new Error('Douban ID is required');
      const result = await getDoubanComments({
        id: String(doubanId),
        start: 0,
        limit: 10,
        sort: 'new_score',
      });
      if (result.code === 200 && result.data) {
        return result.data.comments;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
  });

export function useDoubanCommentsQuery(
  doubanId?: number | string,
  enabled?: boolean,
): UseQueryResult<any, Error> {
  return useQuery({
    ...doubanCommentsOptions(doubanId),
    enabled: enabled !== undefined ? enabled : !!doubanId,
  });
}
