'use client';

import type ArtPlayer from 'artplayer';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SearchResult } from '@/lib/types';

import {
  appendAudioStreamIndex,
  escapeAudioTrackHtml,
  loadPreferredAudioLang,
  normalizeAudioLang,
  parseAudioStreamIndexFromUrl,
  resolveAudioTrackName,
  savePreferredAudioLang,
} from '../utils';

export interface AudioTrack {
  index: number;
  displayTitle?: string;
  language?: string;
  codec?: string;
  isDefault: boolean;
  hlsIndex?: number;
  name?: string;
}

export function useAudioTracks(params: {
  artPlayerRef: React.RefObject<ArtPlayer | null>;
  detail: SearchResult | null;
  currentEpisodeIndex: number | null;
  videoUrl: string;
  setVideoUrl: (url: string) => void;
  resumeTimeRef: React.MutableRefObject<number | null>;
}) {
  const {
    artPlayerRef,
    detail,
    currentEpisodeIndex,
    videoUrl,
    setVideoUrl,
    resumeTimeRef,
  } = params;

  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [isAudioTrackSwitching, setIsAudioTrackSwitching] = useState(false);
  const audioTracksRef = useRef(audioTracks);
  const currentAudioTrackRef = useRef(currentAudioTrack);

  useEffect(() => {
    audioTracksRef.current = audioTracks;
    currentAudioTrackRef.current = currentAudioTrack;
  }, [audioTracks, currentAudioTrack]);

  const resetAudioTrackState = useCallback(() => {
    setAudioTracks([]);
    setCurrentAudioTrack(-1);
    setIsAudioTrackSwitching(false);
  }, []);

  useEffect(() => {
    const isEmbySource =
      detail?.source === 'emby' || detail?.source?.startsWith('emby_');

    if (!isEmbySource || !detail) {
      resetAudioTrackState();
      return;
    }

    const processAudioTracks = (rawTracks: any[]) => {
      const mappedTracks = rawTracks
        .map((stream: any, index: number) => {
          const parsedIndex = Number(stream.index);
          if (!Number.isFinite(parsedIndex) || parsedIndex < 0) {
            return null;
          }

          return {
            index: Math.floor(parsedIndex),
            name: resolveAudioTrackName(
              stream.display_title,
              stream.language,
              index,
            ),
            language: stream.language,
            codec: stream.codec,
            isDefault: Boolean(stream.is_default),
          };
        })
        .filter((track: any): track is AudioTrack => Boolean(track))
        .sort((a, b) => a.index - b.index);

      if (mappedTracks.length < 2) {
        resetAudioTrackState();
        return;
      }

      setAudioTracks(mappedTracks);

      const activeUrl =
        videoUrl ||
        detail.episodes?.[currentEpisodeIndex!] ||
        detail.episodes?.[0] ||
        '';
      let selectedTrackIndex = parseAudioStreamIndexFromUrl(activeUrl);
      if (selectedTrackIndex < 0) {
        selectedTrackIndex =
          mappedTracks.find((t) => t.isDefault)?.index ?? mappedTracks[0].index;
      }
      setCurrentAudioTrack(selectedTrackIndex);

      const preferredLang = loadPreferredAudioLang();
      if (!preferredLang) return;

      const preferredTrack = mappedTracks.find(
        (t) => normalizeAudioLang(t.language) === preferredLang,
      );

      if (preferredTrack && preferredTrack.index !== selectedTrackIndex) {
        setCurrentAudioTrack(preferredTrack.index);
      }
    };

    const isSeriesWithEpisodes = detail.episodes && detail.episodes.length > 1;

    if (isSeriesWithEpisodes) {
      const currentEpisodeUrl = detail.episodes[currentEpisodeIndex!];
      if (!currentEpisodeUrl) {
        resetAudioTrackState();
        return;
      }

      const itemIdMatch = currentEpisodeUrl.match(/\/Videos\/([^\/]+)\//);
      if (!itemIdMatch) {
        console.warn('🎵 无法从 episode URL 提取 itemId:', currentEpisodeUrl);
        resetAudioTrackState();
        return;
      }

      const episodeItemId = itemIdMatch[1];
      const embyKey = detail.source.startsWith('emby_')
        ? detail.source.substring(5)
        : undefined;

      const fetchEpisodeAudioStreams = async () => {
        try {
          const embyKeyParam = embyKey ? `&embyKey=${embyKey}` : '';
          const response = await fetch(
            `/api/emby/audio-streams?itemId=${episodeItemId}${embyKeyParam}`,
          );

          if (!response.ok) {
            console.error('🎵 获取剧集音轨失败:', response.status);
            resetAudioTrackState();
            return;
          }

          const data = await response.json();
          const rawTracks = data.audioStreams || [];

          if (rawTracks.length < 2) {
            resetAudioTrackState();
            return;
          }

          processAudioTracks(rawTracks);
        } catch (error) {
          console.error('🎵 获取剧集音轨异常:', error);
          resetAudioTrackState();
        }
      };

      fetchEpisodeAudioStreams();
      return;
    }

    const rawTracks = (detail as any).private_audio_streams || [];

    if (rawTracks.length < 2) {
      resetAudioTrackState();
      return;
    }

    processAudioTracks(rawTracks);
  }, [currentEpisodeIndex, detail, resetAudioTrackState, videoUrl]);

  const handleAudioTrackSelect = async (track: AudioTrack) => {
    if (typeof track.hlsIndex === 'number') {
      const hls = artPlayerRef.current?.video?.hls;
      if (!hls || hls.audioTrack === track.hlsIndex) return;

      try {
        // eslint-disable-next-line react-hooks/immutability -- intentional HLS.js API call
        hls.audioTrack = track.hlsIndex;
        setCurrentAudioTrack(track.hlsIndex);
        savePreferredAudioLang(track.language);
      } catch (error) {
        console.warn('切换HLS音轨失败:', error);
      }
      return;
    }

    if (
      !detail ||
      !detail.source ||
      !(detail.source === 'emby' || detail.source.startsWith('emby_'))
    ) {
      return;
    }

    if (track.index === currentAudioTrackRef.current) return;

    const currentTime = artPlayerRef.current?.currentTime || 0;
    resumeTimeRef.current = currentTime;
    setCurrentAudioTrack(track.index);
    savePreferredAudioLang(track.language);
    setIsAudioTrackSwitching(true);

    const nextUrl = appendAudioStreamIndex(videoUrl, track.index);
    if (nextUrl && nextUrl !== videoUrl) {
      setVideoUrl(nextUrl);
    } else {
      setIsAudioTrackSwitching(false);
    }
  };

  const buildAudioTrackControl = () => {
    const currentTrack = audioTracks.find((t) =>
      typeof t.hlsIndex === 'number'
        ? t.hlsIndex === currentAudioTrack
        : t.index === currentAudioTrack,
    );
    const currentTrackName = currentTrack?.name || '音轨';
    const escapedName = escapeAudioTrackHtml(currentTrackName);

    const selector = audioTracks.map((track) => {
      const selected =
        typeof track.hlsIndex === 'number'
          ? track.hlsIndex === currentAudioTrack
          : track.index === currentAudioTrack;

      return {
        html: `${selected ? '▶ ' : ''}${escapeAudioTrackHtml(track.name)}`,
        trackIndex: track.index,
        trackHlsIndex: track.hlsIndex,
        default: selected,
      };
    });

    return {
      name: 'audio-track-control',
      position: 'right' as const,
      index: 7,
      tooltip: isAudioTrackSwitching
        ? '音轨切换中...'
        : `音轨: ${currentTrackName}`,
      style: {
        display: audioTracks.length >= 2 ? 'flex' : 'none',
        alignItems: 'center',
        gap: '4px',
        padding: '0 6px',
      },
      html: isAudioTrackSwitching
        ? '<i class="art-icon flex"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-opacity="0.35"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></i><span style="font-size:12px;">音轨</span>'
        : `<i class="art-icon flex"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 9v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M13 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 6v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></i><span style="font-size:12px;">音轨</span><span style="max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;opacity:0.85;">${escapedName}</span>`,
      selector,
      onSelect: function (item: any) {
        const selectedTrack = audioTracksRef.current.find((t) => {
          if (t.index !== item.trackIndex) return false;
          if (typeof item.trackHlsIndex === 'number') {
            return t.hlsIndex === item.trackHlsIndex;
          }
          return true;
        });
        if (selectedTrack) {
          void handleAudioTrackSelect(selectedTrack);
        }
      },
    };
  };

  return {
    audioTracks,
    setAudioTracks,
    currentAudioTrack,
    setCurrentAudioTrack,
    isAudioTrackSwitching,
    setIsAudioTrackSwitching,
    audioTracksRef,
    currentAudioTrackRef,
    handleAudioTrackSelect,
    buildAudioTrackControl,
    resetAudioTrackState,
  };
}
