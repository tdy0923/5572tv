'use client';

import type ArtPlayer from 'artplayer';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SearchResult } from '@/lib/types';

import { escapeAudioTrackHtml } from '../utils';

// 将 subhd 预览格式（[HH:MM:SS] + 文本行）或标准 SRT 转换为 WebVTT
function toVtt(content: string): string {
  // 已经是 WebVTT
  if (/^WEBVTT/i.test(content.trim())) return content;

  const lines = content.replace(/\r/g, '').split('\n');

  // 标准 SRT：检测 "HH:MM:SS,mmm --> HH:MM:SS,mmm"
  if (lines.some((l) => l.includes('-->'))) {
    return (
      'WEBVTT\n\n' +
      content
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
        .replace(/\n{3,}/g, '\n\n')
    );
  }

  // subhd 简化格式：连续 [HH:MM:SS] 块
  const blocks: { start: string; text: string[] }[] = [];
  let currentTime = '';
  let currentText: string[] = [];
  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]$/;

  for (const line of lines) {
    const t = line.trim().match(timeRe);
    if (t) {
      if (currentTime && currentText.length > 0) {
        blocks.push({ start: currentTime, text: currentText });
      }
      currentTime = t[1];
      currentText = [];
    } else if (line.trim()) {
      currentText.push(line.trim());
    }
  }
  if (currentTime && currentText.length > 0) {
    blocks.push({ start: currentTime, text: currentText });
  }

  if (blocks.length === 0) return content;

  const output: string[] = ['WEBVTT\n'];
  for (let i = 0; i < blocks.length; i++) {
    const start = `${blocks[i].start}.000`;
    const end =
      i + 1 < blocks.length
        ? `${blocks[i + 1].start}.000`
        : addSeconds(blocks[i].start, 2);
    output.push(`${start} --> ${end}`);
    output.push(blocks[i].text.join('\n'));
    output.push('');
  }
  return output.join('\n');
}

function addSeconds(time: string, sec: number): string {
  const parts = time.split('.').length > 1 ? time.split('.')[0] : time;
  const [h, m, s] = parts.split(':').map(Number);
  const total = h * 3600 + m * 60 + s + sec;
  const hh = String(Math.floor(total / 3600)).padStart(2, '0');
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(Math.floor(total % 60)).padStart(2, '0');
  return `${hh}:${mm}:${ss}.000`;
}

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

  // 自动按片名搜索预设字幕源（如 OpenSubtitles），命中后自动加载最佳中文轨
  const searchAndLoadSubtitles = useCallback(
    async (title: string, year?: string) => {
      if (!title || subtitleTracksRef.current.length > 0) return; // 已有字幕轨则跳过

      try {
        const res = await fetch(
          `/api/subtitle/search?title=${encodeURIComponent(title)}${year ? `&year=${encodeURIComponent(year)}` : ''}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const list: any[] = Array.isArray(data.list) ? data.list : [];
        if (list.length === 0) return;

        // 优先中文 → 第一个
        const chineseIdx = list.findIndex(
          (s) => s.language && /chi|zh|中文|zho|zht/i.test(s.language),
        );
        const best = chineseIdx >= 0 ? list[chineseIdx] : list[0];

        // 尝试获取下载链接或内容
        const dl = await fetch('/api/subtitle/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: best.provider,
            fileId: best.fileId,
            pageUrl: best.pageUrl,
          }),
        });
        if (!dl.ok) {
          // 无下载时展示搜索结果，允许用户点击跳转
          const searchTracks: SubtitleTrack[] = list.map((s, i) => ({
            index: i,
            name: s.title || s.language || '字幕',
            language: s.language,
            type: 'emby' as const,
            url: s.pageUrl,
          }));
          setSubtitleTracks(searchTracks);
          return;
        }
        const dlData = await dl.json();

        // subhd 内容：content 字段包含字幕文本
        if (dlData.content && dlData.content.content) {
          const vtt = toVtt(dlData.content.content);
          const blob = new Blob([vtt], { type: 'text/vtt' });
          const blobUrl = URL.createObjectURL(blob);
          const track: SubtitleTrack = {
            index: 0,
            name: dlData.content.title || best.language || '在线字幕',
            language: dlData.content.language || best.language,
            type: 'emby' as const,
            url: blobUrl,
          };
          setSubtitleTracks([track]);
          selectSubtitle(0);
          return;
        }

        // opensubtitles：直接 URL
        if (dlData.url) {
          const track: SubtitleTrack = {
            index: 0,
            name: best.title || best.language || '在线字幕',
            language: best.language,
            type: 'emby' as const,
            url: dlData.url,
          };
          setSubtitleTracks([track]);
          selectSubtitle(0);
        }
      } catch {
        // 静默失败
      }
    },
    [selectSubtitle],
  );

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
    searchAndLoadSubtitles,
    selectSubtitle,
    disableSubtitles,
    resetSubtitleTracks,
    buildSubtitleControl,
  };
}
