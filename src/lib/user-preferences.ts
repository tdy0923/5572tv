/**
 * 用户偏好设置统一存储
 * 所有偏好数据保存在 localStorage，支持跨会话持久化
 */

const PREFIX = '5572tv_';

// ==================== 播放器偏好 ====================

/** 保存视频清晰度偏好 */
export function saveVideoQuality(quality: string): void {
  localStorage.setItem(`${PREFIX}video_quality`, quality);
}

/** 读取视频清晰度偏好 */
export function loadVideoQuality(): string {
  return localStorage.getItem(`${PREFIX}video_quality`) || 'auto';
}

// ==================== 搜索历史 ====================

const SEARCH_HISTORY_KEY = `${PREFIX}search_history`;
const MAX_SEARCH_HISTORY = 20;

/** 获取搜索历史 */
export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 添加搜索记录 */
export function addSearchHistory(query: string): void {
  if (!query.trim()) return;
  const history = getSearchHistory();
  // 去重并放到最前面
  const filtered = history.filter((h) => h !== query);
  filtered.unshift(query);
  // 限制数量
  if (filtered.length > MAX_SEARCH_HISTORY) {
    filtered.length = MAX_SEARCH_HISTORY;
  }
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
}

/** 删除单条搜索记录 */
export function removeSearchHistory(query: string): void {
  const history = getSearchHistory().filter((h) => h !== query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

/** 清空搜索历史 */
export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

// ==================== 收藏夹分组 ====================

export interface FavoriteGroup {
  id: string;
  name: string;
  icon: string;
  items: FavoriteItem[];
  createdAt: number;
}

export interface FavoriteItem {
  id: string;
  title: string;
  poster: string;
  source: string;
  addedAt: number;
}

const FAVORITES_KEY = `${PREFIX}favorites`;

/** 获取所有收藏分组 */
export function getFavoriteGroups(): FavoriteGroup[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存收藏分组 */
export function saveFavoriteGroups(groups: FavoriteGroup[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(groups));
}

/** 创建新分组 */
export function createFavoriteGroup(
  name: string,
  icon: string = 'folder',
): FavoriteGroup {
  const group: FavoriteGroup = {
    id: `group_${Date.now()}`,
    name,
    icon,
    items: [],
    createdAt: Date.now(),
  };
  const groups = getFavoriteGroups();
  groups.push(group);
  saveFavoriteGroups(groups);
  return group;
}

/** 删除分组 */
export function deleteFavoriteGroup(groupId: string): void {
  const groups = getFavoriteGroups().filter((g) => g.id !== groupId);
  saveFavoriteGroups(groups);
}

/** 添加收藏到分组 */
export function addToFavorites(
  groupId: string,
  item: Omit<FavoriteItem, 'addedAt'>,
): void {
  const groups = getFavoriteGroups();
  const group = groups.find((g) => g.id === groupId);
  if (group && !group.items.some((i) => i.id === item.id)) {
    group.items.push({ ...item, addedAt: Date.now() });
    saveFavoriteGroups(groups);
  }
}

/** 从分组移除收藏 */
export function removeFromFavorites(groupId: string, itemId: string): void {
  const groups = getFavoriteGroups();
  const group = groups.find((g) => g.id === groupId);
  if (group) {
    group.items = group.items.filter((i) => i.id !== itemId);
    saveFavoriteGroups(groups);
  }
}

// ==================== 夜间模式定时 ====================

export interface NightModeSchedule {
  enabled: boolean;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number;
  endMinute: number;
}

const NIGHT_MODE_KEY = `${PREFIX}night_mode_schedule`;

/** 获取夜间模式定时设置 */
export function getNightModeSchedule(): NightModeSchedule {
  try {
    const raw = localStorage.getItem(NIGHT_MODE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    enabled: false,
    startHour: 22,
    startMinute: 0,
    endHour: 7,
    endMinute: 0,
  };
}

/** 保存夜间模式定时设置 */
export function saveNightModeSchedule(schedule: NightModeSchedule): void {
  localStorage.setItem(NIGHT_MODE_KEY, JSON.stringify(schedule));
}

/** 检查当前是否在夜间模式时间段 */
export function isNightModeTime(schedule: NightModeSchedule): boolean {
  if (!schedule.enabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = schedule.startHour * 60 + schedule.startMinute;
  const endMinutes = schedule.endHour * 60 + schedule.endMinute;

  if (startMinutes <= endMinutes) {
    // 同一天内，如 22:00 - 07:00 不适用
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // 跨天，如 22:00 - 07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// ==================== 弹幕偏好 ====================

export interface DanmakuPreferences {
  fontSize: number; // 12-32
  opacity: number; // 0.1-1.0
  speed: number; // 1-10
  color: string; // 弹幕颜色
  area: 'all' | 'top' | 'bottom'; // 弹幕区域
  showSender: boolean; // 显示发送者
}

const DANMAKU_KEY = `${PREFIX}danmaku_prefs`;

/** 获取弹幕偏好 */
export function getDanmakuPreferences(): DanmakuPreferences {
  try {
    const raw = localStorage.getItem(DANMAKU_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    fontSize: 16,
    opacity: 0.8,
    speed: 5,
    color: '#ffffff',
    area: 'all',
    showSender: false,
  };
}

/** 保存弹幕偏好 */
export function saveDanmakuPreferences(prefs: DanmakuPreferences): void {
  localStorage.setItem(DANMAKU_KEY, JSON.stringify(prefs));
}
