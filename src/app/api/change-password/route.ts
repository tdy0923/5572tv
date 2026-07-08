/* eslint-disable no-console*/

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie, revokeToken } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return '密码长度至少8位';
  }
  return null;
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (storageType === 'localstorage') {
    return NextResponse.json(
      {
        error: '不支持本地存储模式修改密码',
      },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!oldPassword || typeof oldPassword !== 'string') {
      return NextResponse.json({ error: '旧密码不得为空' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: '新密码不得为空' }, { status: 400 });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }

    const username = authInfo.username;

    // 先验证旧密码（支持 V1/V2）
    let isOldPasswordValid = false;
    try {
      isOldPasswordValid = await db.verifyUserV2(username, oldPassword);
    } catch {}
    if (!isOldPasswordValid) {
      try {
        isOldPasswordValid = await db.verifyUser(username, oldPassword);
      } catch {}
    }
    if (!isOldPasswordValid) {
      return NextResponse.json({ error: '旧密码不正确' }, { status: 401 });
    }

    // 不允许站长修改密码（站长用户名等于 process.env.USERNAME）
    if (username === process.env.USERNAME) {
      return NextResponse.json(
        { error: '站长不能通过此接口修改密码' },
        { status: 403 },
      );
    }

    // 修改密码
    await db.changePassword(username, newPassword);

    // 吊销旧 session，强制重新登录
    await revokeToken(username, authInfo.timestamp).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json(
      {
        error: '修改密码失败',
      },
      { status: 500 },
    );
  }
}
