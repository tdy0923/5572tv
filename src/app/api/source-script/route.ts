import { NextRequest, NextResponse } from 'next/server';

import { ensureAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const SCRIPTS_KEY = 'source_scripts';
const SCRIPTS_TTL = undefined; // no expiry

export interface SourceScript {
  id: string;
  name: string;
  enabled: boolean;
  targetSource: string;
  searchScript?: string;
  detailScript?: string;
  playScript?: string;
  headers?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getScripts(): Promise<SourceScript[]> {
  try {
    const data = await db.getCache(SCRIPTS_KEY);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveScripts(scripts: SourceScript[]): Promise<void> {
  await db.setCache(SCRIPTS_KEY, scripts, SCRIPTS_TTL);
}

export async function GET(request: NextRequest) {
  try {
    await ensureAdmin(request);
    const scripts = await getScripts();
    return NextResponse.json({ scripts });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: '获取脚本列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAdmin(request);
    const body = await request.json();

    if (body.action === 'test') {
      return handleTest(body);
    }

    const scripts = await getScripts();
    const now = Date.now();

    if (body.id) {
      // Update existing script
      const index = scripts.findIndex((s) => s.id === body.id);
      if (index === -1) {
        return NextResponse.json({ error: '脚本不存在' }, { status: 404 });
      }
      scripts[index] = {
        ...scripts[index],
        name: body.name ?? scripts[index].name,
        enabled: body.enabled ?? scripts[index].enabled,
        targetSource: body.targetSource ?? scripts[index].targetSource,
        searchScript: body.searchScript ?? scripts[index].searchScript,
        detailScript: body.detailScript ?? scripts[index].detailScript,
        playScript: body.playScript ?? scripts[index].playScript,
        headers: body.headers ?? scripts[index].headers,
        updatedAt: now,
      };
      await saveScripts(scripts);
      return NextResponse.json({ script: scripts[index] });
    }

    // Create new script
    const script: SourceScript = {
      id: generateId(),
      name: body.name || 'Untitled Script',
      enabled: body.enabled !== false,
      targetSource: body.targetSource || '',
      searchScript: body.searchScript || undefined,
      detailScript: body.detailScript || undefined,
      playScript: body.playScript || undefined,
      headers: body.headers || undefined,
      createdAt: now,
      updatedAt: now,
    };
    scripts.push(script);
    await saveScripts(scripts);
    return NextResponse.json({ script }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: '保存脚本失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少脚本ID' }, { status: 400 });
    }

    const scripts = await getScripts();
    const filtered = scripts.filter((s) => s.id !== id);

    if (filtered.length === scripts.length) {
      return NextResponse.json({ error: '脚本不存在' }, { status: 404 });
    }

    await saveScripts(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: '删除脚本失败' }, { status: 500 });
  }
}

// ==================== Script Execution Helpers ====================

const BLOCKED_GLOBALS = [
  'process',
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'globalThis',
  'global',
];

function executeScript(
  scriptCode: string,
  context: Record<string, any>,
  timeoutMs = 5000,
): any {
  const wrappedCode = `
    "use strict";
    ${BLOCKED_GLOBALS.map((g) => `var ${g} = undefined;`).join('\n')}
    return (${scriptCode})(__ctx__);
  `;

  const fn = new Function('__ctx__', wrappedCode);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('脚本执行超时'));
    }, timeoutMs);

    try {
      const result = fn(context);
      clearTimeout(timer);
      resolve(result);
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

async function handleTest(body: {
  type: 'search' | 'detail' | 'play';
  script: string;
  targetSource: string;
  headers?: Record<string, string>;
  testQuery?: string;
  testUrl?: string;
  testId?: string;
}) {
  const { type, script, targetSource, headers, testQuery, testUrl, testId } =
    body;

  if (!script) {
    return NextResponse.json({ error: '缺少脚本代码' }, { status: 400 });
  }

  try {
    if (type === 'search') {
      const ctx = {
        query: testQuery || 'test',
        headers: headers || {},
        targetSource,
      };
      const result = await executeScript(script, ctx);
      return NextResponse.json({
        success: true,
        type: 'search',
        result,
        message: '搜索脚本执行成功',
      });
    }

    if (type === 'detail') {
      const ctx = {
        id: testId || '1',
        url: testUrl || '',
        headers: headers || {},
        targetSource,
      };
      const result = await executeScript(script, ctx);
      return NextResponse.json({
        success: true,
        type: 'detail',
        result,
        message: '详情脚本执行成功',
      });
    }

    if (type === 'play') {
      const ctx = {
        url: testUrl || 'https://example.com/test.m3u8',
        headers: headers || {},
        targetSource,
      };
      const result = await executeScript(script, ctx);
      return NextResponse.json({
        success: true,
        type: 'play',
        result,
        message: '播放脚本执行成功',
      });
    }

    return NextResponse.json({ error: '未知的测试类型' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        type,
        error: (error as Error).message,
        message: '脚本执行失败',
      },
      { status: 200 },
    );
  }
}
