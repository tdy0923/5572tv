'use client';

import { ChevronUp, Filter, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getShortDramaCategories,
  getShortDramaList,
  searchShortDramas,
} from '@/lib/shortdrama.client';
import { cleanExpiredCache } from '@/lib/shortdrama-cache';
import { ShortDramaCategory, ShortDramaItem } from '@/lib/types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
} from '@/components/FluentUI';
import { FluentInput } from '@/components/FluentInput';
import { FluentSpinner } from '@/components/FluentSpinner';
import MountAnimation from '@/components/MountAnimation';
import PageLayout from '@/components/PageLayout';
import ShortDramaCard from '@/components/ShortDramaCard';
import { SiteAdSlot } from '@/components/SiteAdSlot';
import { PillButton, PillGroup } from '@/components/ui-surface';
import VirtualGrid from '@/components/VirtualGrid';

export default function ShortDramaPage() {
  const [categories, setCategories] = useState<ShortDramaCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // 等分类加载后自动选中第一个（按分类名选择，避免不同源同名分类ID冲突）
  const [dramas, setDramas] = useState<ShortDramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);
  // 用于防止分类切换时的闪烁
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // 虚拟化开关状态
  const [useVirtualization, setUseVirtualization] = useState(true);
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'name'>('latest');

  const observer = useRef<IntersectionObserver | undefined>(undefined);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDramaElementRef = useCallback(
    (node: HTMLDivElement) => {
      // 虚拟化模式使用 endReached 回调，不需要 IntersectionObserver
      if (useVirtualization) return;
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, useVirtualization],
  );

  // 获取分类列表
  useEffect(() => {
    // 清理过期缓存
    cleanExpiredCache().catch(console.error);

    const fetchCategories = async () => {
      const cats = await getShortDramaCategories();
      setCategories(cats);
      // 自动选中第一个分类
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].type_name);
      }
    };
    fetchCategories();
  }, []);

  // 加载搜索历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shortdrama-search-history');
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch {}
  }, []);

  // Load virtualization preference from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('useShortDramaVirtualization');
      if (saved !== null) setUseVirtualization(JSON.parse(saved));
    } catch {}
  }, []);

  // 监听滚动位置，控制返回顶部按钮显示
  useEffect(() => {
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 加载短剧列表
  const loadDramas = useCallback(
    async (pageNum: number, reset = false) => {
      if (!selectedCategory && !isSearchMode) return;

      setLoading(true);
      try {
        let result: { list: ShortDramaItem[]; hasMore: boolean };
        if (isSearchMode && searchQuery) {
          result = await searchShortDramas(searchQuery, pageNum, 20);
        } else if (selectedCategory) {
          result = await getShortDramaList(0, pageNum, 20, selectedCategory);
        } else {
          setLoading(false);
          return;
        }

        if (reset) {
          setDramas(result.list);
          setIsInitialLoad(false);
        } else {
          // Deduplicate by id when loading more
          setDramas((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const newItems = result.list.filter((d) => !existingIds.has(d.id));
            return [...prev, ...newItems];
          });
        }
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('加载短剧失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, searchQuery, isSearchMode],
  );

  // 当分类变化时重新加载
  useEffect(() => {
    if (selectedCategory && !isSearchMode) {
      setPage(1);
      setHasMore(true);
      loadDramas(1, true);
    }
  }, [selectedCategory, isSearchMode, loadDramas]);

  // 当页码变化时加载更多
  useEffect(() => {
    if (page > 1) {
      loadDramas(page, false);
    }
  }, [page, loadDramas]);

  // 保存搜索历史
  const saveSearchHistory = (query: string) => {
    const updated = [query, ...searchHistory.filter((h) => h !== query)].slice(
      0,
      10,
    );
    setSearchHistory(updated);
    localStorage.setItem('shortdrama-search-history', JSON.stringify(updated));
  };

  // 处理搜索
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      setIsSearchMode(!!query);
      setPage(1);
      setHasMore(true);

      if (query) {
        saveSearchHistory(query);
        const result = await searchShortDramas(query, 1, 20);
        setDramas(result.list);
        setHasMore(result.hasMore);
      }
      // 如果清空搜索，不需要手动调用 loadDramas
      // useEffect 会自动监听 isSearchMode 的变化并重新加载
    },
    [searchHistory],
  );

  const sortedDramas = [...dramas].sort((a, b) => {
    if (sortBy === 'latest') return (b.vod_time || 0) - (a.vod_time || 0);
    if (sortBy === 'popular') return (b.vod_hits || 0) - (a.vod_hits || 0);
    if (sortBy === 'name') return a.vod_name.localeCompare(b.vod_name);
    return 0;
  });

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      // 根据调试结果，真正的滚动容器是 document.body
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch {
      // 如果平滑滚动完全失败，使用立即滚动
      document.body.scrollTop = 0;
    }
  };

  const toggleVirtualization = () => {
    const newValue = !useVirtualization;
    setUseVirtualization(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'useShortDramaVirtualization',
        JSON.stringify(newValue),
      );
    }
  };

  return (
    <PageLayout activePath='/shortdrama'>
      <MountAnimation>
        <div className='min-h-screen -mt-6 md:mt-0'>
          <div className=''>
            <SiteAdSlot position='footer' className='mb-6' />
            {/* 页面标题 */}
            <div className='mb-6'>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                短剧频道
              </h1>
              <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                精彩短剧，一刷到底
              </p>
            </div>

            {/* 搜索栏 — FluentInput */}
            <FluentCard variant='default' className='mb-6 !p-4'>
              <FluentInput
                placeholder='搜索短剧名称...'
                value={searchQuery}
                prefix={<Search className='h-4 w-4 text-gray-400' />}
                onFocus={() => setIsSearchInputFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchInputFocused(false), 200)}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  searchTimerRef.current = setTimeout(() => {
                    if (value.trim()) {
                      handleSearch(value.trim());
                    } else {
                      setIsSearchMode(false);
                    }
                  }, 300);
                }}
              />
              {/* 搜索历史 */}
              {isSearchInputFocused &&
                !searchQuery &&
                searchHistory.length > 0 && (
                  <div className='mt-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>搜索历史</span>
                      <FluentButton
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setSearchHistory([]);
                          localStorage.removeItem('shortdrama-search-history');
                        }}
                      >
                        清除
                      </FluentButton>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {searchHistory.map((item) => (
                        <FluentBadge
                          key={item}
                          variant='default'
                          size='sm'
                          rounded
                          className='cursor-pointer'
                          onClick={() => {
                            setSearchQuery(item);
                            handleSearch(item);
                          }}
                        >
                          {item}
                        </FluentBadge>
                      ))}
                    </div>
                  </div>
                )}
            </FluentCard>

            {/* 分类筛选 — FluentCard + FluentBadge */}
            {!isSearchMode && categories.length > 0 && (
              <FluentCard variant='default' className='mb-6 !p-4'>
                <div className='mb-3 flex items-center justify-between gap-4'>
                  <div className='flex items-center gap-2'>
                    <Filter className='h-4 w-4 text-gray-500' />
                    <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>分类</span>
                  </div>
                  <FluentBadge variant='info' size='sm' rounded>
                    {categories.length}
                  </FluentBadge>
                </div>
                <PillGroup className='flex flex-wrap gap-2.5 rounded-[24px] p-2'>
                  {categories.map((category, index) => (
                    <PillButton
                      key={category.type_name}
                      onClick={() => {
                        setSelectedCategory(category.type_name);
                      }}
                      active={selectedCategory === category.type_name}
                      className='px-4 py-2 duration-300'
                      style={{
                        animation: `fadeInUp 0.3s ease-out ${index * 0.03}s both`,
                      }}
                    >
                      {category.type_name}
                    </PillButton>
                  ))}
                </PillGroup>
              </FluentCard>
            )}

            {/* 排序选项 */}
            {!isSearchMode && (
              <div className='flex items-center gap-2 mb-4'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  排序:
                </span>
                <PillButton
                  active={sortBy === 'latest'}
                  onClick={() => setSortBy('latest')}
                  className='px-3 py-1 text-xs'
                >
                  最新
                </PillButton>
                <PillButton
                  active={sortBy === 'popular'}
                  onClick={() => setSortBy('popular')}
                  className='px-3 py-1 text-xs'
                >
                  最热
                </PillButton>
                <PillButton
                  active={sortBy === 'name'}
                  onClick={() => setSortBy('name')}
                  className='px-3 py-1 text-xs'
                >
                  名称
                </PillButton>
              </div>
            )}

            {/* 虚拟化开关 */}
            <div className='flex justify-end mb-4'>
              <label className='flex items-center gap-3 cursor-pointer select-none group'>
                <span className='text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors'>
                  虚拟滑动
                </span>
                <div className='relative inline-flex items-center rounded-full border border-black/6 bg-white/75 p-1 shadow-sm backdrop-blur-md dark:border-white/8 dark:bg-gray-800'>
                  <input
                    type='checkbox'
                    className='sr-only peer'
                    checked={useVirtualization}
                    onChange={toggleVirtualization}
                  />
                  <div className='relative flex h-6 w-11 items-center rounded-full bg-gray-200 transition-all duration-300 peer-checked:bg-linear-to-r peer-checked:from-[#f4c24d] peer-checked:via-[#f0b938] peer-checked:to-[#d89c18] dark:bg-gray-700'></div>
                  <div className='absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 peer-checked:translate-x-5'>
                    <span className='text-[10px] text-gray-500'>
                      {useVirtualization ? '✨' : '○'}
                    </span>
                  </div>
                </div>
              </label>
            </div>

            {/* 短剧网格 */}
            {useVirtualization ? (
              <VirtualGrid
                items={sortedDramas}
                className='grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                rowGapClass='pb-4'
                estimateRowHeight={280}
                endReached={() => {
                  if (hasMore && !loading) {
                    setPage((prevPage) => prevPage + 1);
                  }
                }}
                endReachedThreshold={3}
                renderItem={(drama, index) => (
                  <ShortDramaCard drama={drama} priority={index < 30} />
                )}
              />
            ) : (
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
                {sortedDramas.map((drama, index) => (
                  <div
                    key={`${drama.id}-${index}`}
                    ref={
                      index === sortedDramas.length - 1
                        ? lastDramaElementRef
                        : null
                    }
                  >
                    <ShortDramaCard drama={drama} />
                  </div>
                ))}
              </div>
            )}

            {/* 加载更多按钮 — FluentButton */}
            {!useVirtualization &&
              hasMore &&
              !loading &&
              sortedDramas.length > 0 && (
                <div className='flex justify-center mt-8'>
                  <FluentButton variant='primary' onClick={() => setPage((prevPage) => prevPage + 1)}>
                    加载更多
                  </FluentButton>
                </div>
              )}

            {/* 加载状态 — FluentSpinner */}
            {loading && (isInitialLoad || page > 1) && (
              <div className='mt-8'>
                <div className='flex justify-center mb-6'>
                  <FluentCard variant='default' className='flex items-center gap-3 !px-6 !py-3'>
                    <FluentSpinner size='medium' />
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>加载更多短剧…</span>
                  </FluentCard>
                </div>
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className='relative overflow-hidden'
                      style={{
                        animation: `fluent2-fade-in 250ms cubic-bezier(0,0,0,1) ${index * 40}ms both`,
                      }}
                    >
                      <div
                        className='aspect-[2/3] w-full rounded-lg'
                        style={{
                          background:
                            'linear-gradient(135deg, var(--color-background-muted), var(--color-background-subtle), var(--color-background-muted))',
                          backgroundSize: '200% 100%',
                          animation: 'fluent2-shimmer 1.5s ease-in-out infinite',
                        }}
                      />
                      <div
                        className='mt-2 h-4 rounded'
                        style={{
                          background: 'var(--color-background-muted)',
                          width: '70%',
                        }}
                      />
                      <div
                        className='mt-1 h-3 rounded'
                        style={{
                          background: 'var(--color-background-muted)',
                          width: '45%',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无更多数据提示 — FluentCard + FluentBadge */}
            {!loading && !hasMore && sortedDramas.length > 0 && (
              <div className='flex justify-center mt-8 py-6'>
                <FluentCard variant='default' className='flex flex-col items-center gap-2 !px-8 !py-5'>
                  <FluentBadge variant='info' size='md' rounded>
                    已经到底了
                  </FluentBadge>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>共 {sortedDramas.length} 部短剧</p>
                </FluentCard>
              </div>
            )}

            {/* 无搜索结果 — FluentEmptyState */}
            {!loading && sortedDramas.length === 0 && isSearchMode && (
              <FluentCard variant='default' className='mt-8 !p-0 max-w-md mx-auto'>
                <FluentEmptyState
                  icon={<Search className='h-6 w-6 text-gray-400' />}
                  title='没有找到相关短剧'
                  description='换个关键词试试，或者浏览其他分类'
                  action={
                    <FluentButton variant='secondary' onClick={() => handleSearch('')}>
                      清除搜索条件
                    </FluentButton>
                  }
                />
              </FluentCard>
            )}
            {/* 初始空状态 — 未搜索且无数据 */}
            {!loading && sortedDramas.length === 0 && !isSearchMode && categories.length === 0 && (
              <FluentCard variant='default' className='mt-8 !p-0'>
                <FluentEmptyState
                  icon={<Search className='h-6 w-6 text-gray-400' />}
                  title='暂无短剧'
                  description='短剧分类加载中或暂无数据，请稍后重试'
                />
              </FluentCard>
            )}
          </div>
        </div>
      </MountAnimation>

      {/* 返回顶部悬浮按钮 — FluentButton */}
      <div
        className={`fixed bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-6 right-6 z-70 transition-all duration-300 ease-in-out ${
          showBackToTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <FluentButton variant='primary' size='lg' onClick={scrollToTop} aria-label='返回顶部' className='!rounded-full !w-12 !h-12 !p-0 shadow-lg'>
          <ChevronUp className='h-6 w-6' />
        </FluentButton>
      </div>
    </PageLayout>
  );
}
