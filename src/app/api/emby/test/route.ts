/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { EmbyClient } from '@/lib/emby.client';

export const runtime = 'nodejs';

/**
 * 测试 Emby 连接
 */
export async function POST(request: NextRequest) {
  try {
    // 仅登录用户可测试自己的 Emby 配置
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo?.username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { ServerURL, ApiKey, Username, Password, removeEmbyPrefix } = body;

    if (!ServerURL) {
      return NextResponse.json(
        { success: false, error: '服务器地址不能为空' },
        { status: 400 },
      );
    }

    // 创建临时 EmbyClient 进行测试
    const client = new EmbyClient({
      ServerURL,
      ApiKey,
      Username,
      Password,
      removeEmbyPrefix,
    });

    // 尝试获取当前用户信息
    const user = await client.getCurrentUser();

    return NextResponse.json({
      success: true,
      user: {
        Id: user.Id,
        Name: user.Name,
      },
    });
  } catch (error: any) {
    console.error('[Emby Test] 测试连接失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '连接失败',
      },
      { status: 500 },
    );
  }
}
