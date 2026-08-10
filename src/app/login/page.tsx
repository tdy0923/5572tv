'use client';

import { Eye, EyeOff, Lock, Sparkles, User, UserPlus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AppDownloads } from '@/components/auth/AppDownloads';
import { FormField } from '@/components/auth/FormField';
import { QuickLoginGrid } from '@/components/auth/QuickLoginGrid';
import { TelegramLogin } from '@/components/auth/TelegramLogin';
import { AuthShell } from '@/components/AuthShell';

interface OIDCProviderItem {
  id: string;
  name: string;
  buttonText: string;
  issuer: string;
}

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const shouldAskUsername =
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'localstorage';

  // 显示 URL 中的错误参数（OIDC 回调失败/会话过期等重定向过来）
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(urlError);
    }
  }, [searchParams]);

  // Telegram 登录状态
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotUsername, setTelegramBotUsername] = useState('');
  const [telegramRequestAccess, setTelegramRequestAccess] = useState(false);

  // OIDC 状态
  const [oidcProviders, setOidcProviders] = useState<OIDCProviderItem[]>([]);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcButtonText, setOidcButtonText] = useState('使用OIDC登录');
  const [oidcIssuer, setOidcIssuer] = useState<string>('');

  // 获取 Telegram / OIDC 服务器配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/server-config');
        const data = await response.json();
        if (data.TelegramAuthConfig?.enabled) {
          setTelegramEnabled(true);
          if (data.TelegramAuthConfig.botUsername) {
            setTelegramBotUsername(data.TelegramAuthConfig.botUsername);
          }
          if (typeof data.TelegramAuthConfig.requestWriteAccess === 'boolean') {
            setTelegramRequestAccess(
              data.TelegramAuthConfig.requestWriteAccess,
            );
          }
        }
        if (data.OIDCProviders && data.OIDCProviders.length > 0) {
          setOidcProviders(data.OIDCProviders);
          setOidcEnabled(true);
        } else if (data.OIDCConfig?.enabled) {
          setOidcEnabled(true);
          setOidcButtonText(data.OIDCConfig.buttonText || '使用OIDC登录');
          setOidcIssuer(data.OIDCConfig.issuer || '');
        }
      } catch {
        // 配置拉取失败时静默，密码登录始终可用
      }
    };
    fetchConfig();
  }, []);

  // 记住上次登录的用户名
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (shouldAskUsername) {
      try {
        const saved = localStorage.getItem('lastLoginUsername');
        if (saved) {
          setUsername(saved);
          setRememberMe(true);
        }
      } catch {
        // ignore
      }
    }
  }, [shouldAskUsername]);

  // 处理提交，成功后记住用户名
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password || (shouldAskUsername && !username)) return;

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          ...(shouldAskUsername ? { username } : {}),
        }),
      });

      if (res.ok) {
        try {
          if (shouldAskUsername) {
            if (rememberMe) {
              localStorage.setItem('lastLoginUsername', username);
            } else {
              localStorage.removeItem('lastLoginUsername');
            }
          }
        } catch {
          // ignore
        }

        const loginTime = Date.now();
        try {
          await fetch('/api/user/my-stats', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginTime }),
          });
          localStorage.setItem('lastRecordedLogin', loginTime.toString());
        } catch {
          // 登入时间记录失败不影响正常登录流程
        }

        let redirect = searchParams.get('redirect') || '/';
        if (!redirect.startsWith('/') || redirect.startsWith('//')) {
          redirect = '/';
        }
        router.replace(redirect);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          res.status === 401
            ? (data.error ?? '密码错误')
            : (data.error ?? '服务器错误'),
        );
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 一键 Telegram 登录：打开机器人深链 -> 用户按 /start -> 轮询到确认 -> 完成登录
  // 发起 OIDC 登录（多 Provider 带 provider 参数；旧版单 Provider 不带）
  const startOIDC = (providerId: string) => {
    const redirect = searchParams.get('redirect') || '/';
    const safeRedirect =
      redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
    const params =
      providerId === 'oidc'
        ? `redirect=${encodeURIComponent(safeRedirect)}`
        : `provider=${providerId}&redirect=${encodeURIComponent(safeRedirect)}`;
    window.location.href = `/api/auth/oidc/login?${params}`;
  };

  // 旧版单 Provider 配置兜底为一个通用项
  const effectiveProviders: OIDCProviderItem[] =
    oidcEnabled && oidcProviders.length === 0
      ? [
          {
            id: 'oidc',
            name: 'OIDC',
            buttonText: oidcButtonText,
            issuer: oidcIssuer,
          },
        ]
      : oidcProviders;

  const redirectPath = (() => {
    const p = searchParams.get('redirect') || '/';
    return p.startsWith('/') && !p.startsWith('//') ? p : '/';
  })();

  return (
    <AuthShell
      title='登录'
      subtitle='欢迎回来，继续访问您的内容与播放记录'
      icon={<Sparkles className='h-6 w-6 text-white' />}
      footer={<AppDownloads />}
    >
      <QuickLoginGrid
        oidcProviders={effectiveProviders}
        oidcEnabled={oidcEnabled && shouldAskUsername}
        telegramEnabled={telegramEnabled}
        onOIDCStart={startOIDC}
      >
        {telegramBotUsername && (
          <div className='flex flex-col items-center pt-1'>
            <TelegramLogin
              botUsername={telegramBotUsername}
              redirect={redirectPath}
              requestAccess={telegramRequestAccess}
            />
            <p className='mt-1.5 text-center text-[11px] text-gray-500 dark:text-gray-400'>
              点击上方按钮，授权后自动登录
            </p>
          </div>
        )}
      </QuickLoginGrid>

      <form
        onSubmit={handleSubmit}
        className='auth-field-grid space-y-4 sm:space-y-5'
      >
        {shouldAskUsername && (
          <>
            <FormField
              id='username'
              label='用户名'
              icon={<User className='h-4 w-4 sm:h-5 sm:w-5' />}
              type='text'
              autoComplete='username'
              autoFocus={!password}
              placeholder='请输入用户名'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label className='-mt-2 flex cursor-pointer select-none items-center gap-2'>
              <input
                type='checkbox'
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className='h-3.5 w-3.5 rounded border-gray-300 text-[#d89c18] focus:ring-[#f4c24d]'
              />
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                记住用户名
              </span>
            </label>
          </>
        )}

        <FormField
          id='password'
          label='密码'
          icon={<Lock className='h-4 w-4 sm:h-5 sm:w-5' />}
          type={showPassword ? 'text' : 'password'}
          autoComplete='current-password'
          placeholder='请输入访问密码'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          rightElement={
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='flex items-center p-2 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? (
                <EyeOff className='h-4 w-4 sm:h-5 sm:w-5' />
              ) : (
                <Eye className='h-4 w-4 sm:h-5 sm:w-5' />
              )}
            </button>
          }
        />

        {error && (
          <div
            role='alert'
            aria-live='polite'
            className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 animate-slide-down dark:border-red-800/50 dark:bg-red-900/20'
          >
            <svg
              className='h-4 w-4 shrink-0 text-red-600 dark:text-red-400'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 8v4M12 16h.01' strokeLinecap='round' />
            </svg>
            <p className='text-xs text-red-600 dark:text-red-400 sm:text-sm'>
              {error}
            </p>
          </div>
        )}

        <button
          type='submit'
          disabled={!password || loading || (shouldAskUsername && !username)}
          className='ui-primary-button group relative w-full overflow-hidden'
        >
          <span className='absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-full' />
          <Lock className='h-4 w-4 sm:h-5 sm:w-5' />
          {loading ? '登录中...' : '立即登录'}
        </button>
      </form>

      {/* 注册入口 */}
      {shouldAskUsername && (
        <div className='auth-field-grid mt-6 space-y-3 border-t border-gray-200 pt-6 dark:border-white/10'>
          <p className='text-center text-xs text-gray-600 dark:text-gray-400 sm:text-sm'>
            还没有账户？
          </p>
          <a
            href='/register'
            className='ui-secondary-button group w-full text-xs sm:text-sm'
          >
            <UserPlus className='h-4 w-4' />
            <span>立即注册</span>
            <span className='inline-block transition-transform group-hover:translate-x-1'>
              →
            </span>
          </a>
        </div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
