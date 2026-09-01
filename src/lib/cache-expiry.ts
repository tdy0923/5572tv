// 客户端缓存有效期判定的纯逻辑与常量（单一来源），从 db.client 抽出以便单测。

export const CACHE_VERSION = '1.0.0';
export const CACHE_EXPIRE_TIME = 60 * 60 * 1000; // 通用：1 小时
export const PLAY_RECORDS_CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 播放记录：5 分钟（与新集数更新检查一致）

/**
 * 纯判定：一条缓存是否仍有效。要求版本匹配且未过期。
 * 时间由调用方传入（now），便于单测且不依赖系统时钟。
 */
export function isCacheEntryValid(params: {
  version: string;
  timestamp: number;
  now: number;
  cacheType?: 'playRecords';
}): boolean {
  const { version, timestamp, now, cacheType } = params;
  const expireTime =
    cacheType === 'playRecords'
      ? PLAY_RECORDS_CACHE_EXPIRE_TIME
      : CACHE_EXPIRE_TIME;
  return version === CACHE_VERSION && now - timestamp < expireTime;
}
