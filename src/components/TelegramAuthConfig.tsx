'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Save,
  Send,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentInput,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

interface TelegramAuthConfigProps {
  config: {
    enabled: boolean;
    botToken: string;
    botUsername: string;
    autoRegister: boolean;
    buttonSize: 'large' | 'medium' | 'small';
    showAvatar: boolean;
    requestWriteAccess: boolean;
  };
  onSave: (config: TelegramAuthConfigProps['config']) => Promise<void>;
}

export function TelegramAuthConfig({
  config,
  onSave,
}: TelegramAuthConfigProps) {
  const [localConfig, setLocalConfig] = useState(config);
  const {
    message,
    isLoading: saving,
    setIsLoading: setSaving,
    showMessage,
    clearMessage,
  } = useConfigMessage();
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    const changed = JSON.stringify(localConfig) !== JSON.stringify(config);
    setHasChanges(changed);
  }, [localConfig, config]);

  const handleSave = async () => {
    setSaving(true);
    clearMessage();
    try {
      await onSave(localConfig);
      showMessage('success', '保存成功');
      setHasChanges(false);
    } catch (error) {
      showMessage('error', `保存失败: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold flex items-center gap-2'
            style={{ color: 'var(--color-foreground)' }}
          >
            <Send className='w-4 h-4 text-[#2AABEE]' />
            Telegram 登录配置
          </h3>
          <p className='text-xs mt-0.5' style={{ color: 'var(--color-foreground-muted)' }}>
            配置 Telegram Magic Link 登录
          </p>
        </div>
        <FluentBadge variant={localConfig.enabled ? 'success' : 'default'} size='sm' rounded>
          {localConfig.enabled ? '已启用' : '已禁用'}
        </FluentBadge>
      </div>

      {/* Steps */}
      <FluentCard
        padding='12px'
        className='flex gap-3 bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30'
      >
        <span className='w-7 h-7 rounded-lg bg-[#2AABEE]/15 flex items-center justify-center shrink-0'>
          <AlertCircle className='w-3.5 h-3.5 text-[#2AABEE]' />
        </span>
        <div className='text-xs leading-relaxed text-gray-700 dark:text-gray-300'>
          <p className='font-semibold text-[#2AABEE] mb-1.5'>配置步骤</p>
          <ol className='list-decimal list-inside space-y-1 ml-1 text-[#6b7280] dark:text-gray-400'>
            <li>
              与{' '}
              <a
                href='https://t.me/botfather'
                target='_blank'
                rel='noopener noreferrer'
                className='underline hover:text-[#2AABEE] text-[#2AABEE]'
              >
                @BotFather
              </a>{' '}
              对话创建 Bot
            </li>
            <li>复制 Bot Token 和 Bot Username 填入下方</li>
            <li>启用自动注册（推荐）</li>
            <li>启用配置并保存</li>
          </ol>
          <p className='text-xs text-[#2AABEE]/80 mt-2 flex items-center gap-1'>
            <Lightbulb className='w-3.5 h-3.5' /> 用户输入 Telegram 用户名后，Bot 发送登录链接，点击即可登录
          </p>
        </div>
      </FluentCard>

      {/* Webhook warning */}
      <FluentCard
        padding='12px'
        className='flex gap-3 bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'
      >
        <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0'>
          <AlertTriangle className='w-3.5 h-3.5 text-[#f59e0b]' />
        </span>
        <div className='text-xs leading-relaxed text-gray-700 dark:text-gray-300'>
          <p className='font-semibold text-[#f59e0b] mb-1.5 flex items-center gap-1.5'>
            <AlertTriangle className='w-3.5 h-3.5' /> Webhook 绑定限制
          </p>
          <ul className='list-disc list-inside space-y-1 ml-1 text-[#6b7280] dark:text-gray-400'>
            <li>
              <strong>一个 Telegram Bot 只能绑定一个 Webhook URL（域名）</strong>
            </li>
            <li>多个部署不能共用同一个 Bot</li>
            <li>解决方案：为每个部署创建独立 Bot，或仅在一个域名启用</li>
            <li>系统自动将 Webhook 设置到当前域名</li>
          </ul>
        </div>
      </FluentCard>

      {/* Enable */}
      <FluentCard padding='16px'>
        <Toggle
          checked={localConfig.enabled}
          onChange={(checked) =>
            setLocalConfig({ ...localConfig, enabled: checked })
          }
          label='启用 Telegram 登录'
          description='开启后，登录页将显示 Telegram 登录按钮'
        />
      </FluentCard>

      {/* Bot config */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#2AABEE]/15 flex items-center justify-center'>
            <Send className='w-3.5 h-3.5 text-[#2AABEE]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>Bot 配置</h4>
          <FluentBadge variant='default' size='sm' rounded>
            必填
          </FluentBadge>
        </div>

        <FluentInput
          label='Bot Token *'
          type='password'
          value={localConfig.botToken}
          onChange={(e) => setLocalConfig({ ...localConfig, botToken: e.target.value })}
          placeholder='1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'
          fullWidth
        />
        <p className='text-xs text-[#9ca3af] -mt-2'>从 @BotFather 获取</p>

        <FluentInput
          label='Bot Username *'
          value={localConfig.botUsername}
          onChange={(e) => setLocalConfig({ ...localConfig, botUsername: e.target.value })}
          placeholder='YourBotUsername'
          fullWidth
        />
        <p className='text-xs text-[#9ca3af] -mt-2'>不含 @</p>
      </FluentCard>

      {/* User management */}
      <FluentCard padding='16px' className='space-y-3'>
        <h4 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center'>
            <CheckCircle2 className='w-3.5 h-3.5 text-[#8b5cf6]' />
          </span>
          用户管理
        </h4>
        <div className='bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-xl p-3'>
          <Toggle
            checked={localConfig.autoRegister}
            onChange={(checked) =>
              setLocalConfig({ ...localConfig, autoRegister: checked })
            }
            label='自动注册新用户'
            description='首次通过 Telegram 登录的用户将自动创建账号'
          />
        </div>
      </FluentCard>

      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 border text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className='w-4 h-4 shrink-0' />
          ) : (
            <AlertCircle className='w-4 h-4 shrink-0' />
          )}
          <span>{message.text}</span>
        </FluentCard>
      )}

      <div className='flex justify-end pt-1'>
        <FluentButton
          variant='primary'
          size='md'
          icon={<Save className='w-4 h-4' />}
          loading={saving}
          disabled={!hasChanges}
          onClick={handleSave}
        >
          {saving ? '保存中...' : '保存配置'}
        </FluentButton>
      </div>
    </div>
  );
}
