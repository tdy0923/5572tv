import { Menu, Radio, Search, Tv, X } from 'lucide-react';

import type { GroupSortMode } from '../types';

interface GroupSelectorModalProps {
  groupedChannels: Record<string, any[]>;
  currentChannels: any[];
  selectedGroup: string;
  groupSearchQuery: string;
  groupSortMode: GroupSortMode;
  pinnedGroups: string[];
  recentGroups: string[];
  handleGroupChange: (
    group: string,
    options?: { preserveSearch?: boolean; skipRecent?: boolean },
  ) => void;
  handlePinnedGroupToggle: (group: string) => void;
  setGroupSearchQuery: (query: string) => void;
  setIsGroupSelectorOpen: (open: boolean) => void;
  setGroupSortMode: (mode: GroupSortMode) => void;
}

export default function GroupSelectorModal({
  groupedChannels,
  currentChannels,
  selectedGroup,
  groupSearchQuery,
  groupSortMode,
  pinnedGroups,
  recentGroups,
  handleGroupChange,
  handlePinnedGroupToggle,
  setGroupSearchQuery,
  setIsGroupSelectorOpen,
  setGroupSortMode,
}: GroupSelectorModalProps) {
  const groups = Object.keys(groupedChannels);
  const groupSummaries = groups.map((group, index) => ({
    name: group,
    count: groupedChannels[group]?.length || 0,
    order: index,
  }));

  let sortedSummaries = [...groupSummaries];
  if (groupSortMode === 'count') {
    sortedSummaries.sort((a, b) => b.count - a.count || a.order - b.order);
  } else if (groupSortMode === 'name') {
    sortedSummaries.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  } else {
    sortedSummaries.sort((a, b) => a.order - b.order);
  }

  const searchedSummaries = groupSearchQuery
    ? sortedSummaries.filter((item) =>
        item.name.toLowerCase().includes(groupSearchQuery.toLowerCase()),
      )
    : sortedSummaries;

  const pinnedSet = new Set(pinnedGroups);
  const pinnedSummaries = searchedSummaries.filter((item) =>
    pinnedSet.has(item.name),
  );

  const recentSummaries = recentGroups
    .map((groupName) =>
      searchedSummaries.find((item) => item.name === groupName),
    )
    .filter(
      (item): item is (typeof groupSummaries)[0] =>
        !!item && !pinnedSet.has(item.name),
    );

  const hiddenGroups = new Set([
    ...pinnedSummaries.map((item) => item.name),
    ...recentSummaries.map((item) => item.name),
  ]);
  const panelSummaries = groupSearchQuery
    ? searchedSummaries
    : searchedSummaries.filter((item) => !hiddenGroups.has(item.name));

  const renderGroupRow = (groupItem: (typeof groupSummaries)[0]) => {
    const isSelected = selectedGroup === groupItem.name;
    const isPinned = pinnedSet.has(groupItem.name);

    return (
      <div
        key={groupItem.name}
        className={`group rounded-xl border transition-all duration-200 ${
          isSelected
            ? 'border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
            : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 bg-white/60 dark:bg-gray-800/40'
        }`}
      >
        <div className='flex items-center'>
          <button
            onClick={() => {
              handleGroupChange(groupItem.name);
              setIsGroupSelectorOpen(false);
              setGroupSearchQuery('');
            }}
            className='flex-1 px-4 py-3 text-left'
          >
            <div className='flex items-center justify-between gap-3'>
              <div className='min-w-0'>
                <div className='font-medium text-gray-900 dark:text-gray-100 truncate'>
                  {groupItem.name}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {groupItem.count} 个频道
                </div>
              </div>
              {isSelected && (
                <span className='shrink-0 px-2 py-1 text-xs rounded-full bg-green-600 text-white'>
                  当前
                </span>
              )}
            </div>
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              handlePinnedGroupToggle(groupItem.name);
            }}
            className='mx-2 p-2 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            title={isPinned ? '取消置顶分类' : '置顶分类'}
          >
            {isPinned ? (
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z' />
              </svg>
            ) : (
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z'
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'
      onClick={() => {
        setIsGroupSelectorOpen(false);
        setGroupSearchQuery('');
      }}
    >
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' />

      <div
        className='relative bg-white dark:bg-gray-800 w-full max-h-[85vh] sm:max-h-[80vh] sm:max-w-md sm:mx-4 flex flex-col
                   rounded-t-3xl sm:rounded-2xl shadow-2xl
                   animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-300'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='sm:hidden flex justify-center pt-3 pb-2'>
          <div className='w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full' />
        </div>

        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              分类管理面板
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
              支持置顶、最近访问与排序管理
            </p>
          </div>
          <button
            onClick={() => {
              setIsGroupSelectorOpen(false);
              setGroupSearchQuery('');
            }}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            <X className='w-6 h-6' />
          </button>
        </div>

        <div className='grid grid-cols-3 gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40'>
          <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 p-3'>
            <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
              <Menu className='w-3.5 h-3.5' />
              分类总数
            </div>
            <div className='text-xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
              {Object.keys(groupedChannels).length}
            </div>
          </div>
          <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 p-3'>
            <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
              <Tv className='w-3.5 h-3.5' />
              频道总数
            </div>
            <div className='text-xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
              {currentChannels.length}
            </div>
          </div>
          <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 p-3'>
            <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
              <Radio className='w-3.5 h-3.5' />
              当前分类
            </div>
            <div className='text-xl font-semibold text-gray-900 dark:text-gray-100 mt-1'>
              {selectedGroup ? groupedChannels[selectedGroup]?.length || 0 : 0}
            </div>
          </div>
        </div>

        <div className='px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='搜索分类...'
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              className='w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400
                         transition-all'
            />
            {groupSearchQuery && (
              <button
                onClick={() => setGroupSearchQuery('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              >
                <X className='w-5 h-5' />
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => setGroupSortMode('default')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                groupSortMode === 'default'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title='按默认顺序'
            >
              默认
            </button>
            <button
              onClick={() => setGroupSortMode('count')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                groupSortMode === 'count'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title='按频道数排序'
            >
              频道数
            </button>
            <button
              onClick={() => setGroupSortMode('name')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                groupSortMode === 'name'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title='按名称排序'
            >
              名称
            </button>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto px-6 py-4 overscroll-contain'>
          <div className='space-y-4 pb-4'>
            {searchedSummaries.length > 0 ? (
              <>
                {!groupSearchQuery && pinnedSummaries.length > 0 && (
                  <section>
                    <div className='flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      <svg
                        className='w-4 h-4 text-green-600 dark:text-green-400'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path d='M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z' />
                      </svg>
                      置顶分类
                    </div>
                    <div className='space-y-2'>
                      {pinnedSummaries.map(renderGroupRow)}
                    </div>
                  </section>
                )}

                {!groupSearchQuery && recentSummaries.length > 0 && (
                  <section>
                    <div className='flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      <svg
                        className='w-4 h-4 text-blue-600 dark:text-blue-400'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                        />
                      </svg>
                      最近访问
                    </div>
                    <div className='space-y-2'>
                      {recentSummaries.map(renderGroupRow)}
                    </div>
                  </section>
                )}

                <section>
                  <div className='flex items-center justify-between gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    <div className='flex items-center gap-2'>
                      <Menu className='w-4 h-4 text-gray-500 dark:text-gray-400' />
                      {groupSearchQuery ? '搜索结果' : '全部分类'}
                    </div>
                    {groupSearchQuery && (
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        {searchedSummaries.length} 项
                      </span>
                    )}
                  </div>
                  <div className='space-y-2'>
                    {(groupSearchQuery
                      ? searchedSummaries
                      : panelSummaries
                    ).map(renderGroupRow)}
                  </div>
                </section>
              </>
            ) : (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <div className='w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4'>
                  <Menu className='w-8 h-8 text-gray-400 dark:text-gray-500' />
                </div>
                <p className='text-gray-500 dark:text-gray-400 font-medium'>
                  未找到匹配的分类
                </p>
                <p className='text-sm text-gray-400 dark:text-gray-500 mt-1'>
                  请尝试其他搜索关键词
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
