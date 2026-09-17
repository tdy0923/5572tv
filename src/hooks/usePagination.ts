'use client';

import { useMemo, useState } from 'react';

/**
 * 通用客户端分页 hook（数据已全量在前端时使用）。
 * 调用方在搜索/筛选变化时手动调 setPage(1) 回到第一页。
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pagedItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    setPage,
    totalPages,
    total: items.length,
    pageSize,
    pagedItems,
  };
}
