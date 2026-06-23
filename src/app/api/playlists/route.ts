import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PlaylistItem {
  id: string;
  title: string;
  cover: string;
  source: string;
  addedAt: number;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  username: string;
  items: PlaylistItem[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

// 获取用户的片单
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const playlistId = searchParams.get('id');

    // 获取特定片单
    if (playlistId) {
      const cacheKey = `playlist:${playlistId}`;
      const playlist = await db.getCache(cacheKey);
      if (!playlist) {
        return NextResponse.json({ error: '片单不存在' }, { status: 404 });
      }
      return NextResponse.json({ success: true, playlist });
    }

    // 获取用户的片单列表
    const authInfo = await getAuthInfoFromCookie(request);
    const targetUsername = username || authInfo?.username;

    if (!targetUsername) {
      return NextResponse.json({ error: '请指定用户名' }, { status: 400 });
    }

    const cacheKey = `playlists:${targetUsername}`;
    const playlists = await db.getCache(cacheKey);

    return NextResponse.json({
      success: true,
      playlists: Array.isArray(playlists) ? playlists : [],
    });
  } catch (error) {
    console.error('获取片单失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 创建/更新片单
export async function POST(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description = '', isPublic = false, items = [] } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '片单名称不能为空' }, { status: 400 });
    }

    const playlist: Playlist = {
      id: `playlist-${authInfo.username}-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      username: authInfo.username,
      items,
      isPublic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 保存片单
    const cacheKey = `playlist:${playlist.id}`;
    await db.setCache(cacheKey, playlist, 365 * 24 * 60 * 60); // 1年缓存

    // 添加到用户的片单列表
    const userPlaylistsKey = `playlists:${authInfo.username}`;
    const existing = await db.getCache(userPlaylistsKey);
    const playlists = Array.isArray(existing) ? existing : [];
    playlists.push(playlist);
    await db.setCache(userPlaylistsKey, playlists, 365 * 24 * 60 * 60);

    return NextResponse.json({
      success: true,
      playlist,
      message: '片单创建成功',
    });
  } catch (error) {
    console.error('创建片单失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 添加/删除片单项
export async function PUT(request: NextRequest) {
  try {
    const authInfo = await getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { playlistId, action, item } = body;

    if (!playlistId) {
      return NextResponse.json({ error: '缺少片单ID' }, { status: 400 });
    }

    const cacheKey = `playlist:${playlistId}`;
    const playlist = (await db.getCache(cacheKey)) as Playlist | null;

    if (!playlist) {
      return NextResponse.json({ error: '片单不存在' }, { status: 404 });
    }

    if (playlist.username !== authInfo.username) {
      return NextResponse.json({ error: '无权修改此片单' }, { status: 403 });
    }

    if (action === 'add' && item) {
      // 检查是否已存在
      const exists = playlist.items.some((i: PlaylistItem) => i.id === item.id);
      if (!exists) {
        playlist.items.push({
          ...item,
          addedAt: Date.now(),
        });
      }
    } else if (action === 'remove' && item) {
      playlist.items = playlist.items.filter(
        (i: PlaylistItem) => i.id !== item.id,
      );
    } else if (action === 'update') {
      // 更新片单元信息
      if (body.name) playlist.name = body.name;
      if (body.description !== undefined)
        playlist.description = body.description;
      if (body.isPublic !== undefined) playlist.isPublic = body.isPublic;
    }

    playlist.updatedAt = Date.now();
    await db.setCache(cacheKey, playlist, 365 * 24 * 60 * 60);

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error('更新片单失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
