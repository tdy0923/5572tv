/* eslint-disable @next/next/no-img-element */

/* eslint-disable unused-imports/no-unused-vars */

'use client';

import {
  ArrowUp,
  ExternalLink,
  Layers,
  Search,
  Server,
  SlidersHorizontal,
  Tv,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ClientCache } from '@/lib/client-cache';
import type {
  DoubanItem,
  SearchResult as GlobalSearchResult,
} from '@/lib/types';

import { FluentSpinner } from '@/components/FluentSpinner';
import MountAnimation from '@/components/MountAnimation';
import PageLayout from '@/components/PageLayout';
import { PanelField, PanelSelect, PillButton } from '@/components/ui-surface';

type Source = { key: string; name: string; api: string };
type Category = { type_id: string | number; type_name: string };
type Item = {
  id: string;
  title: string;
  poster: string;
  year: string;
  type_name?: string;
  remarks?: string;
};

export default function SourceBrowserPage() {
  const router = useRouter();

  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [activeSourceKey, setActiveSourceKey] = useState('');
  const activeSource = useMemo(
    () => sources.find((s) => s.key === activeSourceKey),
    [sources, activeSourceKey],
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | number>('');

  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const hasMore = page < pageCount;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastFetchAtRef = useRef(0);
  const autoFillInProgressRef = useRef(false);

  // 搜索与排序
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'category' | 'search'>('category');
  const [sortBy, setSortBy] = useState<
    'default' | 'title-asc' | 'title-desc' | 'year-asc' | 'year-desc'
  >('default');
  const [debounceId, setDebounceId] = useState<NodeJS.Timeout | null>(null);

  // 二级筛选（地区 / 年份 / 关键词）
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // 详情预览
  const [previewOpen, setPreviewOpen] = useState(false);

  // 无障碍/交互增强：弹层焦点管理、网格键盘导航、回到顶部
  const previewPanelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [showTop, setShowTop] = useState(false);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  // 打开弹层：锁定背景滚动、聚焦弹层、ESC 关闭；关闭后还原滚动与焦点
  useEffect(() => {
    if (!previewOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => previewPanelRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      lastFocusedRef.current?.focus?.();
      lastFocusedRef.current = null;
    };
  }, [previewOpen, closePreview]);

  // 弹层内焦点陷阱：Tab 在可聚焦元素间循环，不跑出弹层
  useEffect(() => {
    if (!previewOpen) return;
    const panel = previewPanelRef.current;
    if (!panel) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [previewOpen]);

  // 回到顶部按钮显隐
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 网格方向键导航（左右/上下移动焦点）
  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>('[role="listitem"]'),
    );
    if (cards.length === 0) return;
    const idx = cards.indexOf(document.activeElement as HTMLElement);
    if (idx === -1) return;
    const w = window.innerWidth;
    const cols = w < 640 ? 2 : w < 768 ? 3 : w < 1024 ? 4 : w < 1280 ? 5 : 6;
    let next = idx;
    if (e.key === 'ArrowRight') next = Math.min(idx + 1, cards.length - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(idx - 1, 0);
    else if (e.key === 'ArrowDown')
      next = Math.min(idx + cols, cards.length - 1);
    else if (e.key === 'ArrowUp') next = Math.max(idx - cols, 0);
    else return;
    e.preventDefault();
    cards[next].focus();
  };
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<GlobalSearchResult | null>(
    null,
  );
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const [previewDouban, setPreviewDouban] = useState<DoubanItem | null>(null);
  const [previewDoubanLoading, setPreviewDoubanLoading] = useState(false);
  const [previewDoubanId, setPreviewDoubanId] = useState<number | null>(null);
  type BangumiTag = { name: string };
  type BangumiInfoboxValue =
    | string
    | { v: string }
    | Array<string | { v: string }>;
  type BangumiInfoboxEntry = { key: string; value: BangumiInfoboxValue };
  type BangumiSubject = {
    name?: string;
    name_cn?: string;
    date?: string;
    rating?: { score?: number };
    tags?: BangumiTag[];
    infobox?: BangumiInfoboxEntry[];
    summary?: string;
  };
  const [previewBangumi, setPreviewBangumi] = useState<BangumiSubject | null>(
    null,
  );
  const [previewBangumiLoading, setPreviewBangumiLoading] = useState(false);
  const [previewSearchPick, setPreviewSearchPick] =
    useState<GlobalSearchResult | null>(null);

  const fetchSources = useCallback(async () => {
    setLoadingSources(true);
    setSourceError(null);
    try {
      const res = await fetch('/api/source-browser/sites', {
        cache: 'no-store',
      });
      if (res.status === 401) {
        throw new Error('登录状态已失效，请重新登录');
      }
      if (res.status === 403) {
        throw new Error('当前账号暂无可用资源站点');
      }
      if (!res.ok) throw new Error('获取源失败');
      const data = await res.json();
      const list: Source[] = data.sources || [];
      setSources(list);
      if (list.length > 0) {
        setActiveSourceKey(list[0].key);
      }
    } catch (e: unknown) {
      setSourceError(e instanceof Error ? e.message : '获取源失败');
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const fetchCategories = useCallback(async (sourceKey: string) => {
    if (!sourceKey) return;
    setLoadingCategories(true);
    setCategoryError(null);
    try {
      const res = await fetch(
        `/api/source-browser/categories?source=${encodeURIComponent(sourceKey)}`,
      );
      if (!res.ok) throw new Error('获取分类失败');
      const data = await res.json();
      const list: Category[] = data.categories || [];
      setCategories(list);
      if (list.length > 0) {
        setActiveCategory(list[0].type_id);
      } else {
        setActiveCategory('');
      }
    } catch (e: unknown) {
      setCategoryError(e instanceof Error ? e.message : '获取分类失败');
      setCategories([]);
      setActiveCategory('');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchItems = useCallback(
    async (
      sourceKey: string,
      typeId: string | number,
      p = 1,
      append = false,
    ) => {
      if (!sourceKey || !typeId) return;
      if (append) setLoadingMore(true);
      else setLoadingItems(true);
      setItemsError(null);
      try {
        const res = await fetch(
          `/api/source-browser/list?source=${encodeURIComponent(
            sourceKey,
          )}&type_id=${encodeURIComponent(String(typeId))}&page=${p}`,
        );
        if (!res.ok) throw new Error('获取列表失败');
        const data = (await res.json()) as {
          items?: Item[];
          meta?: { page?: number; pagecount?: number };
        };
        const list: Item[] = data.items || [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setPage(Number(data.meta?.page || p));
        setPageCount(Number(data.meta?.pagecount || 1));
        // 更新可选年份
        const years = Array.from(
          new Set(list.map((i) => (i.year || '').trim()).filter(Boolean)),
        );
        years.sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
        setAvailableYears(years);
      } catch (e: unknown) {
        setItemsError(e instanceof Error ? e.message : '获取列表失败');
        if (!append) setItems([]);
        setPage(1);
        setPageCount(1);
        setAvailableYears([]);
      } finally {
        if (append) setLoadingMore(false);
        else setLoadingItems(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);
  useEffect(() => {
    if (activeSourceKey) fetchCategories(activeSourceKey);
  }, [activeSourceKey, fetchCategories]);
  useEffect(() => {
    if (activeSourceKey && activeCategory && mode === 'category') {
      // 重置列表并加载第一页
      setItems([]);
      setPage(1);
      setPageCount(1);
      fetchItems(activeSourceKey, activeCategory, 1, false);
    }
  }, [activeSourceKey, activeCategory, mode, fetchItems]);

  const fetchSearch = useCallback(
    async (sourceKey: string, q: string, p = 1, append = false) => {
      if (!sourceKey || !q) return;
      if (append) setLoadingMore(true);
      else setLoadingItems(true);
      setItemsError(null);
      try {
        const res = await fetch(
          `/api/source-browser/search?source=${encodeURIComponent(
            sourceKey,
          )}&q=${encodeURIComponent(q)}&page=${p}`,
        );
        if (!res.ok) throw new Error('搜索失败');
        const data = (await res.json()) as {
          items?: Item[];
          meta?: { page?: number; pagecount?: number };
        };
        const list: Item[] = data.items || [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setPage(Number(data.meta?.page || p));
        setPageCount(Number(data.meta?.pagecount || 1));
        const years = Array.from(
          new Set(list.map((i) => (i.year || '').trim()).filter(Boolean)),
        );
        years.sort((a, b) => (parseInt(b) || 0) - (parseInt(a) || 0));
        setAvailableYears(years);
      } catch (e: unknown) {
        setItemsError(e instanceof Error ? e.message : '搜索失败');
        if (!append) setItems([]);
        setPage(1);
        setPageCount(1);
        setAvailableYears([]);
      } finally {
        if (append) setLoadingMore(false);
        else setLoadingItems(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeSourceKey && mode === 'search' && query.trim()) {
      // 重置列表并加载第一页
      setItems([]);
      setPage(1);
      setPageCount(1);
      fetchSearch(activeSourceKey, query.trim(), 1, false);
    }
  }, [activeSourceKey, mode, query, fetchSearch]);

  // IntersectionObserver 处理自动翻页（含简单节流）
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          const now = Date.now();
          const intervalOk = now - lastFetchAtRef.current > 700; // 700ms 节流
          if (
            !loadingItems &&
            !loadingMore &&
            hasMore &&
            activeSourceKey &&
            intervalOk
          ) {
            lastFetchAtRef.current = now;
            const next = page + 1;
            if (mode === 'search' && query.trim()) {
              fetchSearch(activeSourceKey, query.trim(), next, true);
            } else if (mode === 'category' && activeCategory) {
              fetchItems(activeSourceKey, activeCategory, next, true);
            }
          }
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    loadingItems,
    loadingMore,
    hasMore,
    page,
    mode,
    activeSourceKey,
    activeCategory,
    query,
    fetchItems,
    fetchSearch,
  ]);

  // 首屏填充：若列表高度不足以产生滚动且仍有更多，则自动连续翻页尝试填满视口
  useEffect(() => {
    const tryAutoFill = async () => {
      if (autoFillInProgressRef.current) return;
      if (!loadMoreRef.current) return;
      if (loadingItems || loadingMore || !hasMore) return;
      const sentinel = loadMoreRef.current.getBoundingClientRect();
      const inViewport = sentinel.top <= window.innerHeight + 100;
      if (!inViewport) return;

      autoFillInProgressRef.current = true;
      try {
        let iterations = 0;
        while (iterations < 5) {
          // 最多连续加载5页以防过载
          if (!hasMore) break;
          const now = Date.now();
          if (now - lastFetchAtRef.current <= 400) break; // 避免过于频繁
          lastFetchAtRef.current = now;
          const next = page + iterations + 1;
          if (mode === 'search' && query.trim()) {
            await fetchSearch(activeSourceKey, query.trim(), next, true);
          } else if (mode === 'category' && activeCategory) {
            await fetchItems(activeSourceKey, activeCategory, next, true);
          } else {
            break;
          }
          iterations++;

          // 重新检测是否还在视口之内（内容增长可能已挤出视口）
          if (!loadMoreRef.current) break;
          const rect = loadMoreRef.current.getBoundingClientRect();
          if (rect.top > window.innerHeight + 100) break;
        }
      } finally {
        autoFillInProgressRef.current = false;
      }
    };

    // 异步执行以等待布局更新
    const id = setTimeout(tryAutoFill, 50);
    return () => clearTimeout(id);
  }, [
    items,
    page,
    pageCount,
    hasMore,
    loadingItems,
    loadingMore,
    mode,
    activeSourceKey,
    activeCategory,
    query,
    fetchItems,
    fetchSearch,
  ]);

  const filteredAndSorted = useMemo(() => {
    let arr = [...items];
    // 关键词/地区筛选（包含于标题或备注）
    if (filterKeyword.trim()) {
      const kw = filterKeyword.trim().toLowerCase();
      arr = arr.filter(
        (i) =>
          (i.title || '').toLowerCase().includes(kw) ||
          (i.remarks || '').toLowerCase().includes(kw),
      );
    }
    // 年份筛选（精确匹配）
    if (filterYear) {
      arr = arr.filter((i) => (i.year || '').trim() === filterYear);
    }
    switch (sortBy) {
      case 'title-asc':
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return arr.sort((a, b) => b.title.localeCompare(a.title));
      case 'year-asc':
        return arr.sort(
          (a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0),
        );
      case 'year-desc':
        return arr.sort(
          (a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0),
        );
      default:
        return arr; // 保持上游顺序
    }
  }, [items, sortBy, filterKeyword, filterYear]);

  const fetchDoubanDetails = async (doubanId: number) => {
    try {
      setPreviewDoubanLoading(true);
      setPreviewDouban(null);
      const keyRaw = `douban-details-id=${doubanId}`;
      // 1) 先查缓存（与全站一致的 ClientCache）
      const cached = (await ClientCache.get(keyRaw)) as DoubanItem | null;
      if (cached) {
        setPreviewDouban(cached);
        return;
      }

      // 2) 缓存未命中，回源请求 /api/douban/details
      const fallback = await fetch(
        `/api/douban/details?id=${encodeURIComponent(String(doubanId))}`,
      );
      if (fallback.ok) {
        const dbData = (await fallback.json()) as
          | { code: number; message: string; data?: DoubanItem }
          | DoubanItem;
        const normalized =
          (dbData as { data?: DoubanItem }).data || (dbData as DoubanItem);
        setPreviewDouban(normalized);
        // 3) 回写缓存（4小时）
        try {
          await ClientCache.set(keyRaw, normalized, 14400);
        } catch (err) {
          void err; // ignore cache write failure
        }
      } else {
        setPreviewDouban(null);
      }
    } catch (e) {
      // ignore
    } finally {
      setPreviewDoubanLoading(false);
    }
  };

  // bangumi工具
  const isBangumiId = (id: number): boolean =>
    id > 0 && id.toString().length === 6;
  const fetchBangumiDetails = async (bangumiId: number) => {
    try {
      setPreviewBangumiLoading(true);
      setPreviewBangumi(null);
      const res = await fetch(
        `/api/proxy/bangumi?path=v0/subjects/${bangumiId}`,
      );
      if (res.ok) {
        const data = (await res.json()) as {
          name?: string;
          name_cn?: string;
          date?: string;
          rating?: { score?: number };
          tags?: { name: string }[];
          infobox?: { key: string; value: BangumiInfoboxValue }[];
          summary?: string;
        };
        setPreviewBangumi(data);
      }
    } catch (e) {
      // ignore
    } finally {
      setPreviewBangumiLoading(false);
    }
  };

  const openPreview = async (item: Item) => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    setPreviewItem(item);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewDouban(null);
    setPreviewDoubanId(null);
    setPreviewBangumi(null);
    setPreviewSearchPick(null);
    try {
      const res = await fetch(
        `/api/detail?source=${encodeURIComponent(
          activeSourceKey,
        )}&id=${encodeURIComponent(item.id)}`,
      );
      if (!res.ok) throw new Error('获取详情失败');
      const data = (await res.json()) as GlobalSearchResult;
      setPreviewData(data);
      // 处理 douban_id：优先 /api/detail，其次通过 /api/search/one 指定站点精确匹配推断
      let dId: number | null = data?.douban_id ? Number(data.douban_id) : null;
      if (!dId) {
        // 在当前源内精确搜索标题以获取带有 douban_id 的条目
        const normalize = (s: string) =>
          (s || '').replace(/\s+/g, '').toLowerCase();
        const variants = Array.from(
          new Set([item.title, (item.title || '').replace(/\s+/g, '')]),
        ).filter(Boolean) as string[];

        for (const v of variants) {
          try {
            const res = await fetch(
              `/api/search/one?resourceId=${encodeURIComponent(
                activeSourceKey,
              )}&q=${encodeURIComponent(v)}`,
            );
            if (!res.ok) continue;
            const payload = (await res.json()) as {
              results?: GlobalSearchResult[];
            };
            const list: GlobalSearchResult[] = payload.results || [];
            // 优先标题+年份匹配
            const tNorm = normalize(item.title);
            const matchStrict = list.find(
              (r) =>
                normalize(r.title) === tNorm &&
                (!item.year ||
                  (r.year &&
                    String(r.year).toLowerCase() ===
                      String(item.year).toLowerCase())) &&
                r.douban_id,
            );
            const matchTitleOnly = list.find(
              (r) => normalize(r.title) === tNorm && r.douban_id,
            );
            const pick = matchStrict || matchTitleOnly || null;
            if (pick && pick.douban_id) {
              dId = Number(pick.douban_id);
              setPreviewSearchPick(pick);
              break;
            }
          } catch {
            // ignore
          }
        }
      }
      if (dId && dId > 0) {
        setPreviewDoubanId(dId);
        if (isBangumiId(dId)) {
          await fetchBangumiDetails(dId);
        } else {
          await fetchDoubanDetails(dId);
        }
      }
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : '获取详情失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const goPlay = (item: Item) => {
    const params = new URLSearchParams();
    params.set('source', activeSourceKey);
    params.set('id', item.id);
    const mergedTitle = (previewData?.title || item.title || '').toString();
    const mergedYear = (previewData?.year || item.year || '').toString();
    if (mergedTitle) params.set('title', mergedTitle);
    if (mergedYear) params.set('year', mergedYear);
    if (previewDoubanId) params.set('douban_id', String(previewDoubanId));
    params.set('prefer', 'true');
    router.push(`/play?${params.toString()}&_reload=${Date.now()}`);
  };

  return (
    <PageLayout activePath='/source-browser'>
      <MountAnimation>
        <div className='-mt-6 space-y-4 md:mt-0'>
          {/* 紧凑页头 */}
          <div className='flex items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] shadow-[0_10px_24px_rgba(244,194,77,0.18)]'>
                <Layers className='h-5 w-5' />
              </div>
              <div className='min-w-0'>
                <h1 className='truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl'>
                  源浏览器
                </h1>
                <p className='truncate text-xs text-gray-500 dark:text-gray-400'>
                  {activeSource
                    ? `${activeSource.name} · ${filteredAndSorted.length} 条`
                    : `${sources.length} 个来源`}
                </p>
              </div>
            </div>
            <span className='shrink-0 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 px-3 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'>
              {mode === 'search' ? '搜索模式' : '分类模式'}
            </span>
          </div>

          {/* 来源选择：横向滚动 pills（不占满整行） */}
          <div>
            {loadingSources ? (
              <div className='flex items-center gap-2 text-sm text-gray-500'>
                <div className='h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent'></div>
                加载来源...
              </div>
            ) : sourceError ? (
              <div className='flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800 dark:bg-red-900/20'>
                <span className='text-sm text-red-600 dark:text-red-400'>
                  {sourceError}
                </span>
              </div>
            ) : sources.length === 0 ? (
              <div className='flex flex-col items-center py-8'>
                <Server className='mb-2 h-8 w-8 text-gray-400' />
                <p className='text-sm text-gray-500'>暂无可用来源</p>
              </div>
            ) : (
              <div className='-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide md:flex-wrap md:overflow-visible md:gap-2 md:pb-0'>
                {sources.map((s) => (
                  <PillButton
                    key={s.key}
                    onClick={() => setActiveSourceKey(s.key)}
                    active={activeSourceKey === s.key}
                    aria-pressed={activeSourceKey === s.key}
                    className='shrink-0 px-3.5 py-1.5 text-sm'
                  >
                    {s.name}
                  </PillButton>
                ))}
              </div>
            )}
          </div>

          {/* Sticky 控制条：搜索 + 筛选入口 + 分类 tabs */}
          {activeSource && (
            <div className='sticky z-30 space-y-3 rounded-2xl border border-gray-200/80 bg-white/95 p-3 shadow-sm dark:border-gray-700/80 dark:bg-gray-900/95 top-[calc(52px+env(safe-area-inset-top))] md:top-[72px] md:bg-white/85 md:backdrop-blur-xl dark:md:bg-gray-900/85'>
              {/* 搜索框 + 筛选入口 */}
              <div className='flex items-center gap-2'>
                <div className='relative min-w-0 flex-1'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <PanelField
                    value={query}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuery(val);
                      if (debounceId) clearTimeout(debounceId);
                      const id = setTimeout(() => {
                        setMode(val.trim() ? 'search' : 'category');
                        if (val.trim()) {
                          fetchSearch(activeSourceKey, val.trim(), 1);
                        } else if (activeCategory) {
                          fetchItems(activeSourceKey, activeCategory, 1);
                        }
                      }, 500);
                      setDebounceId(id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setMode(query.trim() ? 'search' : 'category');
                      }
                    }}
                    placeholder='搜索当前来源，输入即搜'
                    aria-label='搜索当前来源'
                    className='h-10 rounded-xl pl-9 pr-9 text-sm'
                  />
                  {query && (
                    <button
                      onClick={() => {
                        setQuery('');
                        setMode('category');
                        if (activeCategory)
                          fetchItems(activeSourceKey, activeCategory, 1);
                      }}
                      className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200'
                      title='清除'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    filterOpen ||
                    sortBy !== 'default' ||
                    filterYear ||
                    filterKeyword
                      ? 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400'
                      : 'border-gray-200 bg-white/70 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                  title='排序与筛选'
                  aria-expanded={filterOpen}
                  aria-controls='source-filter-panel'
                >
                  <SlidersHorizontal className='h-[18px] w-[18px]' />
                </button>
              </div>

              {/* 分类 tabs：横向滚动，选中态表达层级 */}
              {mode === 'category' && (
                <div className='flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap md:overflow-visible md:gap-2 md:pb-0'>
                  {loadingCategories ? (
                    <div className='flex items-center gap-2 px-2 text-sm text-gray-500'>
                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent'></div>
                      加载分类...
                    </div>
                  ) : categoryError ? (
                    <span className='px-2 text-sm text-red-600 dark:text-red-400'>
                      {categoryError}
                    </span>
                  ) : categories.length === 0 ? (
                    <span className='px-2 text-sm text-gray-500'>暂无分类</span>
                  ) : (
                    categories.map((c) => (
                      <button
                        key={String(c.type_id)}
                        onClick={() => setActiveCategory(c.type_id)}
                        aria-pressed={activeCategory === c.type_id}
                        className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-all duration-200 ${
                          activeCategory === c.type_id
                            ? 'bg-blue-600 font-medium text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {c.type_name}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* 筛选展开行（低频操作，默认收起） */}
              {filterOpen && (
                <div
                  id='source-filter-panel'
                  role='region'
                  aria-label='排序与筛选'
                  className='grid grid-cols-1 gap-2 sm:grid-cols-3'
                >
                  <PanelSelect
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as
                          | 'default'
                          | 'title-asc'
                          | 'title-desc'
                          | 'year-asc'
                          | 'year-desc',
                      )
                    }
                    className='px-2 py-1.5 text-xs sm:px-3 sm:text-sm'
                    title='排序'
                  >
                    <option value='default'>默认</option>
                    <option value='title-asc'>标题 A→Z</option>
                    <option value='title-desc'>标题 Z→A</option>
                    <option value='year-asc'>年份↑</option>
                    <option value='year-desc'>年份↓</option>
                  </PanelSelect>
                  <PanelSelect
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className='px-2 py-1.5 text-xs sm:px-3 sm:text-sm'
                    title='年份'
                  >
                    <option value=''>全部年份</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </PanelSelect>
                  <PanelField
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    placeholder='地区/关键词'
                    className='px-2 py-1.5 text-xs sm:px-3 sm:text-sm'
                  />
                </div>
              )}
            </div>
          )}

          {/* 内容区：精简状态行 + 海报网格 */}
          {activeSource && (
            <div>
              <div className='mb-3 flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400'>
                <div className='truncate' aria-live='polite'>
                  {mode === 'search'
                    ? `搜索结果${query ? `：${query}` : ''}`
                    : `分类：${
                        categories.find((c) => c.type_id === activeCategory)
                          ?.type_name || '未选择'
                      }`}
                  {filterYear && (
                    <span className='ml-1.5'>· 年份 {filterYear}</span>
                  )}
                  {filterKeyword && (
                    <span className='ml-1.5'>· 筛选 {filterKeyword}</span>
                  )}
                </div>
                <span className='shrink-0 text-gray-400'>
                  {filteredAndSorted.length} 条
                </span>
              </div>

              <div>
                {loadingItems ? (
                  <div className='flex items-center gap-2 text-sm text-gray-500'>
                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent'></div>
                    加载内容...
                  </div>
                ) : itemsError ? (
                  <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
                    {itemsError}
                  </div>
                ) : items.length === 0 ? (
                  <div className='py-12 text-center'>
                    <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800'>
                      <Tv className='h-10 w-10 text-gray-400' />
                    </div>
                    <p className='text-sm text-gray-500'>暂无内容</p>
                  </div>
                ) : (
                  <>
                    <div
                      ref={gridRef}
                      role='list'
                      aria-label='内容列表'
                      onKeyDown={onGridKeyDown}
                      className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                    >
                      {filteredAndSorted.map((item, index) => (
                        <div
                          key={item.id}
                          className='group cursor-pointer transition-all duration-300 hover:-translate-y-0.5'
                          onClick={() => openPreview(item)}
                          role='listitem'
                          tabIndex={0}
                          aria-label={`${item.title}${item.year ? `，${item.year}年` : ''}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openPreview(item);
                            }
                          }}
                          style={{
                            animation: `fadeInUp 0.4s ease-out ${index * 0.02}s both`,
                          }}
                        >
                          <div className='relative aspect-[2/3] overflow-hidden rounded-[22px] border border-gray-200 dark:border-gray-700 bg-linear-to-br from-gray-100 via-gray-50 to-gray-100 shadow-md transition-all duration-300 group-hover:shadow-lg dark:border-gray-700 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700'>
                            {item.poster ? (
                              <img
                                src={item.poster}
                                alt={item.title}
                                className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                                referrerPolicy='no-referrer'
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  if (!img.dataset.fallbackApplied) {
                                    img.dataset.fallbackApplied = 'true';
                                    img.src = '/placeholder-cover.jpg';
                                  }
                                }}
                                loading='lazy'
                              />
                            ) : (
                              <div className='flex h-full w-full items-center justify-center text-gray-400 text-xs sm:text-sm'>
                                <div className='text-center'>
                                  <Tv className='mx-auto mb-1 h-8 w-8 opacity-50 sm:mb-2 sm:h-12 sm:w-12' />
                                  <div className='text-[10px] sm:text-sm'>
                                    无封面
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className='absolute inset-0 bg-linear-to-t from-black/72 via-black/16 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100'></div>
                            {item.year && (
                              <div className='absolute right-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm sm:right-2 sm:top-2 sm:rounded-lg sm:px-2 sm:py-1 sm:text-xs'>
                                {item.year}
                              </div>
                            )}
                            {item.type_name && (
                              <div className='absolute bottom-1 left-1 rounded-md bg-blue-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm sm:bottom-2 sm:left-2 sm:rounded-lg sm:px-2 sm:py-1 sm:text-xs'>
                                {item.type_name}
                              </div>
                            )}
                          </div>
                          <div className='space-y-1.5 px-1.5 pt-3 sm:px-2'>
                            <div className='line-clamp-2 min-h-[2.4rem] text-sm font-medium leading-snug text-gray-900 transition-colors dark:text-white sm:min-h-[2.8rem]'>
                              {item.title}
                            </div>
                            {item.remarks && (
                              <div className='line-clamp-1 text-xs text-gray-500 dark:text-gray-400'>
                                {item.remarks}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      ref={loadMoreRef}
                      className='mt-4 flex items-center justify-center py-4'
                    >
                      {loadingMore ? (
                        <div className='rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800'>
                          加载更多...
                        </div>
                      ) : hasMore ? (
                        <div className='rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800'>
                          下拉加载更多
                        </div>
                      ) : (
                        <div className='rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800'>
                          没有更多了
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 回到顶部 */}
          {showTop && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label='回到顶部'
              className='fixed bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-600 shadow-lg backdrop-blur-md transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-300 md:bottom-8 md:right-6'
            >
              <ArrowUp className='h-5 w-5' />
            </button>
          )}

          {/* 预览弹层 */}
          {previewOpen && (
            <div
              className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 py-6 pb-20 backdrop-blur-sm animate-fluent2-fade-in sm:p-4 md:pb-4'
              role='dialog'
              aria-modal='true'
              aria-label='详情预览'
              onClick={closePreview}
            >
              <div
                ref={previewPanelRef}
                tabIndex={-1}
                className='flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white/82 shadow-lg  animate-fluent2-scale-in dark:border-gray-700 dark:bg-gray-900/82 outline-none md:max-h-[90vh]'
                onClick={(e) => e.stopPropagation()}
              >
                {/* 头部 */}
                <div className='relative flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4 backdrop-blur-sm dark:border-gray-700 sm:px-6'>
                  <div className='flex min-w-0 flex-1 items-center gap-3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-500 shadow-lg'>
                      <Tv className='h-5 w-5 text-white' />
                    </div>
                    <div className='min-w-0'>
                      <div className='truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl'>
                        {previewItem?.title || '详情预览'}
                      </div>
                      <div className='text-xs text-gray-500 dark:text-gray-400'>
                        来源内容预览
                      </div>
                    </div>
                  </div>
                  <button
                    className='ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white'
                    onClick={closePreview}
                    title='关闭'
                  >
                    <X className='h-5 w-5' />
                  </button>
                </div>
                {/* 内容区 */}
                <div className='flex-1 overflow-auto p-5 sm:p-6'>
                  {previewLoading ? (
                    <div className='flex flex-col items-center justify-center py-12'>
                      <FluentSpinner size='large' label='加载详情...' />
                    </div>
                  ) : previewError ? (
                    <div className='flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
                      <svg
                        className='w-5 h-5 shrink-0'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                          clipRule='evenodd'
                        />
                      </svg>
                      {previewError}
                    </div>
                  ) : !previewData ? (
                    <div className='py-12 text-center'>
                      <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700'>
                        <Tv className='h-10 w-10 text-gray-400' />
                      </div>
                      <div className='text-sm text-gray-500'>暂无详情</div>
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6'>
                      {/* 左侧封面 - 移动端紧凑显示 */}
                      <div className='md:col-span-1'>
                        <div className='md:sticky md:top-0'>
                          {previewItem?.poster ? (
                            <div className='group relative mx-auto max-w-[200px] overflow-hidden rounded-xl border border-gray-200 shadow-lg md:max-w-none md:rounded-2xl md:border-2 md:shadow-2xl dark:border-gray-700'>
                              <img
                                src={previewItem.poster}
                                alt={previewItem.title}
                                className='w-full group-hover:scale-105 transition-transform duration-300'
                              />
                              <div className='absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100'></div>
                            </div>
                          ) : (
                            <div className='mx-auto flex aspect-[2/3] w-full max-w-[200px] items-center justify-center rounded-xl border border-gray-200 bg-linear-to-br from-gray-100 to-gray-200 md:max-w-none md:rounded-2xl md:border-2 dark:border-gray-700 dark:from-gray-700 dark:to-gray-800'>
                              <div className='text-center text-gray-400'>
                                <Tv className='w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 opacity-50' />
                                <div className='text-xs md:text-sm'>
                                  暂无封面
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='space-y-3 md:col-span-2'>
                        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                          <div className='text-base font-semibold text-gray-900 sm:text-lg dark:text-white'>
                            {previewData.title || previewItem?.title}
                          </div>
                          {/* 评分徽章 */}
                          {(() => {
                            const d = previewDouban;
                            if (d?.rate) {
                              return (
                                <span className='rounded-md bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300'>
                                  豆瓣 {d.rate}
                                </span>
                              );
                            }
                            if (previewBangumi?.rating?.score) {
                              return (
                                <span className='rounded-md bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                                  Bangumi {previewBangumi.rating.score}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {/* 外链按钮 */}
                          {(() => {
                            const d = previewDouban;
                            if (d?.id) {
                              return (
                                <a
                                  href={`https://movie.douban.com/subject/${d.id}/`}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400'
                                  title='打开豆瓣页面'
                                >
                                  <ExternalLink className='w-3.5 h-3.5' /> 豆瓣
                                </a>
                              );
                            }
                            if (previewBangumi && previewDoubanId) {
                              return (
                                <a
                                  href={`https://bgm.tv/subject/${previewDoubanId}`}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='inline-flex items-center gap-1 text-xs text-purple-600 hover:underline dark:text-purple-300'
                                  title='打开 Bangumi 页面'
                                >
                                  <ExternalLink className='w-3.5 h-3.5' />{' '}
                                  Bangumi
                                </a>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className='flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-300 sm:text-sm'>
                          <div>
                            <span className='text-[11px] text-gray-400 dark:text-gray-500'>
                              年份
                            </span>
                            <span className='ml-2 font-medium text-gray-900 dark:text-white'>
                              {previewData.year || previewItem?.year || '—'}
                            </span>
                          </div>
                          <div>
                            <span className='text-[11px] text-gray-400 dark:text-gray-500'>
                              来源
                            </span>
                            <span className='ml-2 font-medium text-gray-900 dark:text-white'>
                              {activeSource?.name || '—'}
                            </span>
                          </div>
                        </div>
                        <div className='flex flex-wrap gap-2 text-xs'>
                          {previewItem?.type_name && (
                            <span className='px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700'>
                              {previewItem.type_name}
                            </span>
                          )}
                          {previewData?.class && (
                            <span className='px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700'>
                              {previewData.class}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const desc =
                            (previewData?.desc && previewData.desc.trim()) ||
                            (previewSearchPick?.desc &&
                              String(previewSearchPick.desc).trim()) ||
                            (previewItem?.remarks &&
                              previewItem.remarks.trim());
                          return desc ? (
                            <div className='max-h-32 overflow-auto whitespace-pre-line text-xs text-gray-700 sm:max-h-40 sm:text-sm dark:text-gray-300'>
                              {desc}
                            </div>
                          ) : null;
                        })()}
                        {/* 按需：应你的要求，预览不再展示集数选择列表，保持布局紧凑 */}
                        {/* Douban/Bangumi 扩展信息 */}
                        <div className='pt-2 space-y-2'>
                          {/* Douban */}
                          {previewDoubanLoading && !previewBangumiLoading && (
                            <div className='text-sm text-gray-500'>
                              加载豆瓣信息...
                            </div>
                          )}
                          {previewDouban &&
                            (() => {
                              const d = previewDouban;
                              return (
                                <div className='border-t border-gray-200 dark:border-gray-700 pt-4 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300'>
                                  <div className='mb-3 flex items-center justify-between gap-3'>
                                    <div className='font-semibold text-gray-900 dark:text-white'>
                                      豆瓣信息
                                    </div>
                                    {d.rate ? (
                                      <span className='rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300'>
                                        豆瓣 {d.rate}
                                      </span>
                                    ) : null}
                                  </div>
                                  {d.title && (
                                    <div className='mb-2 text-sm font-medium text-gray-900 dark:text-white'>
                                      {d.title}
                                    </div>
                                  )}
                                  {d.directors && d.directors.length > 0 && (
                                    <div className='text-xs sm:text-sm'>
                                      导演：{d.directors.join('、')}
                                    </div>
                                  )}
                                  {d.screenwriters &&
                                    d.screenwriters.length > 0 && (
                                      <div className='text-xs sm:text-sm'>
                                        编剧：{d.screenwriters.join('、')}
                                      </div>
                                    )}
                                  {d.cast && d.cast.length > 0 && (
                                    <div className='text-xs sm:text-sm'>
                                      主演：{d.cast.slice(0, 8).join('、')}
                                      {d.cast.length > 8 ? '…' : ''}
                                    </div>
                                  )}
                                  <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                                    {d.genres &&
                                      d.genres.map((g: string) => (
                                        <span
                                          key={g}
                                          className='rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700'
                                        >
                                          {g}
                                        </span>
                                      ))}
                                    {d.countries &&
                                      d.countries.map((c: string) => (
                                        <span
                                          key={c}
                                          className='px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700'
                                        >
                                          {c}
                                        </span>
                                      ))}
                                    {d.languages &&
                                      d.languages.map((l: string) => (
                                        <span
                                          key={l}
                                          className='px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700'
                                        >
                                          {l}
                                        </span>
                                      ))}
                                  </div>
                                  {d.first_aired && (
                                    <div className='mt-3 text-xs sm:text-sm'>
                                      首播/上映：{d.first_aired}
                                    </div>
                                  )}
                                  {(d.episodes ||
                                    d.episode_length ||
                                    d.movie_duration) && (
                                    <div className='mt-2 text-xs text-gray-600 dark:text-gray-400'>
                                      {d.episodes ? `集数：${d.episodes} ` : ''}
                                      {d.episode_length
                                        ? `单集：${d.episode_length} 分钟 `
                                        : ''}
                                      {d.movie_duration
                                        ? `片长：${d.movie_duration} 分钟`
                                        : ''}
                                    </div>
                                  )}
                                  {d.plot_summary && (
                                    <div className='mt-3 line-clamp-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400'>
                                      {d.plot_summary}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                          {/* Bangumi */}
                          {previewBangumiLoading && (
                            <div className='text-sm text-gray-500'>
                              加载 Bangumi 信息...
                            </div>
                          )}
                          {previewBangumi && (
                            <div className='border-t border-gray-200 dark:border-gray-700 pt-4 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300'>
                              <div className='mb-3 flex items-center justify-between gap-3'>
                                <div className='font-semibold text-gray-900 dark:text-white'>
                                  Bangumi 信息
                                </div>
                                {previewBangumi.rating?.score ? (
                                  <span className='rounded-full bg-purple-100 px-2.5 py-1 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'>
                                    Bangumi {previewBangumi.rating.score}
                                  </span>
                                ) : null}
                              </div>
                              <div className='text-sm font-medium text-gray-900 dark:text-white'>
                                {previewBangumi.name_cn || previewBangumi.name}
                              </div>
                              {previewBangumi.date && (
                                <div className='mt-2 text-xs sm:text-sm'>
                                  首播：{previewBangumi.date}
                                </div>
                              )}
                              {Array.isArray(previewBangumi.tags) &&
                                previewBangumi.tags.length > 0 && (
                                  <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                                    {previewBangumi.tags
                                      .slice(0, 10)
                                      .map((t) => (
                                        <span
                                          key={t.name}
                                          className='px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700'
                                        >
                                          {t.name}
                                        </span>
                                      ))}
                                  </div>
                                )}
                              {Array.isArray(previewBangumi.infobox) &&
                                previewBangumi.infobox.length > 0 && (
                                  <div className='mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400'>
                                    {previewBangumi.infobox
                                      .slice(0, 10)
                                      .map((info, idx: number) => (
                                        <div key={info.key}>
                                          {info.key}：
                                          {Array.isArray(info.value)
                                            ? info.value
                                                .map((v) =>
                                                  typeof v === 'string'
                                                    ? v
                                                    : v.v,
                                                )
                                                .join('、')
                                            : typeof info.value === 'string'
                                              ? info.value
                                              : info.value.v}
                                        </div>
                                      ))}
                                  </div>
                                )}
                              {previewBangumi.summary && (
                                <div className='mt-3 line-clamp-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400'>
                                  {previewBangumi.summary}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* 底部操作栏 */}
                <div className='flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-5 py-4 backdrop-blur-md dark:border-gray-700 sm:justify-between sm:px-6'>
                  <div className='hidden text-xs text-gray-500 dark:text-gray-400 sm:block sm:text-sm'>
                    {previewData?.class && (
                      <span className='inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800'>
                        <span className='h-1.5 w-1.5 rounded-full bg-blue-500'></span>
                        {previewData.class}
                      </span>
                    )}
                  </div>
                  <div className='flex items-center gap-2 sm:gap-3'>
                    <button
                      onClick={closePreview}
                      className='ui-control rounded-full px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300'
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        if (previewItem) goPlay(previewItem);
                      }}
                      className='group relative inline-flex items-center justify-center gap-2 rounded-full px-4 sm:px-6 py-2.5 bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] text-[#171717] text-sm font-semibold shadow-md transition-all duration-300 hover:scale-[1.03]'
                    >
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path d='M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z' />
                      </svg>
                      立即播放
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </MountAnimation>
    </PageLayout>
  );
}
