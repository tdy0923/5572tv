import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

async function searchViaWeb(query: string) {
  const url = `https://www.douban.com/search?q=${encodeURIComponent(query)}&cat=1002`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return [];
  const html = await resp.text();

  const results: {
    id: number;
    title: string;
    year: string;
    type: string;
    cover: string;
  }[] = [];
  const subjectRegex =
    /<a\s+href="https:\/\/movie\.douban\.com\/subject\/(\d+)\/[^"]*"\s*[^>]*>\s*(.*?)\s*<\/a>/gi;
  const yearRegex = /(\d{4})/;

  let match;
  while ((match = subjectRegex.exec(html)) !== null && results.length < 3) {
    const id = parseInt(match[1], 10);
    const titleRaw = match[2].replace(/<[^>]+>/g, '').trim();
    const title = titleRaw.replace(/\(.*?\)/g, '').trim();
    const yearMatch = titleRaw.match(yearRegex);
    results.push({
      id,
      title: title || titleRaw,
      year: yearMatch ? yearMatch[1] : '',
      type: 'movie',
      cover: '',
    });
  }
  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });
  }

  try {
    const results = await searchViaWeb(query);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('豆瓣搜索失败:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
