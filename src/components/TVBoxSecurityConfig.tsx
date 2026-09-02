'use client';

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Copy,
  ExternalLink,
  Lightbulb,
  Shield,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';
import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

interface TVBoxSecurityConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

const TVBoxSecurityConfig = ({
  config,
  refreshConfig,
}: TVBoxSecurityConfigProps) => {
  const { message, isLoading, setIsLoading, showMessage } = useConfigMessage();

  const [securitySettings, setSecuritySettings] = useState({
    enableAuth: false,
    token: '',
    enableIpWhitelist: false,
    allowedIPs: [] as string[],
    enableRateLimit: false,
    rateLimit: 60,
  });

  const [proxySettings, setProxySettings] = useState({
    enabled: false,
    proxyUrl: 'https://corsapi.smone.workers.dev',
  });

  const [customJarUrl, setCustomJarUrl] = useState('');
  const [isTestingJar, setIsTestingJar] = useState(false);
  const [jarTestResult, setJarTestResult] = useState<any>(null);

  const [newIP, setNewIP] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<any>(null);

  useEffect(() => {
    if (config?.TVBoxSecurityConfig) {
      setSecuritySettings({
        enableAuth: config.TVBoxSecurityConfig.enableAuth ?? false,
        token: config.TVBoxSecurityConfig.token || generateToken(),
        enableIpWhitelist:
          config.TVBoxSecurityConfig.enableIpWhitelist ?? false,
        allowedIPs: config.TVBoxSecurityConfig.allowedIPs || [],
        enableRateLimit: config.TVBoxSecurityConfig.enableRateLimit ?? false,
        rateLimit: config.TVBoxSecurityConfig.rateLimit ?? 60,
      });
    } else {
      setSecuritySettings((prev) => ({
        ...prev,
        token: prev.token || generateToken(),
      }));
    }
    if (config?.TVBoxProxyConfig) {
      setProxySettings({
        enabled: config.TVBoxProxyConfig.enabled ?? false,
        proxyUrl:
          config.TVBoxProxyConfig.proxyUrl ||
          'https://corsapi.smone.workers.dev',
      });
    }
    if (config?.CustomSpiderJar) {
      setCustomJarUrl(config.CustomSpiderJar);
    }
  }, [config]);

  function generateToken() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  const handleSave = async () => {
    setIsLoading(true);
    try {
      for (const ip of securitySettings.allowedIPs) {
        if (ip && !isValidIPOrCIDR(ip)) {
          showMessage('error', `无效的IP地址或CIDR格式: ${ip}`);
          return;
        }
      }
      if (securitySettings.rateLimit < 1 || securitySettings.rateLimit > 1000) {
        showMessage('error', '频率限制应在1-1000之间');
        return;
      }
      if (proxySettings.enabled && proxySettings.proxyUrl) {
        try {
          new URL(proxySettings.proxyUrl);
        } catch {
          showMessage('error', '代理URL格式不正确');
          return;
        }
      }
      if (customJarUrl) {
        try {
          new URL(customJarUrl);
        } catch {
          showMessage('error', '自定义 JAR URL 格式不正确');
          return;
        }
      }
      const securityResponse = await fetch('/api/admin/tvbox-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securitySettings),
      });
      if (!securityResponse.ok) {
        const errorData = await securityResponse.json();
        throw new Error(errorData.error || '保存安全配置失败');
      }
      const proxyResponse = await fetch('/api/admin/tvbox-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxySettings),
      });
      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json();
        throw new Error(errorData.error || '保存代理配置失败');
      }
      const jarResponse = await fetch('/api/tvbox/custom-jar', {
        method: customJarUrl ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: customJarUrl
          ? JSON.stringify({ jarUrl: customJarUrl })
          : undefined,
      });
      if (!jarResponse.ok) {
        const errorData = await jarResponse.json();
        throw new Error(errorData.error || '保存自定义 JAR 配置失败');
      }
      showMessage('success', 'TVBox配置保存成功！');
      await refreshConfig();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestJar = async () => {
    if (!customJarUrl.trim()) {
      showMessage('error', '请输入 JAR URL');
      return;
    }
    setIsTestingJar(true);
    setJarTestResult(null);
    try {
      const startTime = Date.now();
      const proxyUrl = `/api/proxy/spider.jar?url=${encodeURIComponent(customJarUrl)}&refresh=1`;
      const response = await fetch(proxyUrl, { method: 'HEAD' });
      const responseTime = Date.now() - startTime;
      const result = {
        success: response.ok,
        url: customJarUrl,
        statusCode: response.status,
        responseTime: responseTime,
        size: response.headers.get('content-length'),
        source: response.headers.get('x-spider-source'),
        cached: response.headers.get('x-spider-cached'),
        spiderSuccess: response.headers.get('x-spider-success'),
        error: response.ok
          ? null
          : `HTTP ${response.status}: ${response.statusText}`,
      };
      setJarTestResult(result);
      if (result.success) {
        showMessage('success', '自定义 JAR 测试成功！');
      } else {
        showMessage('error', '自定义 JAR 测试失败');
      }
    } catch (error) {
      const result = {
        success: false,
        url: customJarUrl,
        error: error instanceof Error ? error.message : '未知错误',
      };
      setJarTestResult(result);
      showMessage('error', '测试失败：' + result.error);
    } finally {
      setIsTestingJar(false);
    }
  };

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
        if (isNaN(num) || num < 0 || num > 255) {
          return false;
        }
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
        '请输入有效的IP地址或CIDR格式 (例如: 192.168.1.100, 192.168.1.0/24, 2001:db8::1, 2001:db8::/32)',
      );
      return;
    }
    if (securitySettings.allowedIPs.includes(newIP.trim())) {
      showMessage('error', 'IP地址已存在');
      return;
    }
    setSecuritySettings((prev) => ({
      ...prev,
      allowedIPs: [...prev.allowedIPs, newIP.trim()],
    }));
    setNewIP('');
  };

  const removeIP = (index: number) => {
    setSecuritySettings((prev) => ({
      ...prev,
      allowedIPs: prev.allowedIPs.filter((_, i) => i !== index),
    }));
  };

  const copyToken = () => {
    navigator.clipboard.writeText(securitySettings.token);
    showMessage('success', 'Token已复制到剪贴板');
  };

  const generateExampleURL = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    let url = `${baseUrl}/api/tvbox`;
    if (securitySettings.enableAuth) {
      url += `?token=${securitySettings.token}`;
    }
    return url;
  };

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    setDiagnoseResult(null);
    try {
      let diagnoseUrl = '/api/tvbox/diagnose';
      if (securitySettings.token) {
        diagnoseUrl += `?token=${encodeURIComponent(securitySettings.token)}`;
      }
      const response = await fetch(diagnoseUrl);
      const result = await response.json();
      setDiagnoseResult(result);
      if (result.pass) {
        showMessage('success', '配置诊断通过！所有检查项正常');
      } else {
        showMessage('error', `发现 ${result.issues?.length || 0} 个问题`);
      }
    } catch (error) {
      showMessage(
        'error',
        '诊断失败：' + (error instanceof Error ? error.message : '未知错误'),
      );
    } finally {
      setIsDiagnosing(false);
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
            <Shield className='w-4 h-4 text-[#3b82f6]' />
            TVBox 安全配置
          </h3>
          <p className='text-xs mt-0.5' style={{ color: 'var(--color-foreground-muted)' }}>
            Token / 白名单 / 限流 / CDN 与自定义 JAR
          </p>
        </div>
        <FluentBadge
          variant={
            securitySettings.enableAuth || securitySettings.enableIpWhitelist ? 'success' : 'default'
          }
          size='sm'
          rounded
        >
          {securitySettings.enableAuth || securitySettings.enableIpWhitelist ? '已启用防护' : '未启用'}
        </FluentBadge>
      </div>

      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 border text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
        >
          {message.type === 'success' ? <CheckCircle className='h-4 w-4 shrink-0' /> : <AlertCircle className='h-4 w-4 shrink-0' />}
          <span>{message.text}</span>
        </FluentCard>
      )}

      {/* Token */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
            <Shield className='w-3.5 h-3.5 text-[#3b82f6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>Token 验证</h4>
          <FluentBadge variant={securitySettings.enableAuth ? 'success' : 'default'} size='sm' rounded>
            {securitySettings.enableAuth ? '已启用' : '已禁用'}
          </FluentBadge>
        </div>

        <Toggle
          checked={securitySettings.enableAuth}
          onChange={(checked) =>
            setSecuritySettings((prev) => ({
              ...prev,
              enableAuth: checked,
            }))
          }
          label='Token 验证'
          description='要求 TVBox 在 URL 中携带 token 参数才能访问'
        />

        {securitySettings.enableAuth && (
          <div className='space-y-3 pt-2'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-[#9ca3af]'>访问 Token</label>
              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='flex-1'>
                  <FluentInput
                    type={showToken ? 'text' : 'password'}
                    value={securitySettings.token}
                    onChange={(e) =>
                      setSecuritySettings((prev) => ({
                        ...prev,
                        token: e.target.value,
                      }))
                    }
                    placeholder='自动生成的 Token'
                    fullWidth
                  />
                </div>
                <FluentButton variant='secondary' size='md' onClick={() => setShowToken(!showToken)}>
                  {showToken ? '隐藏' : '显示'}
                </FluentButton>
              </div>
              <div className='flex gap-2'>
                <FluentButton variant='secondary' size='sm' icon={<Copy className='h-3.5 w-3.5' />} onClick={copyToken}>
                  复制
                </FluentButton>
                <FluentButton
                  variant='ghost'
                  size='sm'
                  onClick={() =>
                    setSecuritySettings((prev) => ({
                      ...prev,
                      token: generateToken(),
                    }))
                  }
                >
                  重新生成
                </FluentButton>
              </div>
            </div>
          </div>
        )}
      </FluentCard>

      {/* IP whitelist */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#22c55e]/15 flex items-center justify-center'>
            <Shield className='w-3.5 h-3.5 text-[#22c55e]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>IP 白名单</h4>
          <FluentBadge variant={securitySettings.enableIpWhitelist ? 'success' : 'default'} size='sm' rounded>
            {securitySettings.allowedIPs.length} 个
          </FluentBadge>
        </div>

        <Toggle
          checked={securitySettings.enableIpWhitelist}
          onChange={(checked) =>
            setSecuritySettings((prev) => ({
              ...prev,
              enableIpWhitelist: checked,
            }))
          }
          label='IP 白名单'
          description='只允许指定 IP 访问 TVBox 接口'
        />

        {securitySettings.enableIpWhitelist && (
          <div className='space-y-3 pt-2'>
            <div className='flex flex-col sm:flex-row gap-2'>
              <div className='flex-1'>
                <FluentInput
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder='192.168.1.100 或 2001:db8::1'
                  onKeyDown={(e) => e.key === 'Enter' && addIP()}
                  fullWidth
                />
              </div>
              <FluentButton variant='primary' size='md' onClick={addIP}>
                添加
              </FluentButton>
            </div>

            {securitySettings.allowedIPs.length > 0 ? (
              <div className='space-y-2'>
                {securitySettings.allowedIPs.map((ip, index) => (
                  <div
                    key={ip}
                    className='flex items-center justify-between gap-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 px-3 py-2 rounded-xl'
                  >
                    <span className='text-gray-900 dark:text-white break-all min-w-0 flex-1 text-xs font-mono'>
                      {ip}
                    </span>
                    <FluentButton variant='danger' size='sm' onClick={() => removeIP(index)} className='!px-2 !min-h-[26px] shrink-0'>
                      删除
                    </FluentButton>
                  </div>
                ))}
              </div>
            ) : (
              <FluentCard padding='10px' className='border-dashed bg-transparent text-center'>
                <span className='text-xs text-[#9ca3af]'>暂未添加白名单 IP</span>
              </FluentCard>
            )}
            <p className='text-xs text-[#9ca3af]'>支持 IPv4 / IPv6 与 CIDR（192.168.1.0/24、2001:db8::/32）</p>
          </div>
        )}
      </FluentCard>

      {/* Rate limit */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center'>
            <AlertTriangle className='w-3.5 h-3.5 text-[#f59e0b]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>访问频率限制</h4>
        </div>
        <Toggle
          checked={securitySettings.enableRateLimit}
          onChange={(checked) =>
            setSecuritySettings((prev) => ({
              ...prev,
              enableRateLimit: checked,
            }))
          }
          label='访问频率限制'
          description='限制每个 IP 每分钟访问次数，防止滥用'
        />
        {securitySettings.enableRateLimit && (
          <div className='space-y-2 pt-2'>
            <FluentInput
              label='每分钟请求次数限制'
              type='number'
              min={1}
              max={1000}
              value={String(securitySettings.rateLimit)}
              onChange={(e) =>
                setSecuritySettings((prev) => ({
                  ...prev,
                  rateLimit: parseInt(e.target.value) || 60,
                }))
              }
              className='max-w-[10rem]'
            />
            <p className='text-xs text-[#9ca3af]'>建议 30-60 次</p>
          </div>
        )}
      </FluentCard>

      {/* Proxy */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center'>
            <Lightbulb className='w-3.5 h-3.5 text-[#8b5cf6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>Cloudflare Worker 代理</h4>
          <FluentBadge variant={proxySettings.enabled ? 'success' : 'default'} size='sm' rounded>
            {proxySettings.enabled ? '已启用' : '已禁用'}
          </FluentBadge>
        </div>
        <Toggle
          checked={proxySettings.enabled}
          onChange={(checked) =>
            setProxySettings((prev) => ({
              ...prev,
              enabled: checked,
            }))
          }
          label='Cloudflare Worker 代理'
          description='为 TVBox 启用 Cloudflare 全球 CDN 加速'
        />
        {proxySettings.enabled && (
          <div className='space-y-3 pt-2'>
            <FluentInput
              label='Cloudflare Worker 地址'
              value={proxySettings.proxyUrl}
              onChange={(e) =>
                setProxySettings((prev) => ({
                  ...prev,
                  proxyUrl: e.target.value,
                }))
              }
              placeholder='https://your-worker.workers.dev'
              fullWidth
            />
            <FluentCard padding='10px' className='flex gap-2 bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30'>
              <Lightbulb className='w-3.5 h-3.5 text-[#3b82f6] shrink-0 mt-0.5' />
              <ul className='text-xs text-[#6b7280] dark:text-gray-400 leading-relaxed list-disc list-inside'>
                <li>通过 Cloudflare 全球 CDN 加速视频源 API 访问</li>
                <li>自动转发 TVBox 的所有 API 参数</li>
                <li>支持自定义 Worker 地址</li>
              </ul>
            </FluentCard>
          </div>
        )}
      </FluentCard>

      {/* URL example */}
      <FluentCard padding='16px' className='space-y-3 bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30'>
        <h4 className='text-sm font-semibold text-[#3b82f6] flex items-center gap-2'>
          <ExternalLink className='w-3.5 h-3.5' /> TVBox 配置 URL
        </h4>
        <div className='bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 px-3 py-2 rounded-xl overflow-x-auto'>
          <code className='block text-xs text-gray-900 dark:text-white break-all leading-relaxed'>{generateExampleURL()}</code>
        </div>
        <div className='flex flex-wrap gap-2'>
          <FluentButton
            variant='secondary'
            size='sm'
            icon={<Copy className='h-3.5 w-3.5' />}
            onClick={() => {
              navigator.clipboard.writeText(generateExampleURL());
              showMessage('success', 'URL已复制到剪贴板');
            }}
          >
            复制
          </FluentButton>
          <FluentButton
            variant='ghost'
            size='sm'
            icon={<ExternalLink className='h-3.5 w-3.5' />}
            onClick={() => window.open(generateExampleURL(), '_blank')}
          >
            测试
          </FluentButton>
          <FluentButton
            variant='secondary'
            size='sm'
            loading={isDiagnosing}
            onClick={handleDiagnose}
            icon={<CheckCircle className='h-3.5 w-3.5' />}
          >
            {isDiagnosing ? '诊断中' : '诊断'}
          </FluentButton>
        </div>
        <p className='text-xs text-[#6b7280] dark:text-gray-400 flex items-center gap-1'>
          <Lightbulb className='w-3.5 h-3.5 text-[#3b82f6]' /> 在 TVBox 中导入此 URL 即可使用，Base64 格式请在 URL 后添加 &format=base64
        </p>
      </FluentCard>

      {/* Diagnose result */}
      {diagnoseResult && (
        <FluentCard
          padding='16px'
          className={`space-y-3 ${diagnoseResult.pass ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30' : 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'}`}
        >
          <div className='flex items-center gap-2'>
            {diagnoseResult.pass ? <CheckCircle className='h-4 w-4 text-[#22c55e]' /> : <AlertCircle className='h-4 w-4 text-[#f59e0b]' />}
            <h4 className={`text-sm font-semibold ${diagnoseResult.pass ? 'text-[#22c55e]' : 'text-[#f59e0b]'}`}>
              诊断结果 {diagnoseResult.pass ? '通过' : '发现问题'}
            </h4>
            <FluentBadge variant={diagnoseResult.pass ? 'success' : 'warning'} size='sm' rounded>
              {diagnoseResult.status}
            </FluentBadge>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
            <div className='flex justify-between bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg px-3 py-2'>
              <span className='text-[#9ca3af]'>Content-Type</span>
              <span className='text-gray-900 dark:text-white break-all ml-2'>{diagnoseResult.contentType || 'N/A'}</span>
            </div>
            <div className='flex justify-between bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg px-3 py-2'>
              <span className='text-[#9ca3af]'>JSON解析</span>
              <span className={diagnoseResult.hasJson ? 'text-[#22c55e]' : 'text-[#ef4444]'}>{diagnoseResult.hasJson ? '成功' : '失败'}</span>
            </div>
            <div className='flex justify-between bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg px-3 py-2'>
              <span className='text-[#9ca3af]'>影视源数量</span>
              <span className='text-gray-900 dark:text-white'>{diagnoseResult.sitesCount}</span>
            </div>
            <div className='flex justify-between bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-lg px-3 py-2'>
              <span className='text-[#9ca3af]'>直播源数量</span>
              <span className='text-gray-900 dark:text-white'>{diagnoseResult.livesCount}</span>
            </div>
          </div>
          {diagnoseResult.configUrl && (
            <div className='bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 p-2 rounded-xl'>
              <div className='text-xs text-[#9ca3af] mb-1'>配置 URL</div>
              <div className='text-xs font-mono break-all text-gray-900 dark:text-white'>{diagnoseResult.configUrl}</div>
            </div>
          )}
          {diagnoseResult.spider && (
            <div className='bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 p-3 rounded-xl text-xs space-y-1'>
              <div className='text-[#9ca3af]'>Spider JAR</div>
              <div className='break-all text-gray-900 dark:text-white font-mono'>{diagnoseResult.spider}</div>
            </div>
          )}
          {diagnoseResult.issues && diagnoseResult.issues.length > 0 && (
            <div className='pt-3 border-t border-amber-200/60 dark:border-amber-800/30'>
              <div className='text-xs font-semibold text-[#f59e0b] mb-2'>发现问题</div>
              <ul className='list-disc list-inside space-y-1 text-xs text-amber-800 dark:text-amber-200'>
                {diagnoseResult.issues.map((issue: string, idx: number) => (
                  <li key={`issue-${idx}`}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </FluentCard>
      )}

      {/* Custom JAR */}
      <FluentCard padding='16px' className='space-y-3 bg-gradient-to-r from-purple-50/60 to-pink-50/60 dark:from-purple-900/10 dark:to-pink-900/10 border-purple-200/60 dark:border-purple-800/30'>
        <h4 className='text-sm font-semibold text-[#8b5cf6] flex items-center gap-2'>
          <Shield className='w-3.5 h-3.5' /> 自定义 Spider JAR URL
        </h4>
        <p className='text-xs text-[#6b7280] dark:text-gray-400'>配置自定义 JAR 文件地址，所有请求将通过本地代理处理</p>
        <div className='flex flex-col sm:flex-row gap-2'>
          <div className='flex-1'>
            <FluentInput
              value={customJarUrl}
              onChange={(e) => setCustomJarUrl(e.target.value)}
              placeholder='https://your-cdn.com/custom_spider.jar'
              fullWidth
            />
          </div>
          <FluentButton
            variant='secondary'
            size='md'
            loading={isTestingJar}
            disabled={!customJarUrl.trim()}
            onClick={handleTestJar}
            icon={<Check className='h-3.5 w-3.5' />}
          >
            {isTestingJar ? '测试中...' : '测试 JAR'}
          </FluentButton>
        </div>
        {jarTestResult && (
          <FluentCard
            padding='12px'
            className={`flex gap-2 border ${jarTestResult.success ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
          >
            {jarTestResult.success ? <CheckCircle className='w-4 h-4 shrink-0 mt-0.5' /> : <XCircle className='w-4 h-4 shrink-0 mt-0.5' />}
            <div className='flex-1 text-xs leading-relaxed'>
              <p className='font-semibold'>{jarTestResult.success ? '测试成功' : '测试失败'}</p>
              {jarTestResult.success ? (
                <div className='mt-1 space-y-0.5 text-xs opacity-80'>
                  <div>响应时间: {jarTestResult.responseTime}ms</div>
                  {jarTestResult.size && <div>大小: {Math.round(parseInt(jarTestResult.size) / 1024)}KB</div>}
                </div>
              ) : (
                <div className='mt-1'>{jarTestResult.error}</div>
              )}
            </div>
          </FluentCard>
        )}
        {isTestingJar && (
          <div className='flex items-center gap-2 py-2'>
            <FluentSpinner size='small' />
            <span className='text-xs text-[#9ca3af]'>正在测试 JAR 可用性...</span>
          </div>
        )}
      </FluentCard>

      <div className='flex justify-end pt-1'>
        <FluentButton variant='primary' size='md' loading={isLoading} onClick={handleSave}>
          {isLoading ? '保存中...' : '保存配置'}
        </FluentButton>
      </div>
    </div>
  );
};

export default TVBoxSecurityConfig;
