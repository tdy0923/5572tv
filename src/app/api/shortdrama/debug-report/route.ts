import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * 短剧真机诊断回传：竖屏播放器在失败/看门狗触发时自动POST，
 * 服务端写jsonl文件+控制台打日志，站长docker logs即可见。
 * 零用户操作成本；成功路径仅上报极简事件用于对照。
 */
const inflight = new Set<string>(); // 简易去重窗口

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title?: string;
      reason?: string;
      ua?: string;
      net?: string;
      events?: Array<Record<string, unknown>>;
    };

    const title = (body.title || '').slice(0, 80);
    const reason = (body.reason || 'unknown').slice(0, 24);
    const key = `${title}|${reason}`;
    // 同一标题同一原因5分钟内只落一条，防刷
    if (inflight.has(key)) return NextResponse.json({ ok: true, dup: true });
    inflight.add(key);
    setTimeout(() => inflight.delete(key), 5 * 60_000);

    const record = {
      ts: new Date().toISOString(),
      title,
      reason,
      ua: (body.ua || '').slice(0, 160),
      net: body.net || '',
      events: (body.events || []).slice(-40),
    };

    const line = JSON.stringify(record);
    console.error(`[短剧诊断] ${line}`);

    try {
      const fs = await import('fs');
      const path = '/app/.data/shortdrama-debug.jsonl';
      fs.appendFileSync(path, line + '\n');
    } catch {
      // 文件不可写时仅依赖console（docker logs仍可查）
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}
