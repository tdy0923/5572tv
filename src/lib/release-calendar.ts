/* eslint-disable no-console */

/**
 * Release Calendar Scraper
 * Based on LunaTV implementation
 *
 * Scrapes upcoming movie/TV release schedules from manmankan.com
 */

import { DEFAULT_USER_AGENT } from './user-agent';

interface ReleaseItem {
  title: string;
  releaseDate: string;
  type: 'movie' | 'tv';
  region: string;
  genre: string;
  director: string;
  actors: string;
  poster: string;
  description?: string;
}

// Random delay to avoid detection
function randomDelay(min: number = 100, max: number = 400): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min) + min);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: 'https://www.manmankan.com/',
        },
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      console.error(`Fetch attempt ${i + 1} failed:`, e);
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }
  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Parse movie release schedule
 */
function parseMovieSchedule(html: string): ReleaseItem[] {
  const items: ReleaseItem[] = [];

  // Match pattern: <dl class="twlist-block">...</dl>
  const blockRegex = /<dl class="twlist-block">([\s\S]*?)<\/dl>/g;
  let blockMatch;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[1];

    // Extract title
    const titleMatch = block.match(/<a[^>]+title="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract link
    const linkMatch = block.match(/<a[^>]+href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1] : '';

    // Extract poster
    const posterMatch = block.match(/<img[^>]+(?:data-original|src)="([^"]+)"/);
    const poster = posterMatch ? posterMatch[1] : '';

    // Extract details from text
    const textContent = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    // Extract director
    const directorMatch = textContent.match(/导演[：:]\s*([^\s,，]+)/);
    const director = directorMatch ? directorMatch[1] : '';

    // Extract actors
    const actorsMatch = textContent.match(
      /主演[：:]\s*([^\s,，]+(?:[、/][^\s,，]+)*)/,
    );
    const actors = actorsMatch ? actorsMatch[1] : '';

    // Extract region
    const regionMatch = textContent.match(
      /(中国大陆|中国香港|中国台湾|美国|英国|日本|韩国|法国|德国|印度|其他)/,
    );
    const region = regionMatch ? regionMatch[1] : '';

    // Extract genre
    const genreMatch = textContent.match(
      /(剧情|喜剧|动作|爱情|科幻|动画|悬疑|恐怖|犯罪|战争|奇幻|冒险|历史|传记|纪录片|家庭|音乐)/,
    );
    const genre = genreMatch ? genreMatch[1] : '';

    // Extract release date
    const dateMatch = textContent.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    const releaseDate = dateMatch ? dateMatch[1] : '';

    if (title) {
      items.push({
        title,
        releaseDate,
        type: 'movie',
        region,
        genre,
        director,
        actors,
        poster: poster.startsWith('//') ? `https:${poster}` : poster,
      });
    }
  }

  return items;
}

/**
 * Parse TV release schedule
 */
function parseTvSchedule(html: string): ReleaseItem[] {
  const items: ReleaseItem[] = [];

  // Similar pattern to movie but with different structure
  const blockRegex = /<div class="sjbul-d">([\s\S]*?)<\/div>/g;
  let blockMatch;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[1];

    // Extract title
    const titleMatch = block.match(/<a[^>]+title="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : '';

    // Extract poster
    const posterMatch = block.match(/<img[^>]+(?:data-original|src)="([^"]+)"/);
    const poster = posterMatch ? posterMatch[1] : '';

    // Extract release date
    const dateMatch = block.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    const releaseDate = dateMatch ? dateMatch[1] : '';

    if (title) {
      items.push({
        title,
        releaseDate,
        type: 'tv',
        region: '',
        genre: '',
        director: '',
        actors: '',
        poster: poster.startsWith('//') ? `https:${poster}` : poster,
      });
    }
  }

  return items;
}

/**
 * Fetch release calendar from multiple sources
 */
export async function fetchReleaseCalendar(): Promise<{
  movies: ReleaseItem[];
  tvShows: ReleaseItem[];
}> {
  const movies: ReleaseItem[] = [];
  const tvShows: ReleaseItem[] = [];

  const urls = [
    // Movie schedules
    'https://www.manmankan.com/dy/newly/index.html',
    // TV schedules
    'https://www.manmankan.com/tv/newly/index.html',
  ];

  for (const url of urls) {
    try {
      await randomDelay();
      const html = await fetchWithRetry(url);

      if (url.includes('/dy/')) {
        movies.push(...parseMovieSchedule(html));
      } else {
        tvShows.push(...parseTvSchedule(html));
      }
    } catch (e) {
      console.error(`Failed to fetch ${url}:`, e);
    }
  }

  // Deduplicate by title + releaseDate
  const uniqueMovies = Array.from(
    new Map(movies.map((m) => [`${m.title}-${m.releaseDate}`, m])).values(),
  );
  const uniqueTvShows = Array.from(
    new Map(tvShows.map((t) => [`${t.title}-${t.releaseDate}`, t])).values(),
  );

  // Sort by release date
  uniqueMovies.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  uniqueTvShows.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  return {
    movies: uniqueMovies,
    tvShows: uniqueTvShows,
  };
}
