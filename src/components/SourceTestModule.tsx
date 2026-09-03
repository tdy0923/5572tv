'use client';

import {
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { SearchResult } from '@/lib/types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentCheckbox,
  FluentEmptyState,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';
import VideoCard from '@/components/VideoCard';

// API源信息接口
interface ApiSite {
  key: string;
  name: string;
  api: string;
  disabled?: boolean;
}

// 源测试结果接口
interface SourceTestResult {
  source: string;
  sourceName: string;
  status: 'pending' | 'testing' | 'success' | 'error' | 'timeout';
  results: SearchResult[];
  responseTime?: number;
  error?: string;
  disabled?: boolean;
  resultCount?: number;
  matchRate?: number;
  topMatches?: string[];
}

// 计算匹配率与示例（供顶层 testSource 复用）
function computeMatchRate(results: SearchResult[], q: string) {
  const lowerQ = (q || '').toLowerCase();
  if (!results || results.length === 0) return 0;
  const hit = results.filter((r) =>
    (r.title || '').toLowerCase().includes(lowerQ),
  ).length;
  return hit / results.length;
}

function computeTopMatches(results: SearchResult[], q: string) {
  const lowerQ = (q || '').toLowerCase();
  const hit = results.filter((r) =>
    (r.title || '').toLowerCase().includes(lowerQ),
  );
  return hit.slice(0, 3).map((r) => r.title || '');
}

// 获取所有源信息（包括禁用的）
async function getAllApiSites(): Promise<ApiSite[]> {
  try {
    const response = await fetch('/api/source-test/sources');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.sources || [];
  } catch (error) {
    console.error('获取源配置失败:', error);
    // 如果无法获取配置，尝试通过搜索API获取可用源
    try {
      const response = await fetch('/api/search?q=测试');
      const data = await response.json();

      const sources: ApiSite[] = [];
      if (data.results) {
        data.results.forEach((result: any) => {
          if (result.source && !sources.find((s) => s.key === result.source)) {
            sources.push({
              key: result.source,
              name: result.source_name || result.source,
              api: '',
              disabled: false,
            });
          }
        });
      }
      return sources;
    } catch (fallbackError) {
      console.error('获取源列表失败:', fallbackError);
      return [];
    }
  }
}

// 测试单个源
async function testSource(
  sourceKey: string,
  query: string,
): Promise<SourceTestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `/api/source-test?q=${encodeURIComponent(query)}&source=${sourceKey}`,
    );
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        source: sourceKey,
        sourceName: sourceKey,
        status: response.status === 408 ? 'timeout' : 'error',
        results: [],
        responseTime,
        error:
          errorData.sourceError || errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // 转换结果格式为 SearchResult
    const results: SearchResult[] = Array.isArray(data.results)
      ? data.results.map((item: any) => ({
          id: item.vod_id || item.id || '',
          title: item.vod_name || item.title || '未知标题',
          poster: item.vod_pic || item.poster || '',
          year: item.vod_year || item.year || '',
          episodes: item.vod_play_url ? item.vod_play_url.split('$$$') : [],
          episodes_titles: [],
          source: sourceKey,
          source_name: data.sourceName || sourceKey,
          class: item.type_name || item.type || '',
          desc: item.vod_content || item.desc || '',
          type_name: item.type_name || item.type || '',
          douban_id: item.vod_douban_id || item.douban_id,
        }))
      : [];

    return {
      source: sourceKey,
      sourceName: data.sourceName || sourceKey,
      status: 'success',
      results,
      responseTime,
      disabled: data.disabled,
      resultCount:
        typeof (data as any).resultCount === 'number'
          ? (data as any).resultCount
          : results.length,
      matchRate:
        typeof (data as any).matchRate === 'number'
          ? (data as any).matchRate
          : computeMatchRate(results, query),
      topMatches: Array.isArray((data as any).topMatches)
        ? (data as any).topMatches
        : computeTopMatches(results, query),
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return {
      source: sourceKey,
      sourceName: sourceKey,
      status: 'error',
      results: [],
      responseTime,
      error: error.message,
    };
  }
}

export default function SourceTestModule() {
  const [sources, setSources] = useState<ApiSite[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('斗罗大陆');
  const [testResults, setTestResults] = useState<Map<string, SourceTestResult>>(
    new Map(),
  );
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [selectedResults, setSelectedResults] = useState<SearchResult[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);
  const [onlyEnabled, setOnlyEnabled] = useState(true);
  const [sortKey, setSortKey] = useState<
    'status' | 'responseTime' | 'resultCount' | 'matchRate' | 'name' | 'default'
  >('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [mounted, setMounted] = useState(false);

  // 客户端挂载标记
  useEffect(() => {
    setMounted(true);
  }, []);

  // 加载所有源
  useEffect(() => {
    getAllApiSites().then(setSources);
  }, []);

  // 测试单个源
  const handleTestSingle = async (sourceKey: string) => {
    if (!searchKeyword.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    const source = sources.find((s) => s.key === sourceKey);
    if (!source) return;

    setTestResults(
      (prev) =>
        new Map(
          prev.set(sourceKey, {
            source: sourceKey,
            sourceName: source.name,
            status: 'testing',
            results: [],
            disabled: source.disabled,
          }),
        ),
    );

    const result = await testSource(sourceKey, searchKeyword);
    result.sourceName = source.name;
    result.disabled = source.disabled;

    setTestResults((prev) => new Map(prev.set(sourceKey, result)));
  };

  // 测试所有源
  const handleTestAll = async () => {
    if (!searchKeyword.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    setIsTestingAll(true);
    setTestResults(new Map());

    // 初始化所有源的状态
    const initialResults = new Map<string, SourceTestResult>();
    const scope = onlyEnabled ? sources.filter((s) => !s.disabled) : sources;
    scope.forEach((source) => {
      initialResults.set(source.key, {
        source: source.key,
        sourceName: source.name,
        status: 'pending',
        results: [],
        disabled: source.disabled,
      });
    });
    setTestResults(initialResults);

    // 测试范围内的源
    const testPromises = scope.map(async (source) => {
      // 更新状态为测试中
      setTestResults(
        (prev) =>
          new Map(
            prev.set(source.key, {
              ...prev.get(source.key)!,
              status: 'testing',
            }),
          ),
      );

      const result = await testSource(source.key, searchKeyword);
      result.sourceName = source.name;
      result.disabled = source.disabled;

      // 更新单个结果
      setTestResults((prev) => new Map(prev.set(source.key, result)));

      return result;
    });

    await Promise.allSettled(testPromises);
    setIsTestingAll(false);
  };

  // 查看详细结果
  const handleViewResults = (results: SearchResult[]) => {
    setSelectedResults(results);
    setShowResultsModal(true);
    // 延迟触发动画，确保元素已渲染
    setTimeout(() => setIsDrawerAnimating(true), 10);
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    setIsDrawerAnimating(false);
    // 等待动画完成后再隐藏
    setTimeout(() => setShowResultsModal(false), 300);
  };

  // 防止滚动穿透
  useEffect(() => {
    if (showResultsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showResultsModal]);

  // ESC键关闭抽屉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showResultsModal) {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResultsModal]);

  // 启用/禁用源
  const toggleSource = async (source: ApiSite) => {
    try {
      const action = source.disabled ? 'enable' : 'disable';
      const resp = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, key: source.key }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `操作失败(${resp.status})`);
      }
      // 本地更新状态
      setSources((prev) =>
        prev.map((s) =>
          s.key === source.key ? { ...s, disabled: !s.disabled } : s,
        ),
      );
      setTestResults(
        (prev) =>
          new Map(
            prev.set(source.key, {
              ...(prev.get(source.key) || {
                source: source.key,
                sourceName: source.name,
                status: 'pending',
                results: [],
              }),
              disabled: !source.disabled,
            }),
          ),
      );
    } catch (e: any) {
      alert(e.message || '操作失败');
    }
  };

  // 获取统计信息
  const getStats = () => {
    const results = Array.from(testResults.values());
    const enabledResults = results.filter((r) => !r.disabled);
    const disabledResults = results.filter((r) => r.disabled);

    const enabledTotal = enabledResults.length;
    const enabledSuccess = enabledResults.filter(
      (r) => r.status === 'success',
    ).length;
    const enabledError = enabledResults.filter(
      (r) => r.status === 'error',
    ).length;
    const enabledTimeout = enabledResults.filter(
      (r) => r.status === 'timeout',
    ).length;
    const enabledTesting = enabledResults.filter(
      (r) => r.status === 'testing',
    ).length;

    const disabledTotal = disabledResults.length;
    const disabledSuccess = disabledResults.filter(
      (r) => r.status === 'success',
    ).length;
    const disabledError = disabledResults.filter(
      (r) => r.status === 'error',
    ).length;
    const disabledTimeout = disabledResults.filter(
      (r) => r.status === 'timeout',
    ).length;
    const disabledTesting = disabledResults.filter(
      (r) => r.status === 'testing',
    ).length;

    const total = results.length;
    const success = enabledSuccess + disabledSuccess;
    const error = enabledError + disabledError;
    const timeout = enabledTimeout + disabledTimeout;
    const testing = enabledTesting + disabledTesting;

    return {
      total,
      success,
      error,
      timeout,
      testing,
      enabledTotal,
      enabledSuccess,
      enabledError,
      enabledTimeout,
      enabledTesting,
      disabledTotal,
      disabledSuccess,
      disabledError,
      disabledTimeout,
      disabledTesting,
    };
  };

  const stats = getStats();

  // 状态图标
  const getStatusIcon = (status: string, disabled?: boolean) => {
    if (disabled) {
      return (
        <span
          className='w-4 h-4 rounded-full bg-[#9ca3af] inline-block'
          title='已禁用'
        />
      );
    }

    switch (status) {
      case 'testing':
        return <RefreshCw className='w-4 h-4 animate-spin text-[#3b82f6]' />;
      case 'success':
        return <CheckCircle className='w-4 h-4 text-[#22c55e]' />;
      case 'error':
        return <XCircle className='w-4 h-4 text-[#ef4444]' />;
      case 'timeout':
        return <Clock className='w-4 h-4 text-[#f59e0b]' />;
      default:
        return (
          <span className='w-4 h-4 rounded-full bg-gray-300 dark:bg-white/20 inline-block' />
        );
    }
  };

  // 计算排序后的源列表
  const getSortedSources = () => {
    const scope = onlyEnabled ? sources.filter((s) => !s.disabled) : sources;

    // 如果是默认排序，保持原始顺序，不排序
    if (sortKey === 'default') {
      return scope;
    }

    const statusWeight = (s?: SourceTestResult) => {
      // 数值越大表示越靠后（差）
      if (!s) return 4; // 未测试
      switch (s.status) {
        case 'success':
          return 0;
        case 'testing':
          return 1;
        case 'timeout':
          return 2;
        case 'error':
          return 3;
        case 'pending':
        default:
          return 4;
      }
    };

    const metric = (src: ApiSite) => {
      const r = testResults.get(src.key);
      switch (sortKey) {
        case 'status':
          return statusWeight(r);
        case 'responseTime':
          return r?.responseTime ?? Number.POSITIVE_INFINITY;
        case 'resultCount':
          return typeof r?.resultCount === 'number'
            ? r!.resultCount!
            : r?.results?.length || 0;
        case 'matchRate':
          return typeof r?.matchRate === 'number' ? r!.matchRate! : -1; // 未测试置为-1，降序时排后
        case 'name':
          return src.name.toLowerCase();
        default:
          return 0;
      }
    };

    const arr = [...scope];
    arr.sort((a, b) => {
      const va = metric(a);
      const vb = metric(b);
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = String(va).localeCompare(String(vb));
      } else {
        const na = Number(va);
        const nb = Number(vb);
        if (Number.isNaN(na) && Number.isNaN(nb)) cmp = 0;
        else if (Number.isNaN(na)) cmp = 1;
        else if (Number.isNaN(nb)) cmp = -1;
        else cmp = na === nb ? 0 : na < nb ? -1 : 1;
      }
      // desc 表示大的在前（除 status 的权重外，我们已经用数值大小语义保持一致）
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return arr;
  };

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            源检测工具
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            测试各源搜索与响应，查看结果质量
          </p>
        </div>
        <FluentBadge variant='info' size='sm' rounded>
          {sources.length} 个源
        </FluentBadge>
      </div>

      {/* Search controls */}
      <FluentCard padding='16px' className='space-y-3'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='flex-1'>
            <FluentInput
              label='搜索关键词'
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder='输入要搜索的内容...'
              prefix={<Search className='w-4 h-4 text-[#9ca3af]' />}
              fullWidth
            />
          </div>
          <div className='flex items-end gap-2'>
            <FluentCheckbox
              label='仅测试启用源'
              checked={onlyEnabled}
              onCheckedChange={(v) => setOnlyEnabled(v)}
            />
            <FluentButton
              variant='primary'
              size='md'
              icon={
                isTestingAll ? (
                  <RefreshCw className='w-4 h-4 animate-spin' />
                ) : (
                  <Play className='w-4 h-4' />
                )
              }
              loading={isTestingAll}
              disabled={!searchKeyword.trim() || sources.length === 0}
              onClick={handleTestAll}
            >
              测试所有源
            </FluentButton>
          </div>
        </div>
      </FluentCard>

      {/* Stats */}
      {testResults.size > 0 && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
              <CheckCircle className='w-3.5 h-3.5 text-[#3b82f6]' />
            </span>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
              测试统计
            </h4>
            <FluentBadge
              variant={stats.testing > 0 ? 'warning' : 'success'}
              size='sm'
              rounded
            >
              {stats.success}/{stats.total} 成功
            </FluentBadge>
          </div>
          <div className='grid grid-cols-5 gap-2 text-center'>
            <div className='rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5 p-2.5'>
              <div className='text-lg font-bold text-gray-900 dark:text-white'>
                {stats.total}
              </div>
              <div className='text-[11px] text-[#9ca3af]'>总源数</div>
            </div>
            <div className='rounded-xl border bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/20 p-2.5'>
              <div className='text-lg font-bold text-[#22c55e]'>
                {stats.success}
              </div>
              <div className='text-[11px] text-[#9ca3af]'>成功</div>
            </div>
            <div className='rounded-xl border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/20 p-2.5'>
              <div className='text-lg font-bold text-[#ef4444]'>
                {stats.error}
              </div>
              <div className='text-[11px] text-[#9ca3af]'>失败</div>
            </div>
            <div className='rounded-xl border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/20 p-2.5'>
              <div className='text-lg font-bold text-[#f59e0b]'>
                {stats.timeout}
              </div>
              <div className='text-[11px] text-[#9ca3af]'>超时</div>
            </div>
            <div className='rounded-xl border bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/20 p-2.5'>
              <div className='text-lg font-bold text-[#3b82f6]'>
                {stats.testing}
              </div>
              <div className='text-[11px] text-[#9ca3af]'>测试中</div>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-white/5'>
            <div className='rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5 p-3'>
              <h4 className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                启用源 ({stats.enabledTotal})
              </h4>
              <div className='flex flex-wrap gap-1.5'>
                <FluentBadge variant='success' size='sm' rounded>
                  成功 {stats.enabledSuccess}
                </FluentBadge>
                <FluentBadge variant='error' size='sm' rounded>
                  失败 {stats.enabledError}
                </FluentBadge>
                <FluentBadge variant='warning' size='sm' rounded>
                  超时 {stats.enabledTimeout}
                </FluentBadge>
                <FluentBadge variant='info' size='sm' rounded>
                  测试中 {stats.enabledTesting}
                </FluentBadge>
              </div>
            </div>
            <div className='rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5 p-3'>
              <h4 className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                禁用源 ({stats.disabledTotal})
              </h4>
              <div className='flex flex-wrap gap-1.5'>
                <FluentBadge variant='success' size='sm' rounded>
                  成功 {stats.disabledSuccess}
                </FluentBadge>
                <FluentBadge variant='error' size='sm' rounded>
                  失败 {stats.disabledError}
                </FluentBadge>
                <FluentBadge variant='warning' size='sm' rounded>
                  超时 {stats.disabledTimeout}
                </FluentBadge>
                <FluentBadge variant='info' size='sm' rounded>
                  测试中 {stats.disabledTesting}
                </FluentBadge>
              </div>
            </div>
          </div>
        </FluentCard>
      )}

      {/* Source list */}
      <FluentCard padding='16px' className='space-y-3'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
            源列表
            <FluentBadge variant='default' size='sm' rounded>
              {getSortedSources().length} 个
            </FluentBadge>
          </h4>
          <div className='flex items-center gap-2 flex-wrap'>
            <label className='text-xs text-[#9ca3af]'>排序</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className='text-xs border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f4c24d]'
            >
              <option value='default'>默认顺序</option>
              <option value='status'>状态</option>
              <option value='responseTime'>耗时</option>
              <option value='resultCount'>结果数</option>
              <option value='matchRate'>相关率</option>
              <option value='name'>名称</option>
            </select>
            <FluentButton
              variant='secondary'
              size='sm'
              onClick={() =>
                setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
              }
            >
              {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
            </FluentButton>
          </div>
        </div>

        <div className='space-y-2'>
          {getSortedSources().map((source) => {
            const result = testResults.get(source.key);
            return (
              <FluentCard
                key={source.key}
                hoverable
                padding='12px'
                className={`transition-all ${source.disabled ? 'bg-gray-50 dark:bg-white/[0.02] opacity-90' : ''}`}
              >
                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
                  <div className='flex items-center gap-3 flex-1 min-w-0'>
                    {getStatusIcon(
                      result?.status || 'pending',
                      source.disabled,
                    )}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        <span
                          className={`text-sm font-medium truncate ${source.disabled ? 'text-[#9ca3af]' : 'text-gray-900 dark:text-white'}`}
                        >
                          {source.name}
                        </span>
                        {source.disabled && (
                          <FluentBadge variant='default' size='sm' rounded>
                            已禁用
                          </FluentBadge>
                        )}
                        {result?.responseTime && (
                          <FluentBadge variant='info' size='sm' rounded>
                            {result.responseTime}ms
                          </FluentBadge>
                        )}
                      </div>
                      <div className='text-xs text-[#9ca3af] mt-0.5'>
                        <div className='font-mono text-[11px]'>
                          {source.key}
                        </div>
                        <div
                          className='truncate hover:whitespace-normal hover:break-all transition-all cursor-pointer'
                          title={source.api}
                        >
                          {source.api}
                        </div>
                      </div>
                    </div>

                    {result && (
                      <div className='text-right min-w-0 hidden md:block'>
                        {result.status === 'success' && (
                          <div className='text-sm text-[#22c55e] font-medium flex items-center justify-end gap-1.5'>
                            {typeof result.resultCount === 'number'
                              ? result.resultCount
                              : result.results.length}{' '}
                            个结果
                            {typeof result.matchRate === 'number' && (
                              <FluentBadge variant='default' size='sm' rounded>
                                相关{Math.round((result.matchRate || 0) * 100)}%
                              </FluentBadge>
                            )}
                          </div>
                        )}
                        {result.status === 'error' && (
                          <FluentBadge variant='error' size='sm' rounded>
                            请求失败
                          </FluentBadge>
                        )}
                        {result.status === 'timeout' && (
                          <FluentBadge variant='warning' size='sm' rounded>
                            请求超时
                          </FluentBadge>
                        )}
                        {result.status === 'testing' && (
                          <FluentBadge variant='info' size='sm' rounded>
                            测试中...
                          </FluentBadge>
                        )}
                        {result.topMatches && result.topMatches.length > 0 && (
                          <div
                            className='text-xs text-[#9ca3af] truncate max-w-xs mt-1'
                            title={result.topMatches.join(' | ')}
                          >
                            示例: {result.topMatches.join(' | ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className='flex items-center gap-1.5 flex-wrap'>
                    {result?.results && result.results.length > 0 && (
                      <FluentButton
                        variant='primary'
                        size='sm'
                        onClick={() => handleViewResults(result.results)}
                      >
                        查看结果
                      </FluentButton>
                    )}

                    <FluentButton
                      variant='secondary'
                      size='sm'
                      loading={result?.status === 'testing'}
                      onClick={() => handleTestSingle(source.key)}
                    >
                      {result?.status === 'testing'
                        ? '测试中'
                        : source.disabled
                          ? '测试禁用源'
                          : '单独测试'}
                    </FluentButton>

                    <FluentButton
                      variant={source.disabled ? 'primary' : 'ghost'}
                      size='sm'
                      onClick={() => toggleSource(source)}
                      className={
                        source.disabled
                          ? ''
                          : '!text-[#ef4444] hover:!bg-red-50 dark:hover:!bg-red-500/10'
                      }
                    >
                      {source.disabled ? '启用' : '禁用'}
                    </FluentButton>
                  </div>
                </div>

                {/* mobile */}
                {result && (
                  <div className='mt-3 pt-3 border-t border-gray-200 dark:border-white/5 md:hidden space-y-1'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-[#9ca3af]'>
                        {result.responseTime && `响应 ${result.responseTime}ms`}
                      </span>
                      {result.status === 'success' && (
                        <span className='text-[#22c55e] font-medium'>
                          {typeof result.resultCount === 'number'
                            ? result.resultCount
                            : result.results.length}{' '}
                          个结果
                          {typeof result.matchRate === 'number' && (
                            <span className='ml-1 text-[#9ca3af]'>
                              (相关{Math.round((result.matchRate || 0) * 100)}%)
                            </span>
                          )}
                        </span>
                      )}
                      {result.status === 'error' && (
                        <FluentBadge variant='error' size='sm' rounded>
                          失败
                        </FluentBadge>
                      )}
                      {result.status === 'timeout' && (
                        <FluentBadge variant='warning' size='sm' rounded>
                          超时
                        </FluentBadge>
                      )}
                      {result.status === 'testing' && (
                        <FluentBadge variant='info' size='sm' rounded>
                          测试中
                        </FluentBadge>
                      )}
                    </div>
                    {result.topMatches && result.topMatches.length > 0 && (
                      <div
                        className='text-xs text-[#9ca3af]'
                        title={result.topMatches.join(' | ')}
                      >
                        示例: {result.topMatches.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {result?.error && (
                  <FluentCard
                    padding='10px'
                    className='mt-2 border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                  >
                    <span className='text-xs text-red-700 dark:text-red-300'>
                      <span className='font-medium'>错误:</span> {result.error}
                    </span>
                  </FluentCard>
                )}
              </FluentCard>
            );
          })}
        </div>

        {sources.length === 0 && (
          <FluentEmptyState
            icon={<FluentSpinner size='medium' />}
            title='正在加载源列表...'
            description='首次加载会聚合可用采集源'
          />
        )}
      </FluentCard>

      {/* Results drawer */}
      {mounted &&
        showResultsModal &&
        createPortal(
          <>
            {/* 遮罩层 */}
            <div
              className={`fixed inset-0 z-39 transition-opacity duration-300 ${isDrawerAnimating ? 'bg-black/50' : 'bg-black/0'}`}
              onClick={handleCloseDrawer}
            />

            {/* 侧边抽屉 */}
            <div
              className={`fixed inset-y-0 right-0 z-40 w-full sm:w-3/4 md:w-2/3 lg:w-3/5 xl:w-1/2 bg-white dark:bg-gray-800 shadow-28 transition-transform duration-300 ease-in-out flex flex-col ${isDrawerAnimating ? 'translate-x-0' : 'translate-x-full'}`}
            >
              {/* 头部 */}
              <div className='flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm'>
                <div className='flex-1 min-w-0 mr-4'>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white'>
                      搜索结果
                    </h3>
                    <FluentBadge variant='primary' size='sm' rounded>
                      {selectedResults.length}
                    </FluentBadge>
                  </div>
                  {selectedResults.length > 0 && (
                    <div className='flex items-center gap-2 mt-1'>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        来源: {selectedResults[0].source_name}
                      </p>
                      <span className='text-gray-300 dark:text-gray-300'>
                        •
                      </span>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        关键词: {searchKeyword}
                      </p>
                    </div>
                  )}
                </div>
                <FluentButton
                  variant='ghost'
                  size='sm'
                  icon={<X className='w-5 h-5' />}
                  onClick={handleCloseDrawer}
                  aria-label='关闭'
                >
                  关闭
                </FluentButton>
              </div>

              {/* 内容区域 */}
              <div className='flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900'>
                {selectedResults.length > 0 ? (
                  <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'>
                    {selectedResults.map((result, index) => (
                      <VideoCard
                        key={`${result.source}-${result.id}-${index}`}
                        id={result.id}
                        title={result.title}
                        poster={result.poster}
                        year={result.year}
                        episodes={result.episodes.length}
                        source={result.source}
                        source_name={result.source_name}
                        from='search'
                        type={result.type_name}
                        rate={result.desc}
                      />
                    ))}
                  </div>
                ) : (
                  <FluentEmptyState
                    icon={<Search className='w-8 h-8 text-[#9ca3af]' />}
                    title='暂无搜索结果'
                    description='该源未返回匹配内容，试试其他关键词'
                  />
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
