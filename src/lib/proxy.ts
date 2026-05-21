import { getConfig } from '@/lib/config';

const DEFAULT_USER_AGENT = 'AptvPlayer/1.4.10';

export async function getSourceUserAgent(
  source: string | null,
): Promise<string> {
  if (!source) return DEFAULT_USER_AGENT;

  try {
    const config = await getConfig();
    const liveSource = config.LiveConfig?.find((s: any) => s.key === source);
    return liveSource?.ua || DEFAULT_USER_AGENT;
  } catch {
    return DEFAULT_USER_AGENT;
  }
}
