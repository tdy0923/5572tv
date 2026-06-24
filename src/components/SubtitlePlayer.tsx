'use client';

import { useMemo } from 'react';

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

interface SubtitlePlayerProps {
  subtitles: Subtitle[];
  currentTime: number;
  visible?: boolean;
}

export default function SubtitlePlayer({
  subtitles,
  currentTime,
  visible = true,
}: SubtitlePlayerProps) {
  const currentSubtitle = useMemo(() => {
    if (!visible || subtitles.length === 0) return null;
    const sub = subtitles.find(
      (s) => currentTime >= s.start && currentTime <= s.end,
    );
    return sub?.text || null;
  }, [subtitles, currentTime, visible]);

  if (!visible || !currentSubtitle) return null;

  return (
    <div className='absolute bottom-20 left-0 right-0 flex justify-center z-10 pointer-events-none'>
      <div className='px-4 py-2 bg-black/70 rounded-lg backdrop-blur-sm max-w-[80%]'>
        <p className='text-white text-sm sm:text-base text-center leading-relaxed'>
          {currentSubtitle}
        </p>
      </div>
    </div>
  );
}

// 解析 SRT 字幕文件
export function parseSRT(srtContent: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // 解析时间码
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/,
    );

    if (!timeMatch) continue;

    const start =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const end =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines
      .slice(2)
      .join('\n')
      .replace(/<[^>]+>/g, '');

    subtitles.push({ start, end, text });
  }

  return subtitles;
}

// 解析 VTT 字幕文件
export function parseVTT(vttContent: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const lines = vttContent.trim().split('\n');
  let i = 0;

  // 跳过头部
  if (lines[0].startsWith('WEBVTT')) i = 1;

  while (i < lines.length) {
    if (lines[i].includes('-->')) {
      const timeMatch = lines[i].match(
        /(\d{2}):(\d{2}):(\d{2})[.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.](\d{3})/,
      );

      if (timeMatch) {
        const start =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;

        const end =
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;

        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].replace(/<[^>]+>/g, ''));
          i++;
        }

        subtitles.push({ start, end, text: textLines.join('\n') });
      }
    }
    i++;
  }

  return subtitles;
}
