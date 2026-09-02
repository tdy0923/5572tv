'use client';

import { AlertCircle, CheckCircle, Code, Info, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';
import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentInput,
  FluentTextArea,
} from '@/components/FluentUI';

interface CustomAdFilterConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

const CustomAdFilterConfig = ({
  config,
  refreshConfig,
}: CustomAdFilterConfigProps) => {
  const { message, isLoading, setIsLoading, showMessage } = useConfigMessage();

  const [filterSettings, setFilterSettings] = useState({
    customAdFilterCode: '',
    customAdFilterVersion: 1,
  });

  // 从config加载设置
  useEffect(() => {
    if (config?.SiteConfig) {
      setFilterSettings({
        customAdFilterCode: config.SiteConfig.CustomAdFilterCode || '',
        customAdFilterVersion: config.SiteConfig.CustomAdFilterVersion || 1,
      });
    }
  }, [config]);

  // 保存配置
  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (!config) {
        throw new Error('配置未加载');
      }

      // 合并完整的 AdminConfig（参考 MoonTVPlus）
      const updatedConfig = {
        ...config,
        SiteConfig: {
          ...config.SiteConfig,
          CustomAdFilterCode: filterSettings.customAdFilterCode,
          CustomAdFilterVersion: filterSettings.customAdFilterVersion,
        },
      };

      const response = await fetch('/api/admin/config', {
        method: 'POST', // 改为 POST
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig), // 发送完整配置
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || '保存失败');
      }

      showMessage('success', '自定义去广告配置已保存');
      await refreshConfig();
    } catch (error: any) {
      showMessage('error', error.message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置输入框（不保存）
  const handleReset = () => {
    setFilterSettings({
      customAdFilterCode: '',
      customAdFilterVersion: 1,
    });
  };

  // 恢复默认并保存到数据库
  const handleRestoreDefault = async () => {
    setIsLoading(true);
    try {
      if (!config) {
        throw new Error('配置未加载');
      }

      // 合并完整的 AdminConfig，重置自定义去广告配置
      const updatedConfig = {
        ...config,
        SiteConfig: {
          ...config.SiteConfig,
          CustomAdFilterCode: '',
          CustomAdFilterVersion: 1,
        },
      };

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || '恢复默认失败');
      }

      setFilterSettings({
        customAdFilterCode: '',
        customAdFilterVersion: 1,
      });

      showMessage('success', '已恢复为默认配置');
      await refreshConfig();
    } catch (error: any) {
      showMessage('error', error.message || '恢复默认失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 默认示例代码
  const defaultExample = `// 自定义去广告函数
// 参数: type (播放源key), m3u8Content (m3u8文件内容)
// 返回: 过滤后的m3u8内容

function filterAdsFromM3U8(type, m3u8Content) {
  if (!m3u8Content) return '';

  // 广告关键字列表
  const adKeywords = [
    'sponsor',
    '/ad/',
    '/ads/',
    'advert',
    'advertisement',
    '/adjump',
    'redtraffic'
  ];

  // 按行分割M3U8内容
  const lines = m3u8Content.split('\\n');
  const filteredLines = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 跳过 #EXT-X-DISCONTINUITY 标识
    if (line.includes('#EXT-X-DISCONTINUITY')) {
      i++;
      continue;
    }

    // 如果是 EXTINF 行，检查下一行 URL 是否包含广告关键字
    if (line.includes('#EXTINF:')) {
      // 检查下一行 URL 是否包含广告关键字
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const containsAdKeyword = adKeywords.some(keyword =>
          nextLine.toLowerCase().includes(keyword.toLowerCase())
        );

        if (containsAdKeyword) {
          // 跳过 EXTINF 行和 URL 行
          i += 2;
          continue;
        }
      }
    }

    // 保留当前行
    filteredLines.push(line);
    i++;
  }

  return filteredLines.join('\\n');
}`;

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            自定义去广告代码
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            编写自定义 JavaScript 实现更强力的去广告
          </p>
        </div>
        <FluentBadge variant='info' size='sm' rounded>
          <Code className='w-3 h-3' /> JS 注入
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
          <p className='font-semibold text-[#3b82f6] mb-1.5'>使用说明</p>
          <ul className='space-y-1 list-disc list-inside text-[#6b7280] dark:text-gray-400'>
            <li>
              函数名必须为{' '}
              <code className='px-1 py-0.5 bg-blue-100 dark:bg-blue-800/30 rounded text-[11px]'>
                filterAdsFromM3U8
              </code>
            </li>
            <li>
              接收{' '}
              <code className='px-1 py-0.5 bg-blue-100 dark:bg-blue-800/30 rounded text-[11px]'>
                type
              </code>{' '}
              与{' '}
              <code className='px-1 py-0.5 bg-blue-100 dark:bg-blue-800/30 rounded text-[11px]'>
                m3u8Content
              </code>
            </li>
            <li>必须返回过滤后的 m3u8 字符串</li>
            <li>执行失败自动降级为默认规则</li>
            <li>改动后递增版本号以刷新缓存</li>
          </ul>
        </div>
      </FluentCard>

      {/* Version */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center'>
            <Code className='w-3.5 h-3.5 text-[#8b5cf6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
            版本与代码
          </h4>
          <FluentBadge variant='default' size='sm' rounded>
            v{filterSettings.customAdFilterVersion}
          </FluentBadge>
        </div>

        <FluentInput
          label='代码版本号'
          type='number'
          min={1}
          value={String(filterSettings.customAdFilterVersion)}
          onChange={(e) =>
            setFilterSettings({
              ...filterSettings,
              customAdFilterVersion: parseInt(e.target.value) || 1,
            })
          }
          placeholder='1'
          className='max-w-[10rem]'
        />
        <p className='text-xs text-[#9ca3af] -mt-2'>每次修改后建议递增</p>

        <div className='space-y-2'>
          <div className='flex items-center justify-between gap-2'>
            <label className='text-sm font-medium text-[#9ca3af]'>自定义代码</label>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() =>
                setFilterSettings({
                  ...filterSettings,
                  customAdFilterCode: defaultExample,
                })
              }
            >
              载入示例代码
            </FluentButton>
          </div>
          <FluentTextArea
            value={filterSettings.customAdFilterCode}
            onChange={(e) =>
              setFilterSettings({
                ...filterSettings,
                customAdFilterCode: e.target.value,
              })
            }
            placeholder={defaultExample}
            rows={14}
            className='font-mono !text-[13px] leading-relaxed'
          />
          <p className='text-xs text-[#9ca3af]'>仅支持纯 JavaScript，不支持 TypeScript 类型</p>
        </div>
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
      <div className='flex items-center gap-3 pt-1 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur rounded-xl p-3 border border-gray-200 dark:border-white/5 shadow-sm flex-wrap'>
        <FluentButton
          variant='primary'
          size='md'
          icon={<Save className='h-4 w-4' />}
          loading={isLoading}
          onClick={handleSave}
        >
          {isLoading ? '保存中...' : '保存配置'}
        </FluentButton>
        <FluentButton
          variant='secondary'
          size='md'
          icon={<RotateCcw className='h-4 w-4' />}
          disabled={isLoading}
          onClick={handleReset}
        >
          重置
        </FluentButton>
        <FluentButton
          variant='ghost'
          size='md'
          loading={isLoading}
          onClick={handleRestoreDefault}
        >
          恢复默认
        </FluentButton>
      </div>
    </div>
  );
};

export default CustomAdFilterConfig;
