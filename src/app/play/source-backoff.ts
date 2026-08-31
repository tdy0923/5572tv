// 换源失败退避状态机的纯逻辑，从 useSourceSwitching 抽出以便单测。
// 退避时长表：第 1/2/3/4 次失败后分别冷却 30s/2min/5min/10min 才允许重试。
export const RETRY_BACKOFFS = [30_000, 120_000, 300_000, 600_000] as const;
export const MAX_RETRIES = RETRY_BACKOFFS.length;

export interface RetryState {
  failCount: number;
  lastFailTime: number;
}

/** 给定失败次数，返回本次应冷却的毫秒数（封顶到最长一档）。 */
export function backoffDurationFor(failCount: number): number {
  const idx = Math.max(Math.min(failCount - 1, MAX_RETRIES - 1), 0);
  return RETRY_BACKOFFS[idx];
}

/** 记录一次新失败后的 failCount（累加并封顶）。 */
export function nextFailCount(prevFailCount: number | undefined): number {
  return Math.min((prevFailCount || 0) + 1, MAX_RETRIES);
}

/** 冷却是否已过（>= 语义，用于 isSourceAvailable）。 */
export function isRetryWindowElapsed(
  state: RetryState | undefined,
  now: number,
): boolean {
  if (!state) return true;
  return now >= state.lastFailTime + backoffDurationFor(state.failCount);
}

/** 冷却是否已过（> 语义，用于 filterInvalidSources，保留原实现的严格不等号）。 */
export function isRetryWindowExpired(
  state: RetryState | undefined,
  now: number,
): boolean {
  if (!state) return true;
  return now - state.lastFailTime > backoffDurationFor(state.failCount);
}
