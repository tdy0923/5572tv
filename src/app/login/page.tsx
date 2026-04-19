'use client';

import {
  AlertCircle,
  Lock,
  Send,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import {
  getCachedWallpaperUrl,
  setCachedWallpaperUrl,
} from '@/lib/wallpaper-cache';

import { AuthShell } from '@/components/AuthShell';
import {
  detectProvider,
  getProviderButtonStyle,
  getProviderButtonText,
  OIDCProviderLogo,
} from '@/components/OIDCProviderLogos';

function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const shouldAskUsername =
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'localstorage';
  // Telegram Magic Link 状态
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');

  // OIDC 登录状态
  const [oidcProviders, setOidcProviders] = useState<
    Array<{
      id: string;
      name: string;
      buttonText: string;
      issuer: string;
    }>
  >([]);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcButtonText, setOidcButtonText] = useState('使用OIDC登录');
  const [oidcIssuer, setOidcIssuer] = useState<string>('');

  // 获取 Bing 每日壁纸（通过代理 API）
  useEffect(() => {
    const fetchBingWallpaper = async () => {
      try {
        const cachedWallpaper = getCachedWallpaperUrl();
        if (cachedWallpaper) {
          return;
        }

        const response = await fetch('/api/bing-wallpaper');
        const data = await response.json();
        if (data.url) {
          setCachedWallpaperUrl(data.url);
        }
      } catch (error) {
        console.log('Failed to fetch Bing wallpaper:', error);
      }
    };

    fetchBingWallpaper();
  }, []);

  // 获取 Telegram Magic Link 配置
  useEffect(() => {
    const fetchTelegramConfig = async () => {
      try {
        console.log('[Login] Fetching server config...');
        const response = await fetch('/api/server-config');
        const data = await response.json();
        console.log('[Login] Server config received:', data);
        console.log('[Login] TelegramAuthConfig:', data.TelegramAuthConfig);
        if (data.TelegramAuthConfig?.enabled) {
          console.log('[Login] Telegram is enabled!');
          setTelegramEnabled(true);
        } else {
          console.log('[Login] Telegram is NOT enabled');
        }

        // 检查 OIDC 配置
        console.log('[Login] OIDCConfig:', data.OIDCConfig);
        console.log('[Login] OIDCProviders:', data.OIDCProviders);

        // 优先使用新的多 Provider 配置
        if (data.OIDCProviders && data.OIDCProviders.length > 0) {
          console.log('[Login] Multiple OIDC providers enabled!');
          setOidcProviders(data.OIDCProviders);
          setOidcEnabled(true);
        } else if (data.OIDCConfig?.enabled) {
          // 向后兼容：旧的单 Provider 配置
          console.log('[Login] OIDC is enabled!');
          setOidcEnabled(true);
          setOidcButtonText(data.OIDCConfig.buttonText || '使用OIDC登录');
          setOidcIssuer(data.OIDCConfig.issuer || '');
        } else {
          console.log('[Login] OIDC is NOT enabled');
        }
      } catch (error) {
        console.log('Failed to fetch server config:', error);
      }
    };

    fetchTelegramConfig();
  }, []);

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
        // 记录登入时间
        const loginTime = Date.now();
        try {
          await fetch('/api/user/my-stats', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginTime }),
          });
          // 更新 localStorage 记录
          localStorage.setItem('lastRecordedLogin', loginTime.toString());
        } catch (error) {
          console.log('记录登入时间失败:', error);
          // 登入时间记录失败不影响正常登录流程
        }

        const redirect = searchParams.get('redirect') || '/';
        router.replace(redirect);
      } else if (res.status === 401) {
        setError('密码错误');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 生成 Telegram 登录链接
  const handleTelegramLogin = async () => {
    console.log('[Frontend] Telegram login clicked');
    setError(null);

    // 验证 Telegram 用户名
    if (!telegramUsername || telegramUsername.trim() === '') {
      setError('请输入您的 Telegram 用户名');
      return;
    }

    setTelegramLoading(true);

    try {
      console.log(
        '[Frontend] Generating deep link for user:',
        telegramUsername,
      );
      const res = await fetch('/api/telegram/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUsername: telegramUsername.trim() }),
      });

      const data = await res.json();
      console.log('[Frontend] API response:', {
        ok: res.ok,
        status: res.status,
        data,
      });

      if (res.ok && data.deepLink) {
        setTelegramDeepLink(data.deepLink);
        // 自动打开 Telegram
        window.open(data.deepLink, '_blank');
      } else {
        setError(data.error || '生成链接失败，请重试');
      }
    } catch (error) {
      console.error('[Frontend] Error:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setTelegramLoading(false);
    }
  };

  return (
    <AuthShell
      title='登录'
      subtitle='欢迎回来，继续访问您的内容与播放记录'
      icon={<Sparkles className='h-6 w-6 text-white' />}
    >
      <form onSubmit={handleSubmit} className='space-y-4 sm:space-y-6'>
        {shouldAskUsername && (
          <div className='group'>
            <label
              htmlFor='username'
              className='block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'
            >
              用户名
            </label>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none'>
                <User className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-green-500 transition-colors' />
              </div>
              <input
                id='username'
                type='text'
                autoComplete='username'
                className='ui-input pl-10 sm:pl-12 pr-3 sm:pr-4'
                placeholder='请输入用户名'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className='group'>
          <label
            htmlFor='password'
            className='block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'
          >
            密码
          </label>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none'>
              <Lock className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-green-500 transition-colors' />
            </div>
            <input
              id='password'
              type='password'
              autoComplete='current-password'
              className='ui-input pl-10 sm:pl-12 pr-3 sm:pr-4'
              placeholder='请输入访问密码'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className='flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 animate-slide-down'>
            <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0' />
            <p className='text-xs sm:text-sm text-red-600 dark:text-red-400'>
              {error}
            </p>
          </div>
        )}

        {/* 登录按钮 */}
        <button
          type='submit'
          disabled={!password || loading || (shouldAskUsername && !username)}
          className='ui-primary-button group relative w-full overflow-hidden'
        >
          <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
          <Lock className='h-4 w-4 sm:h-5 sm:w-5' />
          {loading ? '登录中...' : '立即登录'}
        </button>

        {/* 注册链接 - 仅在非 localStorage 模式下显示 */}
        {shouldAskUsername && (
          <div className='mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700'>
            <p className='text-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-2.5 sm:mb-3'>
              还没有账户？
            </p>
            <a
              href='/register'
              className='ui-secondary-button group w-full text-xs sm:text-sm'
            >
              <UserPlus className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
              <span>立即注册</span>
              <span className='inline-block transition-transform group-hover:translate-x-1'>
                →
              </span>
            </a>
          </div>
        )}
      </form>

      {/* Telegram Magic Link 登录 */}
      {telegramEnabled && (
        <div className='mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-center text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4'>
            或使用 Telegram 登录
          </p>

          {/* Telegram 用户名输入 */}
          <div className='mb-3 sm:mb-4'>
            <label className='block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
              Telegram 用户名
            </label>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none'>
                <Send className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400' />
              </div>
              <input
                type='text'
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder='输入您的 Telegram 用户名'
                className='ui-input pl-9 sm:pl-10 pr-2.5 sm:pr-3 text-sm sm:text-base'
                disabled={telegramLoading}
              />
            </div>
            <p className='mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400'>
              💡 输入您的 Telegram 用户名（不含 @）
            </p>
          </div>

          <button
            onClick={handleTelegramLogin}
            disabled={telegramLoading || !telegramUsername.trim()}
            className='ui-primary-button group relative w-full overflow-hidden'
          >
            <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
            <Send className='h-4 w-4 sm:h-5 sm:w-5' />
            {telegramLoading ? '正在打开 Telegram...' : '通过 Telegram 登录'}
          </button>

          {telegramDeepLink && (
            <div className='mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50'>
              <p className='text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-1.5 sm:mb-2'>
                📱 已在新标签页打开 Telegram
              </p>
              <p className='text-[11px] sm:text-xs text-blue-600 dark:text-blue-300'>
                如果没有自动打开，请点击{' '}
                <a
                  href={telegramDeepLink}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline font-semibold'
                >
                  这里
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* OIDC 登录 */}
      {oidcEnabled && shouldAskUsername && (
        <div className='mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700'>
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-gray-300 dark:border-gray-600'></div>
            </div>
            <div className='relative flex justify-center text-xs sm:text-sm'>
              <span className='px-2 bg-white/60 dark:bg-zinc-900/60 text-gray-500 dark:text-gray-400'>
                或
              </span>
            </div>
          </div>

          {/* 多 Provider 按钮 */}
          {oidcProviders.length > 0 ? (
            <div className='mt-3 sm:mt-4 space-y-2.5 sm:space-y-3'>
              {oidcProviders.map((provider) => {
                // 优先使用 provider.id，如果是自定义provider则从issuer推断
                const providerId = provider.id.toLowerCase();
                const detectedProvider = [
                  'google',
                  'github',
                  'microsoft',
                  'facebook',
                  'wechat',
                  'apple',
                  'linuxdo',
                ].includes(providerId)
                  ? (providerId as
                      | 'google'
                      | 'github'
                      | 'microsoft'
                      | 'facebook'
                      | 'wechat'
                      | 'apple'
                      | 'linuxdo')
                  : detectProvider(provider.issuer || provider.buttonText);
                const buttonStyle = getProviderButtonStyle(detectedProvider);
                const customText =
                  provider.buttonText && provider.buttonText !== '使用OIDC登录'
                    ? provider.buttonText
                    : undefined;
                const buttonText = getProviderButtonText(
                  detectedProvider,
                  customText,
                );

                return (
                  <button
                    key={provider.id}
                    type='button'
                    onClick={() =>
                      (window.location.href = `/api/auth/oidc/login?provider=${provider.id}`)
                    }
                    className={`w-full inline-flex justify-center items-center rounded-lg py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm transition-all duration-200 active:scale-95 ${buttonStyle}`}
                  >
                    <OIDCProviderLogo provider={detectedProvider} />
                    <span className='ml-2'>{buttonText}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* 单 Provider 按钮（向后兼容） */
            (() => {
              const provider = detectProvider(oidcIssuer || oidcButtonText);
              const buttonStyle = getProviderButtonStyle(provider);
              const customText =
                oidcButtonText && oidcButtonText !== '使用OIDC登录'
                  ? oidcButtonText
                  : undefined;
              const buttonText = getProviderButtonText(provider, customText);

              return (
                <button
                  type='button'
                  onClick={() =>
                    (window.location.href = '/api/auth/oidc/login')
                  }
                  className={`mt-3 sm:mt-4 w-full inline-flex justify-center items-center rounded-lg py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-sm transition-all duration-200 active:scale-95 ${buttonStyle}`}
                >
                  <OIDCProviderLogo provider={provider} />
                  <span className='ml-2'>{buttonText}</span>
                </button>
              );
            })()
          )}
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
