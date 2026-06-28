'use client';
import { useRef, useState } from 'react';

export function useNetdiskSearch(_videoTitle: string, _videoYear: string) {
  const [netdiskResults, setNetdiskResults] = useState<{
    [key: string]: any[];
  } | null>(null);
  const [netdiskLoading, setNetdiskLoading] = useState(false);
  const [netdiskError, setNetdiskError] = useState<string | null>(null);
  const [netdiskTotal, setNetdiskTotal] = useState(0);
  const [showNetdiskModal, setShowNetdiskModal] = useState(false);
  const [netdiskResourceType, setNetdiskResourceType] = useState<
    'netdisk' | 'acg'
  >('netdisk');

  const netdiskModalContentRef = useRef<HTMLDivElement>(null);

  const handleNetDiskSearch = async (query: string) => {
    if (!query.trim()) return;

    setNetdiskLoading(true);
    setNetdiskError(null);
    setNetdiskResults(null);
    setNetdiskTotal(0);

    try {
      const response = await fetch(
        `/api/netdisk/search?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await response.json();

      if (data.success) {
        setNetdiskResults(data.data.merged_by_type || {});
        setNetdiskTotal(data.data.total || 0);
      } else {
        setNetdiskError(data.error || '网盘搜索失败');
      }
    } catch (error: any) {
      console.error('网盘搜索请求失败:', error);
      setNetdiskError('网盘搜索请求失败，请稍后重试');
    } finally {
      setNetdiskLoading(false);
    }
  };

  return {
    netdiskResults,
    setNetdiskResults,
    netdiskLoading,
    netdiskError,
    setNetdiskError,
    netdiskTotal,
    showNetdiskModal,
    setShowNetdiskModal,
    netdiskResourceType,
    setNetdiskResourceType,
    netdiskModalContentRef,
    handleNetDiskSearch,
  };
}
