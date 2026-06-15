/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export const runtime = 'nodejs';

interface DeviceInfo {
  id: string;
  username: string;
  userAgent: string;
  ip: string;
  loginTime: number;
  lastSeen: number;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
}

function parseUserAgent(ua: string): {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
} {
  const lowerUa = ua.toLowerCase();

  if (
    lowerUa.includes('mobile') ||
    (lowerUa.includes('android') && !lowerUa.includes('tablet')) ||
    lowerUa.includes('iphone') ||
    lowerUa.includes('windows phone')
  ) {
    let deviceName = 'Mobile Device';
    if (lowerUa.includes('iphone')) deviceName = 'iPhone';
    else if (lowerUa.includes('android')) deviceName = 'Android Device';
    else if (lowerUa.includes('windows phone')) deviceName = 'Windows Phone';
    return { deviceType: 'mobile', deviceName };
  }

  if (
    lowerUa.includes('tablet') ||
    lowerUa.includes('ipad') ||
    (lowerUa.includes('android') && !lowerUa.includes('mobile'))
  ) {
    let deviceName = 'Tablet';
    if (lowerUa.includes('ipad')) deviceName = 'iPad';
    else if (lowerUa.includes('android')) deviceName = 'Android Tablet';
    return { deviceType: 'tablet', deviceName };
  }

  if (
    lowerUa.includes('windows') ||
    lowerUa.includes('macintosh') ||
    lowerUa.includes('linux') ||
    lowerUa.includes('chrome os')
  ) {
    let deviceName = 'Desktop';
    if (lowerUa.includes('windows')) deviceName = 'Windows PC';
    else if (lowerUa.includes('macintosh')) deviceName = 'Mac';
    else if (lowerUa.includes('linux')) deviceName = 'Linux PC';
    else if (lowerUa.includes('chrome os')) deviceName = 'Chromebook';

    if (lowerUa.includes('chrome') && !lowerUa.includes('edg')) {
      deviceName += ' (Chrome)';
    } else if (lowerUa.includes('firefox')) {
      deviceName += ' (Firefox)';
    } else if (lowerUa.includes('safari') && !lowerUa.includes('chrome')) {
      deviceName += ' (Safari)';
    } else if (lowerUa.includes('edg')) {
      deviceName += ' (Edge)';
    }

    return { deviceType: 'desktop', deviceName };
  }

  return { deviceType: 'unknown', deviceName: 'Unknown Device' };
}

async function generateDeviceId(ua: string, ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${ua}:${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getUsernameFromCookie(request: NextRequest): string | null {
  const authCookie = request.cookies.get('user_auth')?.value;
  if (!authCookie) return null;

  try {
    const authData = JSON.parse(decodeURIComponent(authCookie));
    return authData.username || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const username = getUsernameFromCookie(request);
    if (!username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const devicesKey = `device:${username}`;
    const devices: Record<string, DeviceInfo> =
      (await db.getCache(devicesKey)) || {};

    const deviceList = Object.values(devices).sort(
      (a, b) => b.lastSeen - a.lastSeen,
    );

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const cleanedDevices: Record<string, DeviceInfo> = {};
    let hasExpired = false;

    for (const device of deviceList) {
      if (now - device.lastSeen < THIRTY_DAYS) {
        cleanedDevices[device.id] = device;
      } else {
        hasExpired = true;
      }
    }

    if (hasExpired) {
      await db.setCache(devicesKey, cleanedDevices);
    }

    const currentIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const currentUa = request.headers.get('user-agent') || '';
    const currentDeviceId = await generateDeviceId(currentUa, currentIp);

    return NextResponse.json({
      devices: Object.values(cleanedDevices).sort(
        (a, b) => b.lastSeen - a.lastSeen,
      ),
      currentDeviceId,
    });
  } catch (error) {
    console.error('获取设备列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const username = getUsernameFromCookie(request);
    if (!username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json({ error: '缺少设备ID' }, { status: 400 });
    }

    const currentIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const currentUa = request.headers.get('user-agent') || '';
    const currentDeviceId = await generateDeviceId(currentUa, currentIp);

    if (deviceId === currentDeviceId) {
      return NextResponse.json({ error: '不能撤销当前设备' }, { status: 400 });
    }

    const devicesKey = `device:${username}`;
    const devices: Record<string, DeviceInfo> =
      (await db.getCache(devicesKey)) || {};

    if (!devices[deviceId]) {
      return NextResponse.json({ error: '设备不存在' }, { status: 404 });
    }

    delete devices[deviceId];
    await db.setCache(devicesKey, devices);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('撤销设备失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = getUsernameFromCookie(request);
    if (!username) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { userAgent, ip } = await request.json();
    const ua = userAgent || request.headers.get('user-agent') || '';
    const deviceIp =
      ip ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const deviceId = await generateDeviceId(ua, deviceIp);
    const { deviceType, deviceName } = parseUserAgent(ua);

    const devicesKey = `device:${username}`;
    const devices: Record<string, DeviceInfo> =
      (await db.getCache(devicesKey)) || {};

    const now = Date.now();

    if (devices[deviceId]) {
      devices[deviceId].lastSeen = now;
      devices[deviceId].ip = deviceIp;
    } else {
      devices[deviceId] = {
        id: deviceId,
        username,
        userAgent: ua,
        ip: deviceIp,
        loginTime: now,
        lastSeen: now,
        deviceType,
        deviceName,
      };
    }

    await db.setCache(devicesKey, devices);

    return NextResponse.json({ ok: true, deviceId });
  } catch (error) {
    console.error('记录设备失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
