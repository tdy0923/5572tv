// 直播频道接口
export interface LiveChannel {
  id: string;
  tvgId: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

// 直播源接口
export interface LiveSource {
  key: string;
  name: string;
  url: string;
  ua?: string;
  epg?: string;
  from: 'config' | 'custom';
  channelNumber?: number;
  disabled?: boolean;
}

// 流类型
export type LiveStreamType = 'm3u8' | 'mp4' | 'flv' | 'unknown';

// 频道健康状态
export type ChannelHealthStatus =
  | 'unknown'
  | 'checking'
  | 'healthy'
  | 'slow'
  | 'unreachable';

// 频道健康信息
export interface ChannelHealthInfo {
  type: LiveStreamType;
  status: ChannelHealthStatus;
  latencyMs?: number;
  checkedAt: number;
  message?: string;
}

// 分组排序模式
export type GroupSortMode = 'default' | 'count' | 'name';

// 分组摘要
export interface GroupSummary {
  name: string;
  count: number;
  order: number;
}
