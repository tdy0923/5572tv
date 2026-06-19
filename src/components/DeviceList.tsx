'use client';

import { Monitor, RefreshCw, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Device {
  id: string;
  username: string;
  userAgent: string;
  ip: string;
  loginTime: number;
  lastSeen: number;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
}

interface DeviceListResponse {
  devices: Device[];
  currentDeviceId: string;
}

function formatTime(timestamp: number, now: Date): string {
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

function getDeviceIcon(deviceType: Device['deviceType']) {
  switch (deviceType) {
    case 'desktop':
      return <Monitor className='w-5 h-5' />;
    case 'mobile':
      return <Smartphone className='w-5 h-5' />;
    case 'tablet':
      return <Tablet className='w-5 h-5' />;
    default:
      return <Monitor className='w-5 h-5' />;
  }
}

export function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/devices');
      if (response.ok) {
        const data: DeviceListResponse = await response.json();
        setDevices(data.devices);
        setCurrentDeviceId(data.currentDeviceId);
      }
    } catch {
      // silently handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  const handleRevoke = async (deviceId: string) => {
    if (!window.confirm('确定要撤销此设备的访问权限吗？')) {
      return;
    }

    setRevoking(deviceId);
    try {
      const response = await fetch(`/api/auth/devices?id=${deviceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDevices();
      } else {
        const data = await response.json();
        alert(data.error || '撤销失败');
      }
    } catch (error) {
      console.error('撤销设备失败:', error);
      alert('撤销失败');
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <RefreshCw className='w-5 h-5 animate-spin text-gray-400' />
        <span className='ml-2 text-sm text-gray-500'>加载中...</span>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className='text-center py-8'>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          暂无登录设备记录
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {devices.map((device) => {
        const isCurrentDevice = device.id === currentDeviceId;
        return (
          <div
            key={device.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              isCurrentDevice
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                isCurrentDevice
                  ? 'bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {getDeviceIcon(device.deviceType)}
            </div>

            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                  {device.deviceName}
                </span>
                {isCurrentDevice && (
                  <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300'>
                    当前设备
                  </span>
                )}
              </div>
              <div className='flex items-center gap-2 mt-1'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  {device.ip}
                </span>
                <span className='text-xs text-gray-400 dark:text-gray-500'>
                  ·
                </span>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  最后活跃:{' '}
                  {now ? formatTime(device.lastSeen, now) : '加载中...'}
                </span>
              </div>
            </div>

            {!isCurrentDevice && (
              <button
                onClick={() => handleRevoke(device.id)}
                disabled={revoking === device.id}
                className='flex-shrink-0 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50'
                title='撤销此设备'
              >
                {revoking === device.id ? (
                  <RefreshCw className='w-4 h-4 animate-spin' />
                ) : (
                  <Trash2 className='w-4 h-4' />
                )}
              </button>
            )}
          </div>
        );
      })}

      <div className='pt-3 border-t border-gray-200 dark:border-gray-700'>
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          设备记录保留30天，超期自动清理
        </p>
      </div>
    </div>
  );
}
