'use client';

import {
  AlertCircle,
  CheckCircle,
  Lock,
  Shield,
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
import { ThemeToggle } from '@/components/ThemeToggle';

function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldShowRegister, setShouldShowRegister] = useState(false);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState('');
  const [requireInviteCode, setRequireInviteCode] = useState(false);

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

  // 检查注册是否可用
  useEffect(() => {
    const checkRegistrationAvailable = async () => {
      try {
        // 获取服务器配置
        const configRes = await fetch('/api/server-config');
        const configData = await configRes.json();

        if (configData.StorageType === 'localstorage') {
          router.replace('/login');
          return;
        }

        if (configData.allowRegister === false) {
          setRegistrationDisabled(true);
          setDisabledReason('管理员已关闭用户注册功能');
          setShouldShowRegister(true);
          return;
        }

        // 检查是否需要邀请码
        if (configData.requireInviteCode) {
          setRequireInviteCode(true);
        }

        // 配置允许时直接显示注册表单，避免额外触发 400 探测请求
        setShouldShowRegister(true);
      } catch (error) {
        // 网络错误也显示注册页面
        setShouldShowRegister(true);
      }
    };

    checkRegistrationAvailable();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !password || !confirmPassword) {
      setError('请填写完整信息');
      return;
    }

    if (requireInviteCode && !inviteCode) {
      setError('请输入邀请码');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          confirmPassword,
          inviteCode: inviteCode || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // 显示成功消息，稍等一下再跳转
        setError(null);
        setSuccess('注册成功！正在跳转...');

        // Upstash 需要额外延迟等待数据同步
        const delay = data.needDelay ? 2500 : 1500;

        setTimeout(() => {
          const redirect = searchParams.get('redirect') || '/';
          router.replace(redirect);
        }, delay);
      } else {
        const data = await res.json();
        setError(data.error ?? '注册失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShowRegister) {
    return (
      <AuthShell
        title='注册'
        subtitle='创建您的新账户'
        icon={<UserPlus className='h-6 w-6 text-white' />}
      >
        <div className='py-10 text-center text-sm text-gray-500 dark:text-gray-400'>
          正在加载注册配置...
        </div>
      </AuthShell>
    );
  }

  // 如果注册被禁用，显示提示页面
  if (registrationDisabled) {
    return (
      <div className='relative min-h-screen overflow-hidden px-4 py-8'>
        <div className='absolute top-4 right-4 z-20'>
          <ThemeToggle />
        </div>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,194,77,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),_transparent_26%),linear-gradient(180deg,_#f6f7fb,_#eef2f7)] dark:bg-[radial-gradient(circle_at_top,_rgba(244,194,77,0.1),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.08),_transparent_24%),linear-gradient(180deg,_#0b0f14,_#111827)]' />
        <div className='relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center sm:min-h-screen'>
          <div className='w-full max-w-md overflow-hidden rounded-[28px] border border-black/6 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/8 dark:bg-[#0f131a]/82 sm:p-10'>
            <div className='mb-8 text-center'>
              <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#f59e0b] via-[#ea580c] to-[#dc2626] text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)]'>
                <AlertCircle className='h-6 w-6' />
              </div>
              <div className='text-lg font-semibold text-gray-800 dark:text-gray-100'>
                注册功能暂不可用
              </div>
            </div>
            <div className='text-center space-y-6'>
              <div className='p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50'>
                <p className='text-gray-700 dark:text-gray-300 text-sm leading-relaxed'>
                  {disabledReason || '管理员已关闭用户注册功能'}
                </p>
              </div>
              <p className='text-gray-500 dark:text-gray-500 text-xs'>
                如需注册账户，请联系网站管理员
              </p>
              <button
                onClick={() => router.push('/login')}
                className='group relative inline-flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-0.5 overflow-hidden'
              >
                <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
                返回登录 →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title='注册'
      subtitle='创建您的新账户'
      icon={<UserPlus className='h-6 w-6 text-white' />}
    >
      <form onSubmit={handleSubmit} className='space-y-4 sm:space-y-5'>
        <div className='group'>
          <label
            htmlFor='username'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
          >
            用户名
          </label>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <User className='h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors' />
            </div>
            <input
              id='username'
              type='text'
              autoComplete='username'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              className='ui-input pl-12 pr-4 sm:text-base'
              placeholder='3-20位字母数字下划线'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div className='group'>
          <label
            htmlFor='password'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
          >
            密码
          </label>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <Lock className='h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors' />
            </div>
            <input
              id='password'
              type='password'
              autoComplete='new-password'
              className='ui-input pl-12 pr-4 sm:text-base'
              placeholder='至少6位字符'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className='group'>
          <label
            htmlFor='confirmPassword'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
          >
            确认密码
          </label>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
              <Shield className='h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors' />
            </div>
            <input
              id='confirmPassword'
              type='password'
              autoComplete='new-password'
              className='ui-input pl-12 pr-4 sm:text-base'
              placeholder='再次输入密码'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        {requireInviteCode && (
          <div className='group'>
            <label
              htmlFor='inviteCode'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              邀请码
            </label>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                <Sparkles className='h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors' />
              </div>
              <input
                id='inviteCode'
                type='text'
                autoComplete='off'
                className='ui-input pl-12 pr-4 sm:text-base uppercase'
                placeholder='请输入邀请码'
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        )}

        {error && (
          <div className='flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 animate-slide-down'>
            <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0' />
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
          </div>
        )}

        {success && (
          <div className='flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 animate-slide-down'>
            <CheckCircle className='h-4 w-4 text-green-600 dark:text-green-400 shrink-0' />
            <p className='text-sm text-green-600 dark:text-green-400'>
              {success}
            </p>
          </div>
        )}

        <button
          type='submit'
          disabled={
            !username ||
            !password ||
            !confirmPassword ||
            (requireInviteCode && !inviteCode.trim()) ||
            loading ||
            !!success
          }
          className='ui-primary-button group relative w-full overflow-hidden text-base'
        >
          <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
          <UserPlus className='h-5 w-5' />
          {loading
            ? '注册中...'
            : success
              ? '注册成功，正在跳转...'
              : '立即注册'}
        </button>

        <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-center text-gray-600 dark:text-gray-400 text-sm mb-3'>
            已有账户？
          </p>
          <a href='/login' className='ui-secondary-button group w-full text-sm'>
            <Lock className='w-4 h-4' />
            <span>立即登录</span>
            <span className='inline-block transition-transform group-hover:translate-x-1'>
              →
            </span>
          </a>
        </div>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageClient />
    </Suspense>
  );
}
