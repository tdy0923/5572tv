// 换源相关的纯标识/解析函数，从 useSourceSwitching 抽出以便单测。

/** 源身份键：source 与 id 的组合，用于退避状态 Map 的键。 */
export function getSourceIdentityKey(source: string, id: string): string {
  return `${source}::${id}`;
}

/**
 * 把内部源标识解析成 API 参数：emby 变体（emby_<key>）拆成 { source:'emby', embyKey }，
 * 其余原样返回。
 */
export function parseSourceForApi(source: string): {
  source: string;
  embyKey?: string;
} {
  if (source.startsWith('emby_')) {
    const key = source.substring(5); // 'emby_'.length === 5
    return { source: 'emby', embyKey: key };
  }
  return { source };
}

/** 是否为短剧源（影响探活超时与连播策略）。 */
export function isShortDramaSource(source: string): boolean {
  return (
    source === 'shortdrama' ||
    source.startsWith('shortdrama') ||
    source === '短剧'
  );
}
