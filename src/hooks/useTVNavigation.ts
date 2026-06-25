'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface TVNavigationOptions {
  columns: number;
  totalItems: number;
  onActivate?: (index: number) => void;
  onBack?: () => void;
  loop?: boolean;
}

export function useTVNavigation({
  columns,
  totalItems,
  onActivate,
  onBack,
  loop = true,
}: TVNavigationOptions) {
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算行列位置
  const getRow = (index: number) => Math.floor(index / columns);
  const getCol = (index: number) => index % columns;
  const getTotalRows = () => Math.ceil(totalItems / columns);

  // 导航到指定索引
  const navigateTo = useCallback(
    (newIndex: number) => {
      if (newIndex >= 0 && newIndex < totalItems) {
        setFocusIndex(newIndex);
      } else if (loop) {
        // 循环导航
        if (newIndex < 0) {
          setFocusIndex(totalItems - 1);
        } else {
          setFocusIndex(0);
        }
      }
    },
    [totalItems, loop]
  );

  // 处理按键事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentRow = getRow(focusIndex);
      const currentCol = getCol(focusIndex);
      const totalRows = getTotalRows();

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentRow > 0) {
            // 移动到上一行同一列
            const newIndex = (currentRow - 1) * columns + currentCol;
            navigateTo(Math.min(newIndex, totalItems - 1));
          } else if (loop) {
            // 循环到最后一行
            const lastRow = totalRows - 1;
            const newIndex = lastRow * columns + currentCol;
            navigateTo(Math.min(newIndex, totalItems - 1));
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (currentRow < totalRows - 1) {
            // 移动到下一行同一列
            const newIndex = (currentRow + 1) * columns + currentCol;
            navigateTo(Math.min(newIndex, totalItems - 1));
          } else if (loop) {
            // 循环到第一行
            navigateTo(currentCol);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (currentCol > 0) {
            // 向左移动
            navigateTo(focusIndex - 1);
          } else if (loop && currentRow > 0) {
            // 循环到上一行末尾
            const prevRowLastCol = columns - 1;
            const newIndex = (currentRow - 1) * columns + prevRowLastCol;
            navigateTo(Math.min(newIndex, totalItems - 1));
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (currentCol < columns - 1 && focusIndex + 1 < totalItems) {
            // 向右移动
            navigateTo(focusIndex + 1);
          } else if (loop && currentRow < totalRows - 1) {
            // 循环到下一行开头
            navigateTo((currentRow + 1) * columns);
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          onActivate?.(focusIndex);
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          onBack?.();
          break;
      }
    },
    [focusIndex, columns, totalItems, navigateTo, onActivate, onBack]
  );

  // 绑定键盘事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 确保容器可聚焦
    container.setAttribute('tabindex', '0');
    container.focus();

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 获取焦点项的样式
  const getFocusStyle = useCallback(
    (index: number) => {
      if (index === focusIndex) {
        return {
          outline: '3px solid white',
          outlineOffset: '2px',
          transform: 'scale(1.05)',
          zIndex: 10,
        };
      }
      return {};
    },
    [focusIndex]
  );

  return {
    focusIndex,
    setFocusIndex,
    containerRef,
    getFocusStyle,
    navigateTo,
  };
}
