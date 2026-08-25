'use client';

import type ArtPlayer from 'artplayer';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SearchResult } from '@/lib/types';

import { escapeAudioTrackHtml } from '../utils';

export interface SubtitleTrack {
  index: number;
  name: string;
  language?: string;
  url?: string;
  type: 'hls' | 'emby';
  default?: boolean;
}

export function useSubtitles(params: {
  artPlayerRef: React.RefObject<ArtPlayer | null>;
  detail: SearchResult | null;
}) {
  const { artPlayerRef, detail } = params;

  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const subtitleTracksRef = useRef(subtitleTracks);

  useEffect(() => {
    subtitleTracksRef.current = subtitleTracks;
  }, [subtitleTracks]);

  // 根据语言判断是否优先选择
  function isChinese(lang?: string): boolean {
    if (!lang) return false;
    const l = lang.toLowerCase();
    return (
      l.includes('chi') ||
      l.includes('zh') ||
      l.includes('中文') ||
      l.includes('简') ||
      l.includes('繁') ||
      l.includes('zho')
    );
  }

  const selectSubtitle = useCallback(
    (index: number) => {
      setCurrentSubtitleTrack(index);
      const track = subtitleTracksRef.current.find((t) => t.index === index);
      if (!track) return;

      if (track.type === 'emby' && track.url && artPlayerRef.current) {
        artPlayerRef.current.subtitle.url = track.url;
        return;
      }

      // HLS 字幕轨
      if (track.type === 'hls') {
        const hls = (artPlayerRef.current?.video as any)?.hls;
        if (hls && typeof hls.subtitleTrack === 'number') {
          // eslint-disable-next-line react-hooks/immutability -- intentional HLS.js API call
          hls.subtitleTrack = track.index;
        }
      }
    },
    [artPlayerRef],
  );

  const disableSubtitles = useCallback(() => {
    setCurrentSubtitleTrack(-1);
    const art = artPlayerRef.current;
    if (art) {
      art.subtitle.url = '';
      const hls = (art.video as any)?.hls;
      if (hls && typeof hls.subtitleTrack === 'number') {
        // eslint-disable-next-line react-hooks/immutability -- intentional HLS.js API call
        hls.subtitleTrack = -1;
      }
    }
  }, [artPlayerRef]);

  // 注册 HLS 字幕轨（由 hls 事件回调调用），并自动选中文轨
  const setHlsSubtitleTracks = useCallback(
    (tracks: SubtitleTrack[]) => {
      if (tracks.length === 0) return;
      setSubtitleTracks(tracks);

      const chinese = tracks.findIndex(
        (t) => isChinese(t.language) || isChinese(t.name),
      );
      const prefer = chinese >= 0 ? chinese : 0;
      selectSubtitle(tracks[prefer].index);
    },
    [selectSubtitle],
  );

  // 加载 Emby 字幕轨（源自带字幕，自动选中文）
  useEffect(() => {
    const isEmby =
      detail?.source === 'emby' || detail?.source?.startsWith('emby_');
    if (
      !isEmby ||
      !detail ||
      !detail.subtitles ||
      detail.subtitles.length === 0
    ) {
      return;
    }

    const tracks: SubtitleTrack[] = detail.subtitles.map((s, i) => ({
      index: i,
      name: s.label || s.language || `字幕 ${i + 1}`,
      language: s.language,
      url: s.url,
      type: 'emby' as const,
    }));

    setSubtitleTracks(tracks);

    const chinese = tracks.findIndex((t) => isChinese(t.language));
    const prefer = chinese >= 0 ? chinese : 0;
    selectSubtitle(tracks[prefer].index);
  }, [detail, selectSubtitle]);

  const resetSubtitleTracks = useCallback(() => {
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);
  }, []);

  const buildSubtitleControl = () => {
    const currentTrack = subtitleTracksRef.current.find(
      (t) => t.index === currentSubtitleTrack,
    );
    const currentName = currentTrack?.name || '字幕';

    const selector = subtitleTracks.map((track) => ({
      html: `${track.index === currentSubtitleTrack ? '✓ ' : ''}${escapeAudioTrackHtml(track.name)}${track.language ? ` (${escapeAudioTrackHtml(track.language)})` : ''}`,
      trackIndex: track.index,
      default: track.index === currentSubtitleTrack,
    }));

    // 添加"关闭字幕"选项
    selector.unshift({
      html: currentSubtitleTrack >= 0 ? '关闭字幕' : '✓ 关闭字幕',
      trackIndex: -1,
      default: currentSubtitleTrack < 0,
    });

    return {
      name: 'subtitle-control',
      position: 'right' as const,
      index: 8,
      tooltip: subtitleTracks.length > 0 ? `字幕: ${currentName}` : '字幕',
      style: {
        display: subtitleTracks.length > 0 ? 'flex' : 'none',
        alignItems: 'center',
        gap: '4px',
        padding: '0 6px',
      },
      html: `<i class="art-icon flex"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 10h8"/><path d="M8 14h6"/></svg></i><span style="font-size:12px;">${escapeAudioTrackHtml(currentName)}</span>`,
      selector,
      onSelect: function (item: any) {
        if (item.trackIndex < 0) {
          disableSubtitles();
          return;
        }
        selectSubtitle(item.trackIndex);
      },
    };
  };

  return {
    subtitleTracks,
    setHlsSubtitleTracks,
    selectSubtitle,
    disableSubtitles,
    resetSubtitleTracks,
    buildSubtitleControl,
  };
}
