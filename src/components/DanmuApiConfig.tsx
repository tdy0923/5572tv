'use client';

import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Save,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';
import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentInput,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

// 默认弹幕API配置
const DEFAULT_DANMU_API_URL = 'https://smonedanmu.vercel.app';
const DEFAULT_DANMU_API_TOKEN = 'smonetv';

interface DanmuApiConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

const DanmuApiConfig = ({ config, refreshConfig }: DanmuApiConfigProps) => {
  const { message, isLoading, setIsLoading, showMessage } = useConfigMessage();
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,
    useCustomApi: false,
    customApiUrl: '',
    customToken: '',
    timeout: 30,
  });

  // 从 config 加载设置
  useEffect(() => {
    if (config?.DanmuApiConfig) {
      setSettings({
        enabled: config.DanmuApiConfig.enabled ?? true,
        useCustomApi: config.DanmuApiConfig.useCustomApi ?? false,
        customApiUrl: config.DanmuApiConfig.customApiUrl || '',
        customToken: config.DanmuApiConfig.customToken || '',
        timeout: config.DanmuApiConfig.timeout || 30,
      });
    }
  }, [config]);

  // 获取当前使用的 API 地址和 Token
  const getCurrentApiConfig = () => {
    if (settings.useCustomApi && settings.customApiUrl) {
      return {
        url: settings.customApiUrl.replace(/\/$/, ''),
        token: settings.customToken,
      };
    }
    return {
      url: DEFAULT_DANMU_API_URL,
      token: DEFAULT_DANMU_API_TOKEN,
    };
  };

  // 测试 API 连接
  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const { url, token } = getCurrentApiConfig();
      const testUrl = `${url}/${token}/api/v2/search/anime?keyword=流浪地球`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        settings.timeout * 1000,
      );

      const response = await fetch(testUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.animes && data.animes.length > 0) {
        setTestResult({
          success: true,
          message: `连接成功！找到 ${data.animes.length} 个匹配结果`,
          count: data.animes.length,
        });
      } else if (data.errorCode === 0) {
        setTestResult({
          success: true,
          message: '连接成功！API 正常工作',
        });
      } else {
        throw new Error(data.errorMessage || '未知错误');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setTestResult({
          success: false,
          message: `连接超时 (${settings.timeout}秒)`,
        });
      } else {
        setTestResult({
          success: false,
          message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    setIsLoading(true);

    try {
      // 验证自定义 URL 格式
      if (settings.useCustomApi && settings.customApiUrl) {
        try {
          new URL(settings.customApiUrl);
        } catch (error) {
          showMessage('error', '请输入有效的 API 地址');
          return;
        }
      }

      const response = await fetch('/api/admin/danmu-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }

      showMessage('success', '弹幕API配置保存成功！');
      await refreshConfig();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const current = getCurrentApiConfig();

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            弹幕 API 配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            B 站 / 腾讯 / 爱奇艺等平台弹幕聚合
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

      {/* Message */}
      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 border ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle className='h-4 w-4 shrink-0' />
          ) : (
            <AlertCircle className='h-4 w-4 shrink-0' />
          )}
          <span className='text-sm'>{message.text}</span>
        </FluentCard>
      )}

      {/* Info */}
      <FluentCard
        padding='12px'
        className='flex gap-3 bg-purple-50/60 dark:bg-purple-900/10 border-purple-200/60 dark:border-purple-800/30'
      >
        <span className='w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center shrink-0'>
          <MessageSquare className='w-3.5 h-3.5 text-[#8b5cf6]' />
        </span>
        <div className='text-xs leading-relaxed text-gray-700 dark:text-gray-300'>
          <p className='font-semibold text-[#8b5cf6] mb-1'>功能说明</p>
          <p className='text-[#6b7280] dark:text-gray-400'>
            默认使用官方弹幕服务，可自建 <code className='px-1 py-0.5 bg-purple-100 dark:bg-purple-800/30 rounded text-[11px]'>danmu_api</code>{' '}
            获得更好稳定性。
          </p>
          <a
            href='https://github.com/huangxd-/danmu_api'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 mt-2 text-[#8b5cf6] hover:underline font-medium'
          >
            <ExternalLink className='h-3 w-3' /> 弹幕 API 开源项目（Vercel 一键部署）
          </a>
        </div>
      </FluentCard>

      {/* Settings */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center'>
            <MessageSquare className='w-3.5 h-3.5 text-[#8b5cf6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            基础设置
          </h4>
          <FluentBadge variant='info' size='sm' rounded>
            播放器弹幕
          </FluentBadge>
        </div>

        <div className='flex items-center justify-between gap-4 p-3 rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5'>
          <div>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              启用弹幕功能
            </span>
            <p className='text-xs text-[#9ca3af] mt-0.5'>播放器可加载外部弹幕</p>
          </div>
          <Toggle
            checked={settings.enabled}
            onChange={(checked) =>
              setSettings((prev) => ({
                ...prev,
                enabled: checked,
              }))
            }
          />
        </div>

        {settings.enabled && (
          <div className='space-y-4'>
            {/* Current API */}
            <div className='rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5 p-3'>
              <div className='text-xs text-[#9ca3af] mb-1'>当前使用的 API</div>
              <div className='font-mono text-sm text-gray-900 dark:text-white break-all'>
                {current.url}
              </div>
              <div className='flex items-center gap-1.5 mt-2'>
                <FluentBadge variant={settings.useCustomApi ? 'warning' : 'success'} size='sm' rounded>
                  {settings.useCustomApi ? '自定义' : '默认服务'}
                </FluentBadge>
                <span className='text-xs text-[#9ca3af] font-mono'>{current.token}</span>
              </div>
            </div>

            <div className='flex items-center justify-between gap-4 p-3 rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5'>
              <div>
                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                  使用自定义 API
                </span>
                <p className='text-xs text-[#9ca3af] mt-0.5'>关闭则使用默认弹幕服务</p>
              </div>
              <Toggle
                checked={settings.useCustomApi}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    useCustomApi: checked,
                  }))
                }
              />
            </div>

            {settings.useCustomApi && (
              <div className='space-y-3 border-t border-gray-200 dark:border-white/5 pt-4'>
                <FluentInput
                  label='API 地址'
                  type='url'
                  value={settings.customApiUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      customApiUrl: e.target.value,
                    }))
                  }
                  placeholder='https://your-danmu-api.vercel.app'
                  fullWidth
                />
                <FluentInput
                  label='API Token'
                  value={settings.customToken}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      customToken: e.target.value,
                    }))
                  }
                  placeholder='your-token'
                  fullWidth
                />
                <p className='text-xs text-[#9ca3af]'>部署弹幕 API 时设置的 TOKEN 值</p>
              </div>
            )}

            <FluentInput
              label='请求超时时间（秒）'
              type='number'
              min={5}
              max={60}
              value={String(settings.timeout)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setSettings((prev) => ({
                    ...prev,
                    timeout: '' as unknown as number,
                  }));
                  return;
                }
                const num = parseInt(val);
                if (!isNaN(num)) {
                  setSettings((prev) => ({ ...prev, timeout: num }));
                }
              }}
              onBlur={() => {
                const cur = settings.timeout;
                const num =
                  typeof cur === 'number' && !isNaN(cur) ? cur : 30;
                setSettings((prev) => ({
                  ...prev,
                  timeout: Math.max(5, Math.min(60, num)),
                }));
              }}
              className='max-w-[10rem]'
            />
            <p className='text-xs text-[#9ca3af] -mt-2'>范围 5–60 秒，建议 30 秒</p>

            <div className='border-t border-gray-200 dark:border-white/5 pt-4 space-y-3'>
              <FluentButton
                variant='secondary'
                size='sm'
                loading={isTesting}
                onClick={testConnection}
              >
                {isTesting ? '测试中...' : '测试连接'}
              </FluentButton>
              {testResult && (
                <FluentCard
                  padding='10px'
                  className={`flex items-center gap-2 border ${testResult.success ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
                >
                  {testResult.success ? (
                    <CheckCircle className='h-4 w-4 shrink-0' />
                  ) : (
                    <AlertCircle className='h-4 w-4 shrink-0' />
                  )}
                  <span className='text-sm'>{testResult.message}</span>
                </FluentCard>
              )}
            </div>

            <FluentCard
              padding='12px'
              className='bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30 space-y-1.5'
            >
              <h4 className='text-xs font-semibold text-[#3b82f6]'>默认弹幕服务</h4>
              <div className='text-xs text-blue-800 dark:text-blue-300 space-y-1 font-mono'>
                <div>
                  <span className='font-medium'>API：</span>
                  <code className='bg-blue-100 dark:bg-blue-800/30 px-1 rounded break-all'>
                    {DEFAULT_DANMU_API_URL}
                  </code>
                </div>
                <div>
                  <span className='font-medium'>Token：</span>
                  <code className='bg-blue-100 dark:bg-blue-800/30 px-1 rounded'>
                    {DEFAULT_DANMU_API_TOKEN}
                  </code>
                </div>
              </div>
            </FluentCard>
          </div>
        )}
      </FluentCard>

      {/* Save bar */}
      <div className='flex items-center gap-3 pt-1 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm'>
        <FluentButton
          variant='primary'
          size='md'
          icon={<Save className='h-4 w-4' />}
          loading={isLoading}
          onClick={handleSave}
        >
          {isLoading ? '保存中...' : '保存配置'}
        </FluentButton>
      </div>
    </div>
  );
};

export default DanmuApiConfig;
