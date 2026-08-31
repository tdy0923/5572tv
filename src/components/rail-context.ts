'use client';

import { createContext, useContext } from 'react';

/**
 * 标记当前子树是否位于横向滚动轨道（ScrollableRow）内。
 * 原生 loading="lazy" 对被 overflow-x 轨道裁切的图片不会触发加载
 * （相交面积为 0），导致轨道右侧的海报"偶发不显示"。轨道内的卡片据此改为 eager。
 */
const HorizontalRailContext = createContext(false);

export function useIsHorizontalRail(): boolean {
  return useContext(HorizontalRailContext);
}

export const HorizontalRailProvider = HorizontalRailContext.Provider;
