'use client';

import { AlertCircle, CheckCircle, Shield } from 'lucide-react';
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

interface TrustedNetworkConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

const TrustedNetworkConfig = ({
  config,
  refreshConfig,
}: TrustedNetworkConfigProps) => {
  const { message, isLoading, setIsLoading, showMessage } = useConfigMessage();

  const [settings, setSettings] = useState({
    enabled: false,
    trustedIPs: [] as string[],
  });

  const [envConfig, setEnvConfig] = useState<{
    hasEnvConfig: boolean;
    trustedIPs: string[];
  } | null>(null);

  const [newIP, setNewIP] = useState('');

  useEffect(() => {
    if (config?.TrustedNetworkConfig) {
      setSettings({
        enabled: config.TrustedNetworkConfig.enabled ?? false,
        trustedIPs: config.TrustedNetworkConfig.trustedIPs || [],
      });
    }
  }, [config]);

  useEffect(() => {
    const fetchEnvConfig = async () => {
      try {
        const response = await fetch('/api/admin/trusted-network');
        if (response.ok) {
          const result = await response.json();
          setEnvConfig(result.data?.envConfig || null);
        }
      } catch {
        // ignore
      }
    };
    fetchEnvConfig();
  }, []);

  function isValidIPOrCIDR(ip: string): boolean {
    const trimmed = ip.trim();
    if (trimmed === '*') return true;
    const [ipPart, maskPart] = trimmed.split('/');
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex =
      /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$|^::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{0,4}$|^([0-9a-fA-F]{1,4}:){1,6}:$|^::$/;
    const isIPv4 = ipv4Regex.test(ipPart);
    const isIPv6 = ipv6Regex.test(ipPart);
    if (!isIPv4 && !isIPv6) return false;
    if (isIPv4) {
      const parts = ipPart.split('.');
      for (const part of parts) {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 0 || num > 255) return false;
      }
    }
    if (maskPart) {
      const mask = parseInt(maskPart, 10);
      if (isNaN(mask) || mask < 0) return false;
      if (isIPv4 && mask > 32) return false;
      if (isIPv6 && mask > 128) return false;
    }
    return true;
  }

  const addIP = () => {
    if (!newIP.trim()) return;
    if (!isValidIPOrCIDR(newIP.trim())) {
      showMessage(
        'error',
        '请输入有效的IP地址或CIDR格式 (例如: 192.168.0.0/16, 10.0.0.0/8, 2001:db8::/32)',
      );
      return;
    }
    if (settings.trustedIPs.includes(newIP.trim())) {
      showMessage('error', 'IP地址已存在');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      trustedIPs: [...prev.trustedIPs, newIP.trim()],
    }));
    setNewIP('');
  };

  const removeIP = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      trustedIPs: prev.trustedIPs.filter((_, i) => i !== index),
    }));
  };

  const addCommonPrivateRange = (cidr: string) => {
    if (settings.trustedIPs.includes(cidr)) {
      showMessage('error', '该网段已存在');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      trustedIPs: [...prev.trustedIPs, cidr],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      for (const ip of settings.trustedIPs) {
        if (ip && !isValidIPOrCIDR(ip)) {
          showMessage('error', `无效的IP地址或CIDR格式: ${ip}`);
          return;
        }
      }
      const response = await fetch('/api/admin/trusted-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }
      showMessage('success', '信任网络配置保存成功！立即生效');
      await refreshConfig();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsLoading(false);
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
            <Shield className='w-4 h-4 text-[#22c55e]' />
            信任网络配置
          </h3>
          <p className='text-xs mt-0.5' style={{ color: 'var(--color-foreground-muted)' }}>
            内网免登录自动授权站长权限
          </p>
        </div>
        <FluentBadge variant={settings.enabled ? 'success' : 'default'} size='sm' rounded>
          {settings.enabled ? '已启用' : '已禁用'}
        </FluentBadge>
      </div>

      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 border text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
        >
          {message.type === 'success' ? (
            <CheckCircle className='h-4 w-4 shrink-0' />
          ) : (
            <AlertCircle className='h-4 w-4 shrink-0' />
          )}
          <span>{message.text}</span>
        </FluentCard>
      )}

      {/* Env config notice */}
      {envConfig?.hasEnvConfig && (
        <FluentCard
          padding='12px'
          className='bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30 space-y-2'
        >
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center shrink-0'>
              <Shield className='w-3.5 h-3.5 text-[#3b82f6]' />
            </span>
            <h4 className='text-sm font-semibold text-[#3b82f6]'>环境变量配置已检测</h4>
            <FluentBadge variant='info' size='sm' rounded>
              TRUSTED_NETWORK_IPS
            </FluentBadge>
          </div>
          <p className='text-xs text-gray-600 dark:text-gray-400 leading-relaxed'>
            通过环境变量 <code className='px-1 py-0.5 bg-blue-100 dark:bg-blue-800/30 rounded text-[11px]'>TRUSTED_NETWORK_IPS</code> 配置，优先级高于数据库配置。
          </p>
          <div className='flex flex-wrap gap-1.5'>
            {envConfig.trustedIPs.map((ip) => (
              <FluentBadge key={ip} variant='info' size='sm' rounded>
                {ip}
              </FluentBadge>
            ))}
          </div>
        </FluentCard>
      )}

      {/* Enable */}
      <FluentCard padding='16px' className='space-y-4'>
        <Toggle
          checked={settings.enabled}
          onChange={(checked) =>
            setSettings((prev) => ({
              ...prev,
              enabled: checked,
            }))
          }
          label='启用信任网络模式'
          description='来自信任IP段的访问将自动跳过登录认证，适用于内网部署场景'
        />

        {settings.enabled && (
          <div className='space-y-4 pt-2'>
            <FluentCard
              padding='10px'
              className='flex gap-2 bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'
            >
              <AlertCircle className='h-4 w-4 text-[#f59e0b] shrink-0 mt-0.5' />
              <p className='text-xs leading-relaxed text-amber-800 dark:text-amber-200'>
                <strong>注意：</strong> 启用后来自信任IP段的请求将自动获得站长(owner)权限，无需登录。请仅添加受信任的内网段，切勿将公网IP加入。
              </p>
            </FluentCard>

            {/* Quick add */}
            <div>
              <label className='block text-sm font-medium text-[#9ca3af] mb-2'>快捷添加常见内网段</label>
              <div className='grid grid-cols-2 sm:flex sm:flex-wrap gap-2'>
                {[
                  { label: '10.0.0.0/8', desc: 'A类私网' },
                  { label: '172.16.0.0/12', desc: 'B类私网' },
                  { label: '192.168.0.0/16', desc: 'C类私网' },
                  { label: '127.0.0.1', desc: '本机' },
                ].map(({ label, desc }) => (
                  <FluentButton
                    key={label}
                    variant='secondary'
                    size='sm'
                    disabled={settings.trustedIPs.includes(label)}
                    onClick={() => addCommonPrivateRange(label)}
                    className='justify-center'
                  >
                    {label} <span className='text-[#9ca3af]'>({desc})</span>
                  </FluentButton>
                ))}
              </div>
            </div>

            {/* Input */}
            <div>
              <label className='block text-sm font-medium text-[#9ca3af] mb-2'>信任的IP/CIDR列表</label>
              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='flex-1'>
                  <FluentInput
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    placeholder='192.168.0.0/16 或 2001:db8::/32'
                    onKeyDown={(e) => e.key === 'Enter' && addIP()}
                    fullWidth
                  />
                </div>
                <FluentButton variant='primary' size='md' onClick={addIP}>
                  添加
                </FluentButton>
              </div>
            </div>

            {/* List */}
            {settings.trustedIPs.length > 0 ? (
              <div className='space-y-2'>
                {settings.trustedIPs.map((ip) => (
                  <div
                    key={ip}
                    className='flex items-center justify-between gap-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 px-3 py-2 rounded-xl'
                  >
                    <span className='font-mono text-xs text-gray-900 dark:text-white break-all'>{ip}</span>
                    <FluentButton
                      variant='danger'
                      size='sm'
                      onClick={() => removeIP(settings.trustedIPs.indexOf(ip))}
                      className='!px-2 !min-h-[26px] shrink-0'
                    >
                      删除
                    </FluentButton>
                  </div>
                ))}
              </div>
            ) : (
              <FluentCard padding='12px' className='border-dashed bg-transparent'>
                <p className='text-xs text-[#9ca3af] text-center'>暂未添加任何信任IP，请输入后点击添加</p>
              </FluentCard>
            )}

            <p className='text-xs text-[#9ca3af]'>支持 IPv4 / IPv6 与 CIDR，例如 192.168.1.100、2001:db8::/32</p>

            <FluentCard padding='12px' className='bg-gray-50 dark:bg-white/[0.03] space-y-1.5'>
              <h4 className='text-xs font-semibold text-gray-700 dark:text-gray-300'>使用说明</h4>
              <ul className='text-xs text-[#9ca3af] space-y-1 list-disc list-inside leading-relaxed'>
                <li>数据库配置：添加后保存立即生效</li>
                <li>
                  环境变量：<code className='px-1 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-[11px]'>TRUSTED_NETWORK_IPS=192.168.0.0/16</code>（优先级更高）
                </li>
                <li>信任IP段内设备自动获得站长权限，非信任IP仍需登录</li>
              </ul>
            </FluentCard>
          </div>
        )}
      </FluentCard>

      {/* Save */}
      <div className='flex justify-end pt-1'>
        <FluentButton variant='primary' size='md' loading={isLoading} onClick={handleSave}>
          {isLoading ? '保存中...' : '保存配置'}
        </FluentButton>
      </div>
    </div>
  );
};

export default TrustedNetworkConfig;
