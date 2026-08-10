/* eslint-disable no-console */
/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { AlertCircle, Lock, Shield, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AppDownloads } from '@/components/auth/AppDownloads';
import { FormField } from '@/components/auth/FormField';
import { AuthShell } from '@/components/AuthShell';

function OIDCRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oidcInfo, setOidcInfo] = useState<any>(null);

  // 检查OIDC session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/oidc/session-info');
        if (res.ok) {
          const data = await res.json();
          setOidcInfo(data);
        } else {
          // session无效,跳转到登录页
          router.replace(
            '/login?error=' + encodeURIComponent('OIDC会话已过期'),
          );
        }
      } catch (error) {
        console.error('检查session失败:', error);
        router.replace('/login');
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!username) {
      setError('请输入用户名');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/oidc/complete-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, redirect }),
      });

      if (res.ok) {
        const data = await res.json();
        // Upstash 需要额外延迟等待数据同步
        const delay = data.needDelay ? 1500 : 0;
        const target =
          typeof data.redirect === 'string' && data.redirect.startsWith('/')
            ? data.redirect
            : '/';

        setTimeout(() => {
          router.replace(target);
        }, delay);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '注册失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!oidcInfo) {
    return (
      <div className='relative min-h-screen flex items-center justify-center px-3 sm:px-4'>
        <div className='text-sm sm:text-base text-gray-500 dark:text-gray-400'>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title='完成 OIDC 注册'
      subtitle='补充用户名后继续访问您的内容与播放记录'
      icon={<Shield className='h-6 w-6 text-white' />}
      footer={<AppDownloads />}
    >
      {oidcInfo && (
        <div className='mb-5 rounded-2xl border border-blue-200 bg-blue-50/90 p-4 dark:border-blue-800/60 dark:bg-blue-900/20'>
          <div className='mb-3 text-sm font-semibold text-blue-800 dark:text-blue-300'>
            OIDC 账户信息
          </div>
          <div className='grid gap-2 text-xs sm:text-sm'>
            {oidcInfo.email && (
              <div className='rounded-xl bg-white/60 px-3 py-2 text-blue-900 dark:bg-gray-800 dark:text-blue-100'>
                <span className='text-blue-600 dark:text-blue-300'>邮箱</span>
                <div className='mt-1 break-all font-medium'>
                  {oidcInfo.email}
                </div>
              </div>
            )}
            {oidcInfo.name && (
              <div className='rounded-xl bg-white/60 px-3 py-2 text-blue-900 dark:bg-gray-800 dark:text-blue-100'>
                <span className='text-blue-600 dark:text-blue-300'>名称</span>
                <div className='mt-1 break-all font-medium'>
                  {oidcInfo.name}
                </div>
              </div>
            )}
            {oidcInfo.trust_level !== undefined && (
              <div className='rounded-xl bg-white/60 px-3 py-2 text-blue-900 dark:bg-gray-800 dark:text-blue-100'>
                <span className='text-blue-600 dark:text-blue-300'>
                  信任等级
                </span>
                <div className='mt-1 font-medium'>{oidcInfo.trust_level}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className='auth-field-grid space-y-5 sm:space-y-6'
      >
        <FormField
          id='username'
          label='选择用户名'
          icon={<User className='h-4 w-4 sm:h-5 sm:w-5' />}
          type='text'
          autoComplete='username'
          placeholder='输入用户名（3-20位）'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          hint={
            <p className='mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs'>
              用户名只能包含字母、数字、下划线，长度 3-20 位
            </p>
          }
        />

        {error && (
          <div
            role='alert'
            aria-live='polite'
            className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 animate-slide-down dark:border-red-800/50 dark:bg-red-900/20'
          >
            <AlertCircle className='h-4 w-4 shrink-0 text-red-600 dark:text-red-400' />
            <p className='text-xs text-red-600 dark:text-red-400 sm:text-sm'>
              {error}
            </p>
          </div>
        )}

        <button
          type='submit'
          disabled={!username || loading}
          className='ui-primary-button group relative w-full overflow-hidden'
        >
          <span className='absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-full' />
          <Shield className='h-4 w-4 sm:h-5 sm:w-5' />
          {loading ? '注册中...' : '完成注册'}
        </button>

        <div className='mt-6 border-t border-gray-200 pt-6 dark:border-gray-700'>
          <p className='mb-3 text-center text-sm text-gray-600 dark:text-gray-400'>
            想先返回认证入口？
          </p>
          <a href='/login' className='ui-secondary-button group w-full text-sm'>
            <Lock className='h-4 w-4' />
            <span>返回登录</span>
            <span className='inline-block transition-transform group-hover:translate-x-1'>
              →
            </span>
          </a>
        </div>
      </form>
    </AuthShell>
  );
}

export default function OIDCRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className='relative min-h-screen flex items-center justify-center px-3 sm:px-4'>
          <div className='text-sm sm:text-base text-gray-500 dark:text-gray-400'>
            加载中...
          </div>
        </div>
      }
    >
      <OIDCRegisterContent />
    </Suspense>
  );
}
