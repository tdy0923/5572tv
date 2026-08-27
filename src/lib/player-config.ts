export type PlayerBufferMode = 'standard' | 'enhanced' | 'max';

export interface HlsBufferConfig {
  maxBufferLength: number;
  backBufferLength: number;
  maxBufferSize: number;
}

const BUFFER_PRESETS: Record<PlayerBufferMode, HlsBufferConfig> = {
  standard: {
    maxBufferLength: 30,
    backBufferLength: 30,
    maxBufferSize: 60 * 1000 * 1000,
  },
  enhanced: {
    maxBufferLength: 45,
    backBufferLength: 45,
    maxBufferSize: 90 * 1000 * 1000,
  },
  max: {
    maxBufferLength: 90,
    backBufferLength: 60,
    maxBufferSize: 180 * 1000 * 1000,
  },
};

export const PLAYER_BUFFER_MODE_KEY = 'playerBufferMode';
export const PLAYER_PLAYBACK_RATE_KEY = '5572tv_player_playback_rate';
export const PLAYER_VOLUME_KEY = '5572tv_player_volume';
export const PLAYER_OBJECT_FIT_KEY = 'video_object_fit';
export const DANMAKU_SPEED_KEY = 'danmaku_speed';
export const DANMAKU_OPACITY_KEY = 'danmaku_opacity';
export const DANMAKU_FONT_SIZE_KEY = 'danmaku_fontSize';
export const DANMAKU_MODES_KEY = 'danmaku_modes';
export const DANMAKU_MARGIN_KEY = 'danmaku_margin';
export const SHORT_DRAMA_AUTO_NEXT_KEY = '5572tv_autoplay_next';
export const BLOCK_AD_KEY = 'enable_blockad';
export const OPTIMIZATION_KEY = 'enableOptimization';

export function getHlsBufferConfig(): HlsBufferConfig {
  if (typeof window === 'undefined') {
    return BUFFER_PRESETS.standard;
  }
  const mode = (localStorage.getItem(PLAYER_BUFFER_MODE_KEY) ||
    'standard') as PlayerBufferMode;
  return BUFFER_PRESETS[mode] ?? BUFFER_PRESETS.standard;
}
