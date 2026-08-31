// 选集按钮显示文案的纯逻辑，从 EpisodeSelector 抽出以便单测。
// 采集源的集数标题格式五花八门（第5集 / 第03话 / HD版 / 2024-05-16期 等），
// 统一提取其中的数字；无数字则原样显示；无标题则回退到序号。
export function formatEpisodeLabel(
  title: string | undefined,
  fallbackNumber: number,
): string | number {
  if (!title) return fallbackNumber;
  const match = title.match(/(?:第)?(\d+)(?:集|话|部|期)/);
  if (match) return match[1];
  return title;
}
