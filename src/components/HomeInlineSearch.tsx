'use client';

import { Loader2, Search, SearchX, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { SearchResult } from '@/lib/types';
import { resolveCardPosterUrl } from '@/lib/utils';

interface HomeInlineSearchProps {
  query: string;
  onClear: () => void;
}

export default function HomeInlineSearch({
  query,
  onClear,
}: HomeInlineSearchProps) {
  const router = useRouter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setDone(false);
      setLoading(false);
      setError('');
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (controllerRef.current) controllerRef.current.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setDone(false);
      setError('');
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setError(
            res.status === 429
              ? '搜索太频繁，请稍后再试'
              : '搜索失败，请稍后再试',
          );
          return;
        }
        const data = await res.json();
        setResults((data?.results || []).slice(0, 24));
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError('搜索出错，请稍后再试');
      } finally {
        setLoading(false);
        setDone(true);
      }
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [query]);

  const goPlay = (item: SearchResult) => {
    const title = encodeURIComponent(item.title || '');
    const year = item.year ? `&year=${item.year}` : '';
    const src =
      item.source && item.id
        ? `&source=${encodeURIComponent(item.source)}&id=${encodeURIComponent(item.id)}`
        : '';
    router.push(`/play?title=${title}${year}${src}`);
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200'>
          <Search className='h-4 w-4 text-gray-400' />
          <span>“{query.trim()}” 的搜索结果</span>
          {done && !loading && (
            <span className='text-xs font-normal text-gray-400'>
              共 {results.length} 条
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          className='flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300'
        >
          <X className='h-3.5 w-3.5' />
          清除
        </button>
      </div>

      {loading && (
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className='space-y-2'>
              <div className='aspect-[2/3] animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800' />
              <div className='h-3 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-800' />
            </div>
          ))}
        </div>
      )}

      {!loading && done && error && (
        <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'>
          {error}
        </div>
      )}

      {!loading && done && !error && results.length === 0 && (
        <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800/60'>
          <SearchX className='h-10 w-10 text-gray-300 dark:text-gray-600' />
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            没有找到与“{query.trim()}”相关的内容
          </p>
          <a
            href={`/search?q=${encodeURIComponent(query.trim())}`}
            className='text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400'
          >
            去完整搜索页查看 →
          </a>
        </div>
      )}

      {!loading && done && !error && results.length > 0 && (
        <>
          <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
            {results.map((item, i) => (
              <button
                key={`${item.source}-${item.id}-${i}`}
                onClick={() => goPlay(item)}
                className='group block text-left focus:outline-none'
              >
                <div className='mb-1.5 aspect-[2/3] overflow-hidden rounded-lg bg-gray-100 transition-transform duration-200 group-hover:scale-105 dark:bg-gray-800'>
                  {item.poster && (
                    <img
                      src={resolveCardPosterUrl(item.poster)}
                      alt={item.title}
                      loading='lazy'
                      className='h-full w-full object-cover'
                    />
                  )}
                </div>
                <p className='truncate text-xs font-medium text-gray-700 dark:text-gray-300'>
                  {item.title}
                </p>
                <div className='mt-0.5 flex items-center gap-1 text-[10px] text-gray-400'>
                  {item.year && <span>{item.year}</span>}
                  {item.type_name && (
                    <>
                      <span>·</span>
                      <span className='truncate'>{item.type_name}</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className='flex justify-center pt-1'>
            <a
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              className='rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            >
              在完整搜索页查看更多结果 →
            </a>
          </div>
        </>
      )}

      {!loading && !done && (
        <div className='flex items-center justify-center gap-2 py-10 text-sm text-gray-400'>
          <Loader2 className='h-4 w-4 animate-spin' />
          正在搜索...
        </div>
      )}
    </div>
  );
}
