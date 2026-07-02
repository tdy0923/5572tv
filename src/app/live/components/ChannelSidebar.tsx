/* eslint-disable react-hooks/exhaustive-deps, @next/next/no-img-element */

'use client';

import {
  ChevronDown,
  ChevronUp,
  Menu,
  Radio,
  RefreshCw,
  Search,
  Tv,
  X,
} from 'lucide-react';
import { useEffect } from 'react';

import { useInView } from '@/hooks/useInView';

import type { ChannelHealthInfo, LiveChannel, LiveSource } from '../types';
import {
  detectTypeFromUrl,
  getHealthBadgeStyle,
  getTypeBadgeStyle,
} from '../utils';

interface ChannelSidebarProps {
  activeTab: 'channels' | 'sources';
  setActiveTab: (tab: 'channels' | 'sources') => void;
  searchQuery: string;
  handleSearchChange: (query: string) => void;
  isSwitchingSource: boolean;
  liveSyncShouldDisableControls: boolean;
  setIsGroupSelectorOpen: (open: boolean) => void;
  groupedChannels: Record<string, LiveChannel[]>;
  selectedGroup: string;
  handleGroupChange: (group: string) => void;
  dragHandlers: any;
  isDragging: boolean;
  filteredChannels: LiveChannel[];
  channelListRef: React.RefObject<HTMLDivElement | null>;
  handleChannelChange: (channel: LiveChannel) => void;
  currentChannel: LiveChannel | null;
  currentSource: LiveSource | null;
  channelHealthMap: Record<string, ChannelHealthInfo>;
  expandedChannels: Set<string>;
  toggleChannelNameExpanded: (id: string) => void;
  checkChannelHealth: (
    channel: LiveChannel,
    options?: { force?: boolean },
  ) => Promise<ChannelHealthInfo>;
  currentSourceSearchResults: LiveChannel[];
  sourceSearchQuery: string;
  handleSourceSearchChange: (query: string) => void;
  refreshLiveSources: () => Promise<void>;
  isRefreshingSource: boolean;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
  directPlaybackEnabled: boolean;
  setDirectPlaybackEnabled: (enabled: boolean) => void;
  filteredSources: LiveSource[];
  handleSourceChange: (source: LiveSource) => void;
}

function ChannelItem({
  channel,
  isActive,
  isDisabled,
  currentSourceKey,
  channelHealthMap,
  expandedChannels,
  toggleChannelNameExpanded,
  handleChannelChange,
  checkChannelHealth,
}: {
  channel: LiveChannel;
  isActive: boolean;
  isDisabled: boolean;
  currentSourceKey: string;
  channelHealthMap: Record<string, ChannelHealthInfo>;
  expandedChannels: Set<string>;
  toggleChannelNameExpanded: (id: string) => void;
  handleChannelChange: (channel: LiveChannel) => void;
  checkChannelHealth: (
    channel: LiveChannel,
    options?: { force?: boolean },
  ) => Promise<ChannelHealthInfo>;
}) {
  const { ref, isInView } = useInView<HTMLButtonElement>({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true,
  });

  useEffect(() => {
    if (isInView && currentSourceKey) {
      const healthInfo = channelHealthMap[channel.id];
      if (!healthInfo || healthInfo.status === 'unknown') {
        void checkChannelHealth(channel);
      }
    }
  }, [isInView, channel]);

  return (
    <button
      ref={ref}
      key={channel.id}
      data-channel-id={channel.id}
      onClick={() => handleChannelChange(channel)}
      disabled={isDisabled}
      className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : isActive
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden'>
          {channel.logo ? (
            <img
              src={`/api/proxy/logo?url=${encodeURIComponent(channel.logo)}&source=${currentSourceKey}`}
              alt={channel.name}
              className='w-full h-full rounded object-contain'
              loading='lazy'
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.dataset.fallbackApplied) {
                  target.style.display = 'none';
                  return;
                }
                target.dataset.fallbackApplied = 'true';
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  parent.innerHTML = `
                    <div class="fallback-icon relative w-full h-full flex items-center justify-center">
                      <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      <span class="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                    </div>
                  `;
                }
              }}
            />
          ) : (
            <Tv className='w-5 h-5 text-gray-500' />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div
            className='flex items-center gap-1 cursor-pointer select-none group'
            onClick={(e) => {
              e.stopPropagation();
              toggleChannelNameExpanded(channel.id);
            }}
          >
            <div className='flex-1 min-w-0'>
              <div
                className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${expandedChannels.has(channel.id) ? '' : 'line-clamp-1 md:line-clamp-2'}`}
              >
                {channel.name}
              </div>
            </div>
            <div className='shrink-0 flex items-center gap-1'>
              {expandedChannels.has(channel.id) ? (
                <ChevronUp className='w-4 h-4 text-blue-500 dark:text-blue-400 transition-transform duration-300' />
              ) : (
                <ChevronDown className='w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300' />
              )}
              <span className='hidden md:inline text-xs text-blue-500 dark:text-blue-400'>
                {expandedChannels.has(channel.id) ? '收起' : '展开'}
              </span>
            </div>
          </div>
          <div className='mt-1 flex items-center gap-1.5 flex-wrap'>
            <span
              className='text-xs text-gray-500 dark:text-gray-400 truncate'
              title={channel.group}
            >
              {channel.group}
            </span>
            {(() => {
              const healthInfo = channelHealthMap[channel.id];
              const streamType =
                healthInfo?.type || detectTypeFromUrl(channel.url);
              const healthStatus = healthInfo?.status || 'unknown';
              const healthLabel =
                healthStatus === 'healthy'
                  ? '可用'
                  : healthStatus === 'slow'
                    ? '较慢'
                    : healthStatus === 'unreachable'
                      ? '异常'
                      : healthStatus === 'checking'
                        ? '检测中'
                        : '未检测';
              const latencyText =
                typeof healthInfo?.latencyMs === 'number'
                  ? `${healthInfo.latencyMs}ms`
                  : '';

              return (
                <>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded-full border ${getTypeBadgeStyle(streamType)}`}
                  >
                    {streamType.toUpperCase()}
                  </span>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded-full border ${getHealthBadgeStyle(healthStatus)}`}
                    title={healthInfo?.message || healthLabel}
                  >
                    {healthLabel}
                    {latencyText ? ` ${latencyText}` : ''}
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ChannelSidebar({
  activeTab,
  setActiveTab,
  searchQuery,
  handleSearchChange,
  isSwitchingSource,
  liveSyncShouldDisableControls,
  setIsGroupSelectorOpen,
  groupedChannels,
  selectedGroup,
  handleGroupChange,
  dragHandlers,
  isDragging,
  filteredChannels,
  channelListRef,
  handleChannelChange,
  currentChannel,
  currentSource,
  channelHealthMap,
  expandedChannels,
  toggleChannelNameExpanded,
  checkChannelHealth,
  currentSourceSearchResults,
  sourceSearchQuery,
  handleSourceSearchChange,
  refreshLiveSources,
  isRefreshingSource,
  autoRefreshEnabled,
  setAutoRefreshEnabled,
  autoRefreshInterval,
  setAutoRefreshInterval,
  directPlaybackEnabled,
  setDirectPlaybackEnabled,
  filteredSources,
  handleSourceChange,
}: ChannelSidebarProps) {
  return (
    <div className='h-[300px] lg:h-full md:overflow-hidden transition-all duration-300 ease-in-out md:col-span-1 lg:opacity-100 lg:scale-100'>
      <div className='md:ml-2 px-4 py-0 h-full rounded-xl bg-black/10 dark:bg-gray-800 flex flex-col border border-white/0 dark:border-white/30 overflow-hidden'>
        <div className='flex mb-1 -mx-6 shrink-0'>
          <div
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-3 px-6 text-center cursor-pointer transition-all duration-200 font-medium
              ${
                activeTab === 'channels'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-700 hover:text-green-600 bg-black/5 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-green-400 hover:bg-black/3 dark:hover:bg-white/3'
              }
            `.trim()}
          >
            频道
          </div>
          <div
            onClick={() => setActiveTab('sources')}
            className={`flex-1 py-3 px-6 text-center cursor-pointer transition-all duration-200 font-medium
              ${
                activeTab === 'sources'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-700 hover:text-green-600 bg-black/5 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-green-400 hover:bg-black/3 dark:hover:bg-white/3'
              }
            `.trim()}
          >
            直播源
          </div>
        </div>

        {activeTab === 'channels' && (
          <>
            <div className='mb-4 -mx-6 px-6 shrink-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='搜索频道...'
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className='w-full pl-10 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  >
                    <X className='w-4 h-4' />
                  </button>
                )}
              </div>
            </div>

            {!searchQuery.trim() ? (
              <>
                <div className='mb-4 -mx-6 shrink-0'>
                  {isSwitchingSource && (
                    <div className='flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 px-6 mb-2'>
                      <div className='w-2 h-2 bg-amber-500 rounded-full animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]'></div>
                      切换直播源中...
                    </div>
                  )}

                  <div className='flex items-center gap-3 px-6'>
                    <button
                      onClick={() => setIsGroupSelectorOpen(true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all shrink-0 ${
                        isSwitchingSource
                          ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600'
                          : 'border-green-500 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      disabled={isSwitchingSource}
                    >
                      <Menu className='w-4 h-4 text-green-600 dark:text-green-400' />
                      <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        全部分类
                      </span>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        ({Object.keys(groupedChannels).length})
                      </span>
                    </button>

                    <div className='flex-1 min-w-0 border-b border-gray-200 dark:border-gray-700'>
                      <div
                        className='flex overflow-x-auto scrollbar-hide gap-1 py-2 px-1'
                        {...dragHandlers}
                        style={{
                          cursor: isDragging ? 'grabbing' : 'grab',
                          userSelect: 'none',
                        }}
                      >
                        {Object.keys(groupedChannels).map((group) => {
                          const isSelected = group === selectedGroup;
                          return (
                            <button
                              key={group}
                              onClick={() =>
                                !isSwitchingSource && handleGroupChange(group)
                              }
                              disabled={isSwitchingSource}
                              data-group={group}
                              className={`
                                flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-full transition-colors
                                ${
                                  isSelected
                                    ? 'bg-green-500 text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }
                                ${isSwitchingSource ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                            >
                              {group}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  ref={channelListRef}
                  className='flex-1 overflow-y-auto space-y-2 pb-24 md:pb-4'
                >
                  {filteredChannels.length > 0 ? (
                    filteredChannels.map((channel) => (
                      <ChannelItem
                        key={channel.id}
                        channel={channel}
                        isActive={channel.id === currentChannel?.id}
                        isDisabled={
                          isSwitchingSource || liveSyncShouldDisableControls
                        }
                        currentSourceKey={currentSource?.key || ''}
                        channelHealthMap={channelHealthMap}
                        expandedChannels={expandedChannels}
                        toggleChannelNameExpanded={toggleChannelNameExpanded}
                        handleChannelChange={handleChannelChange}
                        checkChannelHealth={checkChannelHealth}
                      />
                    ))
                  ) : (
                    <div className='flex flex-col items-center justify-center py-12 text-center'>
                      <div className='relative mb-6'>
                        <div className='w-20 h-20 bg-linear-to-br from-gray-100 to-slate-200 dark:from-gray-700 dark:to-slate-700 rounded-2xl flex items-center justify-center shadow-lg'>
                          <Tv className='w-10 h-10 text-gray-400 dark:text-gray-500' />
                        </div>
                        <div className='absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping'></div>
                        <div className='absolute -bottom-1 -left-1 w-2 h-2 bg-purple-400 rounded-full animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]'></div>
                      </div>
                      <p className='text-base font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                        暂无可用频道
                      </p>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        请选择其他直播源或稍后再试
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className='flex-1 overflow-y-auto space-y-2 pb-24 md:pb-4'>
                {currentSourceSearchResults.length > 0 ? (
                  <div className='space-y-1 mb-2'>
                    <div className='text-xs text-gray-500 dark:text-gray-400 px-2'>
                      在 &quot;{currentSource?.name}&quot; 中找到{' '}
                      {currentSourceSearchResults.length} 个频道
                    </div>
                  </div>
                ) : null}

                {currentSourceSearchResults.length > 0 ? (
                  currentSourceSearchResults.map((channel) => {
                    const isActive = channel.id === currentChannel?.id;
                    const isDisabled =
                      isSwitchingSource || liveSyncShouldDisableControls;
                    return (
                      <button
                        key={channel.id}
                        onClick={() => handleChannelChange(channel)}
                        disabled={isDisabled}
                        className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : isActive
                              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0 overflow-hidden'>
                            {channel.logo ? (
                              <img
                                src={`/api/proxy/logo?url=${encodeURIComponent(channel.logo)}&source=${currentSource?.key || ''}`}
                                alt={channel.name}
                                className='w-full h-full rounded object-contain'
                                loading='lazy'
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (target.dataset.fallbackApplied) {
                                    target.style.display = 'none';
                                    return;
                                  }

                                  target.dataset.fallbackApplied = 'true';
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (
                                    parent &&
                                    !parent.querySelector('.fallback-icon')
                                  ) {
                                    parent.innerHTML = `
                                      <div class="fallback-icon relative w-full h-full flex items-center justify-center">
                                        <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                        </svg>
                                        <span class="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <Tv className='w-5 h-5 text-gray-500' />
                            )}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div
                              className='flex items-center gap-1 cursor-pointer select-none group'
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleChannelNameExpanded(channel.id);
                              }}
                            >
                              <div className='flex-1 min-w-0'>
                                <div
                                  className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${expandedChannels.has(channel.id) ? '' : 'line-clamp-1 md:line-clamp-2'}`}
                                >
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: searchQuery
                                        ? channel.name
                                            .replace(/&/g, '&amp;')
                                            .replace(/</g, '&lt;')
                                            .replace(/>/g, '&gt;')
                                            .replace(/"/g, '&quot;')
                                            .replace(
                                              new RegExp(
                                                `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                                                'gi',
                                              ),
                                              '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>',
                                            )
                                        : channel.name
                                            .replace(/&/g, '&amp;')
                                            .replace(/</g, '&lt;')
                                            .replace(/>/g, '&gt;')
                                            .replace(/"/g, '&quot;'),
                                    }}
                                  />
                                </div>
                              </div>
                              <div className='shrink-0 flex items-center gap-1'>
                                {expandedChannels.has(channel.id) ? (
                                  <ChevronUp className='w-4 h-4 text-blue-500 dark:text-blue-400 transition-transform duration-300' />
                                ) : (
                                  <ChevronDown className='w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-300' />
                                )}
                                <span className='hidden md:inline text-xs text-blue-500 dark:text-blue-400'>
                                  {expandedChannels.has(channel.id)
                                    ? '收起'
                                    : '展开'}
                                </span>
                              </div>
                            </div>
                            <div
                              className='text-xs text-gray-500 dark:text-gray-400 mt-1 truncate'
                              title={channel.group}
                            >
                              {channel.group}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className='flex flex-col items-center justify-center py-12 text-center'>
                    <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4'>
                      <Search className='w-8 h-8 text-gray-400 dark:text-gray-600' />
                    </div>
                    <p className='text-gray-500 dark:text-gray-400 font-medium'>
                      未找到匹配的频道
                    </p>
                    <p className='text-sm text-gray-400 dark:text-gray-500 mt-1'>
                      在当前直播源 &quot;{currentSource?.name}&quot;
                      中未找到匹配结果
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'sources' && (
          <div className='flex flex-col h-full mt-4'>
            <div className='mb-4 -mx-6 px-6 shrink-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='搜索直播源...'
                  value={sourceSearchQuery}
                  onChange={(e) => handleSourceSearchChange(e.target.value)}
                  className='w-full pl-10 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                />
                {sourceSearchQuery && (
                  <button
                    onClick={() => handleSourceSearchChange('')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  >
                    <X className='w-4 h-4' />
                  </button>
                )}
              </div>
            </div>

            <div className='mb-4 -mx-6 px-6 shrink-0 space-y-3'>
              <div className='flex gap-2'>
                <button
                  onClick={refreshLiveSources}
                  disabled={isRefreshingSource}
                  className='flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors flex-1'
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRefreshingSource ? 'animate-spin' : ''}`}
                  />
                  {isRefreshingSource ? '刷新中...' : '刷新源'}
                </button>
              </div>

              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    id='autoRefresh'
                    checked={autoRefreshEnabled}
                    onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                    className='rounded text-green-500 focus:ring-primary-500'
                  />
                  <label
                    htmlFor='autoRefresh'
                    className='text-sm text-gray-700 dark:text-gray-300'
                  >
                    自动刷新
                  </label>
                </div>

                {autoRefreshEnabled && (
                  <div className='flex items-center gap-2'>
                    <select
                      value={autoRefreshInterval}
                      onChange={(e) =>
                        setAutoRefreshInterval(Number(e.target.value))
                      }
                      className='text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    >
                      <option value={10}>10分钟</option>
                      <option value={15}>15分钟</option>
                      <option value={30}>30分钟</option>
                      <option value={60}>1小时</option>
                      <option value={120}>2小时</option>
                    </select>
                  </div>
                )}
              </div>

              <div className='flex items-center gap-3 pt-2'>
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    id='directPlayback'
                    checked={directPlaybackEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setDirectPlaybackEnabled(enabled);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(
                          'live-direct-playback-enabled',
                          JSON.stringify(enabled),
                        );
                      }
                    }}
                    className='rounded text-green-500 focus:ring-primary-500'
                  />
                  <label
                    htmlFor='directPlayback'
                    className='text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1'
                  >
                    ⚡ 直连模式
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      (智能检测CORS)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {sourceSearchQuery.trim() && filteredSources.length > 0 && (
              <div className='mb-2 -mx-6 px-6 shrink-0'>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  找到 {filteredSources.length} 个直播源
                </div>
              </div>
            )}

            <div className='flex-1 overflow-y-auto space-y-2 pb-20'>
              {filteredSources.length > 0 ? (
                filteredSources.map((source) => {
                  const isCurrentSource = source.key === currentSource?.key;
                  return (
                    <div
                      key={source.key}
                      onClick={() =>
                        !isCurrentSource && handleSourceChange(source)
                      }
                      className={`flex items-start gap-3 px-2 py-3 rounded-lg transition-all select-none duration-200 relative
                        ${
                          isCurrentSource
                            ? 'bg-green-500/10 dark:bg-green-500/20 border-green-500/30 border'
                            : 'hover:bg-gray-200/50 dark:hover:bg-white/10 hover:scale-[1.02] cursor-pointer'
                        }`.trim()}
                    >
                      <div className='w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center shrink-0'>
                        <Radio className='w-6 h-6 text-gray-500' />
                      </div>

                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                          {sourceSearchQuery ? (
                            <span
                              dangerouslySetInnerHTML={{
                                __html: source.name
                                  .replace(/&/g, '&amp;')
                                  .replace(/</g, '&lt;')
                                  .replace(/>/g, '&gt;')
                                  .replace(/"/g, '&quot;')
                                  .replace(
                                    new RegExp(
                                      `(${sourceSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                                      'gi',
                                    ),
                                    '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>',
                                  ),
                              }}
                            />
                          ) : (
                            source.name
                          )}
                        </div>
                        <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                          {!source.channelNumber || source.channelNumber === 0
                            ? '-'
                            : `${source.channelNumber} 个频道`}
                        </div>
                      </div>

                      {isCurrentSource && (
                        <div className='absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full'></div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  {sourceSearchQuery.trim() ? (
                    <>
                      <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4'>
                        <Search className='w-8 h-8 text-gray-400 dark:text-gray-600' />
                      </div>
                      <p className='text-gray-500 dark:text-gray-400 font-medium'>
                        未找到匹配的直播源
                      </p>
                      <p className='text-sm text-gray-400 dark:text-gray-500 mt-1'>
                        搜索 &quot;{sourceSearchQuery}&quot; 无结果
                      </p>
                    </>
                  ) : (
                    <>
                      <div className='relative mb-6'>
                        <div className='w-20 h-20 bg-linear-to-br from-orange-100 to-red-200 dark:from-orange-900/40 dark:to-red-900/40 rounded-2xl flex items-center justify-center shadow-lg'>
                          <Radio className='w-10 h-10 text-orange-500 dark:text-orange-400' />
                        </div>
                        <div className='absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-ping'></div>
                        <div className='absolute -bottom-1 -left-1 w-2 h-2 bg-red-400 rounded-full animate-[fluent2-shimmer_1.5s_ease-in-out_infinite]'></div>
                      </div>
                      <p className='text-base font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                        暂无可用直播源
                      </p>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        请检查网络连接或联系管理员添加直播源
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
