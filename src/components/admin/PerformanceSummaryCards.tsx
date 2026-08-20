'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 统计中心顶部四张汇总卡：接入真实数据（替代原先硬编码的 '--'）
 */
function formatTraffic(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(2)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function Card({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className='ui-surface rounded-[var(--radius-2xl)] px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-8)]'>
      <div className='text-[11px] uppercase tracking-[0.18em] text-[var(--color-foreground-muted)]'>
        {label}
      </div>
      <div className='mt-2 text-2xl font-semibold text-[var(--color-foreground)]'>
        {value}
      </div>
      <div className='mt-1 text-xs text-[var(--color-foreground-subtle)]'>
        {helper}
      </div>
    </div>
  );
}

export default function PerformanceSummaryCards() {
  const [data, setData] = useState<{
    totalRequests: number;
    externalTraffic: number;
    externalDomains: number;
    avgResponse: number;
    referrerDomains: number;
    entryPage: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const perfRes = await fetch('/api/admin/performance?hours=24');
      const anaRes = await fetch('/api/admin/analytics?days=1');
      if (!perfRes.ok && !anaRes.ok) {
        setData(null);
        return;
      }
      const perf = perfRes.ok ? await perfRes.json() : null;
      const ana = anaRes.ok ? await anaRes.json() : null;

      const p = perf?.data;
      const a = ana?.data;
      setData({
        totalRequests: p?.recentRequests?.length ?? 0,
        externalTraffic: p?.externalTraffic?.totalTraffic ?? 0,
        externalDomains: Object.keys(p?.externalTraffic?.byDomain ?? {}).length,
        avgResponse: p?.currentStatus?.avgResponseTime ?? 0,
        referrerDomains: a?.topReferrers?.length ?? 0,
        entryPage: a?.entryPages?.[0]?.path ?? '暂无',
      });
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  return (
    <div className='sm:col-span-2 xl:col-span-4 grid gap-3 lg:grid-cols-4'>
      <Card
        label='总请求'
        value={data ? String(data.totalRequests) : '--'}
        helper='最近 24 小时'
      />
      <Card
        label='外部流量'
        value={data ? formatTraffic(data.externalTraffic) : '--'}
        helper={
          data ? `按域名统计 · ${data.externalDomains} 个域名` : '按域名统计'
        }
      />
      <Card
        label='平均响应'
        value={data ? `${data.avgResponse}ms` : '--'}
        helper='性能趋势'
      />
      <Card
        label='访客来源'
        value={data ? `${data.referrerDomains} 个来源` : '--'}
        helper={data ? `入口页 ${data.entryPage}` : '来源域名 / 入口页'}
      />
    </div>
  );
}
