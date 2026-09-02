'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Globe,
  KeyRound,
  Lightbulb,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentInput,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

interface OIDCProvider {
  id: string;
  name: string;
  enabled: boolean;
  enableRegistration: boolean;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  jwksUri?: string;
  clientId: string;
  clientSecret: string;
  buttonText: string;
  minTrustLevel: number;
}

interface OIDCAuthConfigProps {
  config: {
    enabled: boolean;
    enableRegistration: boolean;
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    clientId: string;
    clientSecret: string;
    buttonText: string;
    minTrustLevel: number;
  };
  providers?: OIDCProvider[];
  onSave: (config: OIDCAuthConfigProps['config']) => Promise<void>;
  onSaveProviders?: (providers: OIDCProvider[]) => Promise<void>;
}

export function OIDCAuthConfig({
  config,
  providers = [],
  onSave,
  onSaveProviders,
}: OIDCAuthConfigProps) {
  const [mode, setMode] = useState<'legacy' | 'multi'>(
    providers.length > 0 ? 'multi' : 'legacy',
  );
  const [localConfig, setLocalConfig] = useState(config);
  const [localProviders, setLocalProviders] =
    useState<OIDCProvider[]>(providers);
  const [editingProvider, setEditingProvider] = useState<OIDCProvider | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (type === 'success') setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    setLocalConfig(config);
    setLocalProviders(providers);
    setMode(providers.length > 0 ? 'multi' : 'legacy');
  }, [config, providers]);

  useEffect(() => {
    if (mode === 'multi') {
      const changed =
        JSON.stringify(localProviders) !== JSON.stringify(providers);
      setHasChanges(changed);
    } else {
      const changed = JSON.stringify(localConfig) !== JSON.stringify(config);
      setHasChanges(changed);
    }
  }, [localConfig, config, localProviders, providers, mode]);

  const handleDiscover = async () => {
    if (!localConfig.issuer) {
      showMessage('error', '请先输入 Issuer URL');
      return;
    }
    setDiscovering(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/oidc-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuerUrl: localConfig.issuer }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '自动发现失败');
      }
      const data = await response.json();
      setLocalConfig({
        ...localConfig,
        authorizationEndpoint: data.authorization_endpoint || '',
        tokenEndpoint: data.token_endpoint || '',
        userInfoEndpoint: data.userinfo_endpoint || '',
      });
      showMessage('success', '自动发现成功');
    } catch (error) {
      showMessage('error', `自动发现失败: ${(error as Error).message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (mode === 'multi' && onSaveProviders) {
        await onSaveProviders(localProviders);
      } else {
        await onSave(localConfig);
      }
      showMessage('success', '保存成功');
      setHasChanges(false);
    } catch (error) {
      showMessage('error', `保存失败: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProvider = () => {
    const newProvider: OIDCProvider = {
      id: `provider-${Date.now()}`,
      name: '新 Provider',
      enabled: false,
      enableRegistration: false,
      issuer: '',
      authorizationEndpoint: '',
      tokenEndpoint: '',
      userInfoEndpoint: '',
      clientId: '',
      clientSecret: '',
      buttonText: '',
      minTrustLevel: 0,
    };
    setEditingProvider(newProvider);
  };

  const handleSaveProvider = (provider: OIDCProvider) => {
    const existingIndex = localProviders.findIndex((p) => p.id === provider.id);
    if (existingIndex >= 0) {
      const updated = [...localProviders];
      updated[existingIndex] = provider;
      setLocalProviders(updated);
    } else {
      setLocalProviders([...localProviders, provider]);
    }
    setEditingProvider(null);
    setHasChanges(true);
  };

  const handleDeleteProvider = (id: string) => {
    if (confirm('确定要删除这个 Provider 吗？')) {
      setLocalProviders(localProviders.filter((p) => p.id !== id));
      setHasChanges(true);
    }
  };

  const handleMigrateToMulti = () => {
    if (
      confirm(
        '确定要迁移到多 Provider 模式吗？这将使用当前单 Provider 配置创建第一个 Provider。',
      )
    ) {
      const providerId = detectProviderId(localConfig.issuer);
      const newProvider: OIDCProvider = {
        id: providerId,
        name: localConfig.buttonText || providerId.toUpperCase(),
        enabled: localConfig.enabled,
        enableRegistration: localConfig.enableRegistration,
        issuer: localConfig.issuer,
        authorizationEndpoint: localConfig.authorizationEndpoint,
        tokenEndpoint: localConfig.tokenEndpoint,
        userInfoEndpoint: localConfig.userInfoEndpoint,
        clientId: localConfig.clientId,
        clientSecret: localConfig.clientSecret,
        buttonText: localConfig.buttonText,
        minTrustLevel: localConfig.minTrustLevel,
      };
      setLocalProviders([newProvider]);
      setMode('multi');
      setHasChanges(true);
    }
  };

  const detectProviderId = (issuer: string): string => {
    const lowerIssuer = issuer.toLowerCase();
    if (
      lowerIssuer.includes('google') ||
      lowerIssuer.includes('accounts.google.com')
    )
      return 'google';
    if (lowerIssuer.includes('github')) return 'github';
    if (
      lowerIssuer.includes('microsoft') ||
      lowerIssuer.includes('login.microsoftonline.com')
    )
      return 'microsoft';
    if (
      lowerIssuer.includes('linux.do') ||
      lowerIssuer.includes('connect.linux.do')
    )
      return 'linuxdo';
    return 'custom';
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
            <KeyRound className='w-4 h-4 text-[#8b5cf6]' />
            OIDC 登录配置
          </h3>
          <p className='text-xs mt-0.5' style={{ color: 'var(--color-foreground-muted)' }}>
            支持 Google / Microsoft / GitHub / LinuxDo 等多提供商
          </p>
        </div>
        <FluentBadge variant={mode === 'multi' ? 'info' : 'default'} size='sm' rounded>
          {mode === 'multi' ? '多 Provider' : '单 Provider'}
        </FluentBadge>
      </div>

      {/* Mode switch */}
      <FluentCard padding='6px' className='flex gap-1'>
        <FluentButton
          variant={mode === 'legacy' ? 'primary' : 'secondary'}
          size='sm'
          fullWidth
          onClick={() => setMode('legacy')}
        >
          单 Provider 模式（旧版）
        </FluentButton>
        <FluentButton
          variant={mode === 'multi' ? 'primary' : 'secondary'}
          size='sm'
          fullWidth
          onClick={() => setMode('multi')}
        >
          多 Provider 模式（推荐）
        </FluentButton>
      </FluentCard>

      {mode === 'multi' ? (
        <div className='space-y-4'>
          {localProviders.length === 0 && localConfig.enabled && (
            <FluentCard
              padding='12px'
              className='flex gap-3 bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'
            >
              <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0'>
                <AlertCircle className='w-3.5 h-3.5 text-[#f59e0b]' />
              </span>
              <div className='flex-1'>
                <p className='text-sm font-semibold text-[#f59e0b]'>检测到旧版单 Provider 配置</p>
                <p className='text-xs text-[#6b7280] dark:text-gray-400 mt-1'>可迁移到多 Provider 模式同时配置多个登录提供商。</p>
                <FluentButton variant='primary' size='sm' onClick={handleMigrateToMulti} className='mt-3'>
                  立即迁移
                </FluentButton>
              </div>
            </FluentCard>
          )}

          {localProviders.length === 0 ? (
            <FluentCard padding='0'>
              <FluentEmptyState
                icon={<KeyRound className='h-6 w-6 text-[#9ca3af]' />}
                title='暂无 Provider'
                description='点击下方按钮添加第一个 OIDC Provider'
                action={
                  <FluentButton variant='primary' size='sm' icon={<Plus className='w-3.5 h-3.5' />} onClick={handleAddProvider}>
                    添加 Provider
                  </FluentButton>
                }
              />
            </FluentCard>
          ) : (
            <div className='space-y-3'>
              {localProviders.map((provider) => (
                <FluentCard key={provider.id} padding='14px' className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-medium text-gray-900 dark:text-white text-sm'>{provider.name}</span>
                      <FluentBadge variant={provider.enabled ? 'success' : 'default'} size='sm' rounded>
                        {provider.enabled ? '已启用' : '已禁用'}
                      </FluentBadge>
                    </div>
                    <p className='text-xs text-[#9ca3af] mt-1 truncate'>ID: {provider.id} | {provider.issuer || '未配置 Issuer'}</p>
                  </div>
                  <div className='flex gap-2 self-end sm:self-auto shrink-0'>
                    <FluentButton variant='secondary' size='sm' onClick={() => setEditingProvider(provider)} icon={<Edit2 className='w-3.5 h-3.5' />}>
                      编辑
                    </FluentButton>
                    <FluentButton variant='danger' size='sm' onClick={() => handleDeleteProvider(provider.id)} icon={<Trash2 className='w-3.5 h-3.5' />}>
                      删除
                    </FluentButton>
                  </div>
                </FluentCard>
              ))}
            </div>
          )}

          <FluentButton variant='secondary' size='md' fullWidth onClick={handleAddProvider} icon={<Plus className='w-4 h-4' />}>
            添加新 Provider
          </FluentButton>
        </div>
      ) : (
        <div className='space-y-4'>
          <FluentCard padding='12px' className='flex gap-3 bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30'>
            <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center shrink-0'>
              <AlertCircle className='w-3.5 h-3.5 text-[#3b82f6]' />
            </span>
            <div className='text-xs leading-relaxed text-gray-700 dark:text-gray-300'>
              <p className='font-semibold text-[#3b82f6] mb-1'>常见 OIDC 提供商</p>
              <ul className='list-disc list-inside space-y-1 ml-1 text-[#6b7280] dark:text-gray-400'>
                <li>Google: https://accounts.google.com</li>
                <li>Microsoft: https://login.microsoftonline.com/common/v2.0</li>
                <li>LinuxDo: https://connect.linux.do</li>
                <li>自建 Keycloak: https://your-domain/realms/your-realm</li>
              </ul>
              <p className='text-xs text-[#3b82f6]/80 mt-2 flex items-center gap-1'>
                <Lightbulb className='w-3.5 h-3.5' /> 填写 Issuer 后点击“自动发现”自动获取端点
              </p>
            </div>
          </FluentCard>

          <FluentCard padding='16px' className='space-y-4'>
            <div className='space-y-3'>
              <Toggle checked={localConfig.enabled} onChange={(v) => setLocalConfig({ ...localConfig, enabled: v })} label='启用 OIDC 登录' description='登录页将显示 OIDC 登录按钮' />
              <Toggle checked={localConfig.enableRegistration} onChange={(v) => setLocalConfig({ ...localConfig, enableRegistration: v })} label='启用 OIDC 注册' description='允许通过 OIDC 自动注册新用户' />
            </div>

            <div className='space-y-3 pt-2 border-t border-gray-200 dark:border-white/5'>
              <div className='flex flex-col sm:flex-row gap-2 items-end'>
                <div className='flex-1 w-full'>
                  <FluentInput label='OIDC Issuer URL（可选）' value={localConfig.issuer || ''} onChange={(e) => setLocalConfig({ ...localConfig, issuer: e.target.value })} placeholder='https://accounts.google.com' fullWidth />
                </div>
                <FluentButton variant='secondary' size='md' icon={<Globe className='w-3.5 h-3.5' />} loading={discovering} disabled={!localConfig.issuer} onClick={handleDiscover} className='shrink-0'>
                  {discovering ? '发现中...' : '自动发现'}
                </FluentButton>
              </div>
              <FluentInput label='Authorization Endpoint *' value={localConfig.authorizationEndpoint || ''} onChange={(e) => setLocalConfig({ ...localConfig, authorizationEndpoint: e.target.value })} placeholder='https://accounts.google.com/o/oauth2/v2/auth' fullWidth />
              <FluentInput label='Token Endpoint *' value={localConfig.tokenEndpoint || ''} onChange={(e) => setLocalConfig({ ...localConfig, tokenEndpoint: e.target.value })} placeholder='https://oauth2.googleapis.com/token' fullWidth />
              <FluentInput label='UserInfo Endpoint *' value={localConfig.userInfoEndpoint || ''} onChange={(e) => setLocalConfig({ ...localConfig, userInfoEndpoint: e.target.value })} placeholder='https://openidconnect.googleapis.com/v1/userinfo' fullWidth />
              <FluentInput label='Client ID *' value={localConfig.clientId || ''} onChange={(e) => setLocalConfig({ ...localConfig, clientId: e.target.value })} placeholder='your-client-id.apps.googleusercontent.com' fullWidth />
              <FluentInput label='Client Secret *' type='password' value={localConfig.clientSecret || ''} onChange={(e) => setLocalConfig({ ...localConfig, clientSecret: e.target.value })} placeholder='••••••••••••••••' fullWidth />

              <div className='space-y-2'>
                <label className='text-sm font-medium text-[#9ca3af]'>Redirect URI（回调地址）</label>
                <div className='flex gap-2'>
                  <div className='flex-1'>
                    <FluentInput value={typeof window !== 'undefined' ? `${window.location.origin}/api/auth/oidc/callback` : ''} readOnly fullWidth />
                  </div>
                  <FluentButton
                    variant='secondary'
                    size='md'
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/api/auth/oidc/callback`);
                        showMessage('success', '已复制到剪贴板');
                      }
                    }}
                  >
                    复制
                  </FluentButton>
                </div>
                <p className='text-xs text-[#9ca3af]'>在 OIDC 提供商中添加此地址为允许的重定向 URI</p>
              </div>

              <FluentInput label='登录按钮文字' value={localConfig.buttonText || ''} onChange={(e) => setLocalConfig({ ...localConfig, buttonText: e.target.value })} placeholder='使用 Google 登录' fullWidth />
              <FluentInput label='最低信任等级（LinuxDo 专用）' type='number' value={String(localConfig.minTrustLevel || 0)} onChange={(e) => setLocalConfig({ ...localConfig, minTrustLevel: parseInt(e.target.value) || 0 })} placeholder='0' className='max-w-[12rem]' />
            </div>
          </FluentCard>
        </div>
      )}

      {message && (
        <FluentCard padding='12px' className={`flex items-center gap-2 border text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}>
          {message.type === 'success' ? <CheckCircle2 className='w-4 h-4 shrink-0' /> : <AlertCircle className='w-4 h-4 shrink-0' />}
          <span>{message.text}</span>
        </FluentCard>
      )}

      <div className='flex justify-end pt-1'>
        <FluentButton variant='primary' size='md' icon={<Save className='w-4 h-4' />} loading={saving} disabled={!hasChanges} onClick={handleSave}>
          {saving ? '保存中...' : '保存配置'}
        </FluentButton>
      </div>

      {editingProvider && (
        <ProviderEditModal provider={editingProvider} onSave={handleSaveProvider} onCancel={() => setEditingProvider(null)} />
      )}
    </div>
  );
}

function ProviderEditModal({
  provider,
  onSave,
  onCancel,
}: {
  provider: OIDCProvider;
  onSave: (provider: OIDCProvider) => void;
  onCancel: () => void;
}) {
  const [localProvider, setLocalProvider] = useState(provider);
  const [discovering, setDiscovering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDiscover = async () => {
    if (!localProvider.issuer) {
      setMessage({ type: 'error', text: '请先输入 Issuer URL' });
      return;
    }
    setDiscovering(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/oidc-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuerUrl: localProvider.issuer }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '自动发现失败');
      }
      const data = await response.json();
      setLocalProvider({
        ...localProvider,
        authorizationEndpoint: data.authorization_endpoint || '',
        tokenEndpoint: data.token_endpoint || '',
        userInfoEndpoint: data.userinfo_endpoint || '',
        jwksUri: data.jwks_uri || '',
      });
      setMessage({ type: 'success', text: '自动发现成功' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `自动发现失败: ${(error as Error).message}` });
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex items-end md:items-center justify-center min-h-screen md:min-h-full p-0 md:p-4'>
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' onClick={onCancel} />
        <FluentCard padding='0' className='relative w-full md:min-w-[min(600px,90vw)] md:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden !rounded-t-2xl md:!rounded-xl'>
          <div className='flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-white/5 shrink-0'>
            <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>{provider.name === '新 Provider' ? '添加 Provider' : '编辑 Provider'}</h3>
            <FluentButton variant='ghost' size='sm' onClick={onCancel} className='!p-1.5 !min-h-0'>
              ✕
            </FluentButton>
          </div>

          <div className='overflow-y-auto flex-1 p-4 md:p-5 space-y-4'>
            <FluentInput label='Provider ID *' value={localProvider.id} onChange={(e) => setLocalProvider({ ...localProvider, id: e.target.value })} placeholder='google, github, linuxdo, custom...' fullWidth />
            <FluentCard padding='10px' className='bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'>
              <p className='text-xs font-semibold text-[#f59e0b] flex items-center gap-1 mb-1'>
                <AlertTriangle className='w-3.5 h-3.5' /> ID 规则
              </p>
              <p className='text-xs text-[#6b7280] dark:text-gray-400 leading-relaxed'>已知提供商需用固定 ID：<code className='px-1 py-0.5 bg-amber-100 dark:bg-amber-800/30 rounded text-[11px]'>google</code> <code className='px-1 py-0.5 bg-amber-100 dark:bg-amber-800/30 rounded text-[11px]'>github</code> <code className='px-1 py-0.5 bg-amber-100 dark:bg-amber-800/30 rounded text-[11px]'>microsoft</code> <code className='px-1 py-0.5 bg-amber-100 dark:bg-amber-800/30 rounded text-[11px]'>linuxdo</code> 等；自定义需唯一。</p>
            </FluentCard>

            <FluentInput label='显示名称 *' value={localProvider.name} onChange={(e) => setLocalProvider({ ...localProvider, name: e.target.value })} placeholder='Google' fullWidth />

            <div className='space-y-3'>
              <Toggle checked={localProvider.enabled} onChange={(v) => setLocalProvider({ ...localProvider, enabled: v })} label='启用此 Provider' description='登录页将显示此 Provider' />
              <Toggle checked={localProvider.enableRegistration} onChange={(v) => setLocalProvider({ ...localProvider, enableRegistration: v })} label='允许注册' description='允许通过此 Provider 自动注册新用户' />
            </div>

            <div className='flex gap-2 items-end'>
              <div className='flex-1'>
                <FluentInput label='Issuer URL（可选）' value={localProvider.issuer} onChange={(e) => setLocalProvider({ ...localProvider, issuer: e.target.value })} placeholder='https://accounts.google.com' fullWidth />
              </div>
              <FluentButton variant='secondary' size='md' loading={discovering} disabled={!localProvider.issuer} onClick={handleDiscover} icon={<Globe className='w-3.5 h-3.5' />} className='shrink-0'>
                {discovering ? '发现中...' : '自动发现'}
              </FluentButton>
            </div>

            <FluentInput label='Authorization Endpoint *' value={localProvider.authorizationEndpoint} onChange={(e) => setLocalProvider({ ...localProvider, authorizationEndpoint: e.target.value })} placeholder='https://accounts.google.com/o/oauth2/v2/auth' fullWidth />
            <FluentInput label='Token Endpoint *' value={localProvider.tokenEndpoint} onChange={(e) => setLocalProvider({ ...localProvider, tokenEndpoint: e.target.value })} placeholder='https://oauth2.googleapis.com/token' fullWidth />
            {localProvider.id.toLowerCase() !== 'apple' ? (
              <FluentInput label='UserInfo Endpoint *' value={localProvider.userInfoEndpoint} onChange={(e) => setLocalProvider({ ...localProvider, userInfoEndpoint: e.target.value })} placeholder='https://openidconnect.googleapis.com/v1/userinfo' fullWidth />
            ) : (
              <FluentInput label='JWKS URI *' value={localProvider.jwksUri || ''} onChange={(e) => setLocalProvider({ ...localProvider, jwksUri: e.target.value })} placeholder='https://appleid.apple.com/auth/keys' fullWidth />
            )}
            <FluentInput label='Client ID *' value={localProvider.clientId} onChange={(e) => setLocalProvider({ ...localProvider, clientId: e.target.value })} placeholder='your-client-id' fullWidth />
            <FluentInput label='Client Secret *' type='password' value={localProvider.clientSecret} onChange={(e) => setLocalProvider({ ...localProvider, clientSecret: e.target.value })} placeholder='••••••••••••••••' fullWidth />

            <div className='space-y-2'>
              <label className='text-sm font-medium text-[#9ca3af]'>Redirect URI（回调地址）</label>
              <div className='flex gap-2'>
                <div className='flex-1'>
                  <FluentInput value={typeof window !== 'undefined' ? `${window.location.origin}/api/auth/oidc/callback` : ''} readOnly fullWidth />
                </div>
                <FluentButton
                  variant='secondary'
                  size='md'
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(`${window.location.origin}/api/auth/oidc/callback`);
                      setMessage({ type: 'success', text: '已复制到剪贴板' });
                      setTimeout(() => setMessage(null), 2000);
                    }
                  }}
                >
                  复制
                </FluentButton>
              </div>
            </div>

            <FluentInput label='登录按钮文字' value={localProvider.buttonText} onChange={(e) => setLocalProvider({ ...localProvider, buttonText: e.target.value })} placeholder='使用 Google 登录' fullWidth />
            <FluentInput label='最低信任等级（LinuxDo 专用）' type='number' value={String(localProvider.minTrustLevel)} onChange={(e) => setLocalProvider({ ...localProvider, minTrustLevel: parseInt(e.target.value) || 0 })} placeholder='0' className='max-w-[12rem]' />

            {message && (
              <FluentCard padding='10px' className={`flex items-center gap-2 border text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}>
                {message.type === 'success' ? <CheckCircle2 className='w-4 h-4 shrink-0' /> : <AlertCircle className='w-4 h-4 shrink-0' />}
                <span>{message.text}</span>
              </FluentCard>
            )}
          </div>

          <div className='flex gap-3 p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] shrink-0'>
            <FluentButton variant='secondary' size='md' fullWidth onClick={onCancel}>
              取消
            </FluentButton>
            <FluentButton variant='primary' size='md' fullWidth icon={<Save className='w-4 h-4' />} onClick={() => onSave(localProvider)}>
              保存
            </FluentButton>
          </div>
        </FluentCard>
      </div>
    </div>
  );
}
