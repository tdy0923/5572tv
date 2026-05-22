// 📺 观影室功能已下线，保留空 Provider 避免编译错误
'use client';

import React, { createContext, useContext } from 'react';

const WatchRoomContext = createContext<any>(null);

export type WatchRoomContextType = any;

export const useWatchRoomContextSafe = () => useContext(WatchRoomContext);
export const useWatchRoomContext = () => {
  const ctx = useContext(WatchRoomContext);
  if (!ctx) throw new Error('WatchRoomProvider not found');
  return ctx;
};

export function WatchRoomProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
