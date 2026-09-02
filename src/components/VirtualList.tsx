'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import React from 'react';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  /** Ref of the scroll container (element with overflow-y-auto). Required for inner scroll virtualization. */
  scrollRef?: React.RefObject<HTMLElement | null>;
  /** Optional key extractor */
  getItemKey?: (item: T, index: number) => string | number;
  /** Optional class for item wrapper padding */
  itemGapClass?: string;
}

/**
 * Virtualized vertical list using @tanstack/react-virtual.
 * Expects to be rendered *inside* a scroll container (overflow-y-auto).
 * That container's ref is passed via `scrollRef` and used as getScrollElement.
 * Only visible items are mounted, so effects like health checks only run for visible items.
 */
export default function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 88,
  overscan = 6,
  scrollRef,
  getItemKey,
  itemGapClass = 'pb-2',
}: VirtualListProps<T>) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef?.current ?? null,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0) return null;

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        return (
          <div
            key={
              getItemKey
                ? getItemKey(item, virtualRow.index)
                : virtualRow.key
            }
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className={itemGapClass}
          >
            {renderItem(item, virtualRow.index)}
          </div>
        );
      })}
    </div>
  );
}
