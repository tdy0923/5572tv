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

  const yearRegex = /(\d{4})/;
  const blocks = html.split('<div class="result">');

  for (const block of blocks) {
    if (results.length >= 3) break;
    const sidMatch = block.match(/sid:\s*(\d+)/);
    if (!sidMatch) continue;
    const id = parseInt(sidMatch[1], 10);
    if (!id || isNaN(id)) continue;
    const h3Match = block.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    const titleRaw = h3Match ? h3Match[1].replace(/<[^>]+>/g, '').trim() : '';
    const title = titleRaw
      .replace(/[（(].*?[）)]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const yearMatch = titleRaw.match(yearRegex);
    results.push({
      id,
      title: title || `douban-${id}`,
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
