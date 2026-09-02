'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';
import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

interface WatchRoomConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

interface ServerStats {
  totalRooms: number;
  totalMembers: number;
  rooms: Array<{
    id: string;
    name: string;
    memberCount: number;
    isPublic: boolean;
    hasPassword: boolean;
    createdAt: number;
  }>;
}

const WatchRoomConfig = ({ config, refreshConfig }: WatchRoomConfigProps) => {
  const { message, isLoading, setIsLoading, showMessage } = useConfigMessage();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    enabled: false,
    serverUrl: '',
    authKey: '',
  });

  // 从config加载设置
  useEffect(() => {
    if (config?.WatchRoomConfig) {
      setSettings({
        enabled: config.WatchRoomConfig.enabled || false,
        serverUrl: config.WatchRoomConfig.serverUrl || '',
        authKey: config.WatchRoomConfig.authKey || '',
      });
    }
  }, [config]);

  // 保存的配置（用于自动刷新统计）
  const savedConfig = config?.WatchRoomConfig;

  // 测试连接
  const handleTestConnection = async () => {
    if (!settings.serverUrl) {
      showMessage('error', '请先填写服务器地址');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // 通过后端API测试连接，避免CORS问题
      const response = await fetch('/api/watch-room/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: settings.serverUrl.trim(),
          authKey: settings.authKey.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || '连接成功！',
        });
      } else {
        throw new Error(data.error || '连接失败');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `连接失败: ${error.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    // 验证必填字段
    if (settings.enabled) {
      if (!settings.serverUrl) {
        showMessage('error', '请填写服务器地址');
        return;
      }
      if (!settings.authKey) {
        showMessage('error', '请填写认证密钥');
        return;
      }
    }

    if (!config) {
      showMessage('error', '配置未加载');
      return;
    }

    setIsLoading(true);
    try {
      // 更新完整配置
      const updatedConfig = {
        ...config,
        WatchRoomConfig: {
          enabled: settings.enabled,
          serverUrl: settings.serverUrl.trim(),
          authKey: settings.authKey.trim(),
        },
      };

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      // 检查响应是否有内容
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || '服务器返回了非JSON响应');
      }

      if (!response.ok) {
        throw new Error(data.error || '保存失败');
      }

      showMessage('success', '观影室配置已保存');
      await refreshConfig();
    } catch (error: any) {
      console.error('保存配置失败:', error);
      showMessage('error', error.message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取服务器统计信息
  // useSaved=true: 使用已保存的配置（用于自动刷新）
  // useSaved=false: 使用当前输入的配置（用于手动刷新测试）
  const fetchStats = async (useSaved = false) => {
    const configToUse = useSaved ? savedConfig : settings;

    if (!configToUse || !configToUse.enabled || !configToUse.serverUrl) {
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const response = await fetch('/api/watch-room/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: configToUse.serverUrl.trim(),
          authKey: configToUse.authKey.trim(),
        }),
      });
      const result = await response.json();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setStatsError(result.error || '获取统计信息失败');
      }
    } catch (error: any) {
      console.error('获取统计信息失败:', error);
      setStatsError(error.message || '获取统计信息失败');
    } finally {
      setStatsLoading(false);
    }
  };

  // 基于已保存的配置自动获取统计信息（不会因为用户输入而触发）
  useEffect(() => {
    if (savedConfig?.enabled && savedConfig.serverUrl && savedConfig.authKey) {
      fetchStats(true); // 使用已保存的配置
      // 每1小时自动刷新
      const interval = setInterval(() => fetchStats(true), 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [savedConfig?.enabled, savedConfig?.serverUrl, savedConfig?.authKey]);

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            观影室配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            配置外部观影室服务器，实现多人同步观影
          </p>
        </div>
        <FluentBadge
          variant={settings.enabled ? 'success' : 'default'}
          size='sm'
          rounded
        >
          <span
            className={`w-1.5 h-1.5 rounded-full inline-block ${settings.enabled ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`}
          />
          {settings.enabled ? '已启用' : '已禁用'}
        </FluentBadge>
      </div>

      {/* Info */}
      <FluentCard
        padding='12px'
        className='flex gap-3 bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30'
      >
        <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center shrink-0'>
          <Info className='w-3.5 h-3.5 text-[#3b82f6]' />
        </span>
        <div className='text-xs leading-relaxed text-gray-700 dark:text-gray-300'>
          <p className='font-semibold text-[#3b82f6] mb-1.5'>关于观影室服务器</p>
          <ul className='space-y-1 list-disc list-inside text-[#6b7280] dark:text-gray-400'>
            <li>观影室需要独立的 WebSocket 服务器，必须单独部署</li>
            <li>推荐部署平台：Fly.io（免费）或 Railway</li>
            <li>
              地址格式：
              <code className='px-1 py-0.5 bg-blue-100 dark:bg-blue-800/30 rounded text-[11px]'>
                https://your-server.com
              </code>
            </li>
            <li>
              <strong>认证密钥</strong>需与服务器 AUTH_KEY 一致，建议强随机密码
            </li>
          </ul>
          <a
            href='https://github.com/tgs9915/watch-room-server'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 mt-2 text-[#3b82f6] hover:underline text-xs font-medium'
          >
            查看部署教程 <ExternalLink className='w-3.5 h-3.5' />
          </a>
        </div>
      </FluentCard>

      {/* Warning */}
      <FluentCard
        padding='12px'
        className='flex gap-3 bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'
      >
        <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0'>
          <AlertTriangle className='w-3.5 h-3.5 text-[#f59e0b]' />
        </span>
        <div className='text-xs leading-relaxed text-gray-700 dark:text-gray-300'>
          <p className='font-semibold text-[#f59e0b] mb-1.5 flex items-center gap-1'>
            <AlertCircle className='w-3.5 h-3.5' /> 重要提示：多站点共享
          </p>
          <ul className='space-y-1 list-disc list-inside text-[#6b7280] dark:text-gray-400'>
            <li>
              <strong>多站点共用同一观影室服务器时，房间列表完全共享</strong>
            </li>
            <li>站点 A 创建的房间，站点 B 用户也能看到和加入</li>
            <li>建议每个站点使用独立服务器；如需跨站可有意共用并在房间名注明站点</li>
          </ul>
        </div>
      </FluentCard>

      {/* Settings form */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#6366f1]/15 flex items-center justify-center'>
            <Users className='w-3.5 h-3.5 text-[#6366f1]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            连接设置
          </h4>
          <FluentBadge variant='info' size='sm' rounded>
            WebSocket
          </FluentBadge>
        </div>

        <div className='flex items-center justify-between gap-4 p-3 rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5'>
          <div>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              启用观影室功能
            </span>
            <p className='text-xs text-[#9ca3af] mt-0.5'>开启后播放页显示观影室入口</p>
          </div>
          <Toggle
            checked={settings.enabled}
            onChange={(checked) => setSettings({ ...settings, enabled: checked })}
          />
        </div>

        <FluentInput
          label='服务器地址 *'
          type='url'
          value={settings.serverUrl}
          onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
          placeholder='https://your-watch-room-server.fly.dev'
          disabled={!settings.enabled}
          fullWidth
        />
        <p className='text-xs text-[#9ca3af] -mt-2'>完整地址，包含 https://</p>

        <FluentInput
          label='认证密钥 *'
          type='password'
          value={settings.authKey}
          onChange={(e) => setSettings({ ...settings, authKey: e.target.value })}
          placeholder='your-secret-auth-key'
          disabled={!settings.enabled}
          fullWidth
        />
        <p className='text-xs text-[#9ca3af] -mt-2'>与服务器 AUTH_KEY 环境变量一致</p>

        {settings.enabled && settings.serverUrl && (
          <div className='space-y-3 pt-1'>
            <FluentButton
              variant='secondary'
              size='sm'
              loading={isTesting}
              onClick={handleTestConnection}
            >
              {isTesting ? '测试中...' : '测试连接'}
            </FluentButton>
            {testResult && (
              <FluentCard
                padding='10px'
                className={`flex items-start gap-2 border ${testResult.success ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'}`}
              >
                {testResult.success ? (
                  <CheckCircle className='w-4 h-4 text-[#22c55e] shrink-0 mt-0.5' />
                ) : (
                  <AlertCircle className='w-4 h-4 text-[#ef4444] shrink-0 mt-0.5' />
                )}
                <span
                  className={`text-xs leading-relaxed ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}
                >
                  {testResult.message}
                </span>
              </FluentCard>
            )}
          </div>
        )}
      </FluentCard>

      {/* Message */}
      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 border ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle className='w-4 h-4 shrink-0' />
          ) : (
            <AlertCircle className='w-4 h-4 shrink-0' />
          )}
          <span className='text-sm'>{message.text}</span>
        </FluentCard>
      )}

      {/* Save bar */}
      <div className='flex items-center gap-3 pt-1 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm'>
        <FluentButton
          variant='primary'
          size='md'
          loading={isLoading}
          onClick={handleSave}
        >
          {isLoading ? '保存中...' : '保存配置'}
        </FluentButton>
        {settings.enabled && (
          <FluentButton
            variant='secondary'
            size='md'
            loading={statsLoading}
            onClick={() => fetchStats(false)}
          >
            {statsLoading ? '刷新中...' : '刷新统计'}
          </FluentButton>
        )}
      </div>

      {/* Stats */}
      {settings.enabled && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#6366f1]/15 flex items-center justify-center'>
              <Users className='w-3.5 h-3.5 text-[#6366f1]' />
            </span>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
              服务器统计
            </h4>
            <FluentBadge variant='default' size='sm' rounded>
              每小时自动刷新
            </FluentBadge>
          </div>

          {statsLoading && !stats && (
            <div className='flex items-center justify-center py-6'>
              <FluentSpinner size='medium' label='加载统计信息...' />
            </div>
          )}

          {statsError && (
            <FluentCard
              padding='12px'
              className='flex gap-2 border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
            >
              <AlertCircle className='w-4 h-4 text-[#ef4444] shrink-0 mt-0.5' />
              <div className='text-xs text-red-700 dark:text-red-300'>
                <p className='font-medium'>无法获取统计信息</p>
                <p className='mt-1 text-red-600 dark:text-red-400'>{statsError}</p>
              </div>
            </FluentCard>
          )}

          {stats && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-xl border p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border-indigo-200/60 dark:border-indigo-800/20'>
                  <div className='text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1'>
                    活跃房间数
                  </div>
                  <div className='text-2xl font-bold text-indigo-900 dark:text-indigo-100'>
                    {stats.totalRooms}
                  </div>
                </div>
                <div className='rounded-xl border p-4 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 border-green-200/60 dark:border-green-800/20'>
                  <div className='text-xs font-medium text-green-700 dark:text-green-300 mb-1'>
                    在线用户数
                  </div>
                  <div className='text-2xl font-bold text-green-900 dark:text-green-100'>
                    {stats.totalMembers}
                  </div>
                </div>
              </div>

              {stats.rooms && stats.rooms.length > 0 ? (
                <div className='space-y-2'>
                  <div className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                    房间详情 ({stats.rooms.length})
                  </div>
                  <div className='space-y-2 max-h-96 overflow-y-auto pr-1'>
                    {stats.rooms.map((room) => {
                      const createdTime = new Date(room.createdAt);
                      const now = new Date();
                      const diffMinutes = Math.floor(
                        (now.getTime() - createdTime.getTime()) / 60000,
                      );
                      const timeText =
                        diffMinutes < 60
                          ? `${diffMinutes}分钟前`
                          : diffMinutes < 1440
                            ? `${Math.floor(diffMinutes / 60)}小时前`
                            : `${Math.floor(diffMinutes / 1440)}天前`;
                      return (
                        <FluentCard
                          key={room.id}
                          hoverable
                          padding='12px'
                          className='space-y-2'
                        >
                          <div className='flex items-start justify-between gap-3'>
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                                {room.name}
                              </p>
                              <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
                                <span className='text-[11px] font-mono text-[#9ca3af]'>
                                  {room.id}
                                </span>
                                {!room.isPublic && (
                                  <FluentBadge variant='default' size='sm' rounded>
                                    私密
                                  </FluentBadge>
                                )}
                                {room.hasPassword && (
                                  <FluentBadge variant='warning' size='sm' rounded>
                                    有密码
                                  </FluentBadge>
                                )}
                              </div>
                            </div>
                            <div className='text-right shrink-0'>
                              <div className='text-sm font-semibold text-gray-900 dark:text-white'>
                                {room.memberCount} 人
                              </div>
                              <div className='text-xs text-[#9ca3af]'>{timeText}</div>
                            </div>
                          </div>
                        </FluentCard>
                      );
                    })}
                  </div>
                </div>
              ) : (
                stats.totalRooms === 0 && (
                  <FluentEmptyState
                    icon={<Users className='h-5 w-5 text-[#9ca3af]' />}
                    title='当前没有活跃的房间'
                    description='等待用户创建新的观影房间'
                  />
                )
              )}
            </div>
          )}
        </FluentCard>
      )}
    </div>
  );
};

export default WatchRoomConfig;
