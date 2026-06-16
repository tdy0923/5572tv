/* eslint-disable no-console */

/**
 * Offline Download System
 * Based on LunaTV implementation
 *
 * Downloads M3U8 videos by merging segments
 */

import * as fs from 'fs';
import * as path from 'path';

import { DEFAULT_USER_AGENT } from './user-agent';

interface Segment {
  index: number;
  url: string;
  duration: number;
  key?: {
    method: string;
    uri: string;
    iv?: string;
  };
}

interface DownloadTask {
  id: string;
  title: string;
  source: string;
  videoId: string;
  episodeIndex: number;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;
  totalSegments: number;
  downloadedSegments: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// In-memory task storage
const tasks = new Map<string, DownloadTask>();
const MAX_CONCURRENT_DOWNLOADS = 6;

/**
 * Parse M3U8 playlist
 */
function parseM3U8(content: string): Segment[] {
  const lines = content.split('\n');
  const segments: Segment[] = [];
  let currentKey: Segment['key'] | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse key
    if (line.startsWith('#EXT-X-KEY:')) {
      const methodMatch = line.match(/METHOD=([^,]+)/);
      const uriMatch = line.match(/URI="([^"]+)"/);
      const ivMatch = line.match(/IV=([^,]+)/);

      if (methodMatch && uriMatch) {
        currentKey = {
          method: methodMatch[1],
          uri: uriMatch[1],
          iv: ivMatch ? ivMatch[1] : undefined,
        };
      }
    }

    // Parse segment
    if (line.startsWith('#EXTINF:')) {
      const durationMatch = line.match(/#EXTINF:([0-9.]+)/);
      const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;

      // Next line should be the URL
      if (i + 1 < lines.length) {
        const url = lines[i + 1].trim();
        if (url && !url.startsWith('#')) {
          segments.push({
            index: segments.length,
            url,
            duration,
            key: currentKey,
          });
        }
      }
    }
  }

  return segments;
}

/**
 * Check if content is a master playlist
 */
function isMasterPlaylist(content: string): boolean {
  return content.includes('#EXT-X-STREAM-INF:');
}

/**
 * Select best variant from master playlist
 */
function selectBestVariant(content: string): string | null {
  const lines = content.split('\n');
  let bestBandwidth = 0;
  let bestUrl = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXT-X-STREAM-INF:')) {
      const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);
      if (bandwidthMatch) {
        const bandwidth = parseInt(bandwidthMatch[1]);
        if (bandwidth > bestBandwidth) {
          bestBandwidth = bandwidth;
          // Next line is the URL
          if (i + 1 < lines.length) {
            bestUrl = lines[i + 1].trim();
          }
        }
      }
    }
  }

  return bestUrl;
}

/**
 * Download file with retry
 */
async function downloadFile(
  url: string,
  outputPath: string,
  maxRetries: number = 3,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: '*/*',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);
      return true;
    } catch (e) {
      console.error(`Download attempt ${i + 1} failed for ${url}:`, e);
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  return false;
}

/**
 * Download M3U8 video
 */
export async function downloadVideo(
  m3u8Url: string,
  title: string,
  source: string,
  videoId: string,
  episodeIndex: number,
  outputDir: string,
): Promise<DownloadTask> {
  const taskId = `${source}_${videoId}_${episodeIndex}_${Date.now()}`;

  const task: DownloadTask = {
    id: taskId,
    title,
    source,
    videoId,
    episodeIndex,
    status: 'downloading',
    progress: 0,
    totalSegments: 0,
    downloadedSegments: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  tasks.set(taskId, task);

  try {
    // Create output directory
    const taskDir = path.join(
      outputDir,
      source,
      videoId,
      `ep${episodeIndex + 1}`,
    );
    fs.mkdirSync(taskDir, { recursive: true });

    // Fetch master playlist
    const masterResponse = await fetch(m3u8Url, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });

    if (!masterResponse.ok) {
      throw new Error(`Failed to fetch playlist: ${masterResponse.status}`);
    }

    const masterContent = await masterResponse.text();

    // Handle master playlist
    let playlistUrl = m3u8Url;
    let playlistContent = masterContent;

    if (isMasterPlaylist(masterContent)) {
      const bestVariant = selectBestVariant(masterContent);
      if (!bestVariant) {
        throw new Error('No variant found in master playlist');
      }

      // Resolve relative URL
      playlistUrl = new URL(bestVariant, m3u8Url).toString();

      const variantResponse = await fetch(playlistUrl, {
        headers: { 'User-Agent': DEFAULT_USER_AGENT },
        signal: AbortSignal.timeout(15000),
      });

      if (!variantResponse.ok) {
        throw new Error(`Failed to fetch variant: ${variantResponse.status}`);
      }

      playlistContent = await variantResponse.text();
    }

    // Parse segments
    const segments = parseM3U8(playlistContent);
    task.totalSegments = segments.length;
    task.updatedAt = Date.now();

    if (segments.length === 0) {
      throw new Error('No segments found in playlist');
    }

    // Download segments
    let downloadedCount = 0;
    const segmentFiles: string[] = [];

    for (const segment of segments) {
      // Check if paused
      if (task.status === 'paused') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const segmentFile = path.join(
        taskDir,
        `segment_${String(segment.index).padStart(5, '0')}.ts`,
      );

      // Skip if already downloaded
      if (fs.existsSync(segmentFile) && fs.statSync(segmentFile).size > 0) {
        downloadedCount++;
        segmentFiles.push(segmentFile);
        continue;
      }

      // Resolve segment URL
      const segmentUrl = new URL(segment.url, playlistUrl).toString();

      // Download
      const success = await downloadFile(segmentUrl, segmentFile);

      if (success) {
        downloadedCount++;
        segmentFiles.push(segmentFile);
        task.downloadedSegments = downloadedCount;
        task.progress = Math.round((downloadedCount / segments.length) * 100);
        task.updatedAt = Date.now();
      } else {
        console.error(`Failed to download segment ${segment.index}`);
      }
    }

    // Save playlist
    const playlistFile = path.join(taskDir, 'playlist.m3u8');
    const localPlaylist = playlistContent.replace(
      /#EXT-X-KEY:.*?URI="([^"]+)"/g,
      '#EXT-X-KEY:METHOD=AES-128,URI="key.key"',
    );
    fs.writeFileSync(playlistFile, localPlaylist);

    // Mark as completed
    task.status = 'completed';
    task.progress = 100;
    task.updatedAt = Date.now();

    return task;
  } catch (e: any) {
    task.status = 'failed';
    task.error = e.message;
    task.updatedAt = Date.now();
    throw e;
  }
}

/**
 * Get download task status
 */
export function getTask(taskId: string): DownloadTask | undefined {
  return tasks.get(taskId);
}

/**
 * Get all tasks
 */
export function getAllTasks(): DownloadTask[] {
  return Array.from(tasks.values());
}

/**
 * Pause download
 */
export function pauseTask(taskId: string): boolean {
  const task = tasks.get(taskId);
  if (task && task.status === 'downloading') {
    task.status = 'paused';
    task.updatedAt = Date.now();
    return true;
  }
  return false;
}

/**
 * Resume download
 */
export function resumeTask(taskId: string): boolean {
  const task = tasks.get(taskId);
  if (task && task.status === 'paused') {
    task.status = 'downloading';
    task.updatedAt = Date.now();
    return true;
  }
  return false;
}

/**
 * Delete task
 */
export function deleteTask(taskId: string): boolean {
  return tasks.delete(taskId);
}
