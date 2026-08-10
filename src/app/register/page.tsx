/* eslint-disable unused-imports/no-unused-vars */

'use client';

import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Shield,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AppDownloads } from '@/components/auth/AppDownloads';
import { FormField } from '@/components/auth/FormField';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 用户名格式即时校验
  const usernameValid =
    username.length === 0 || /^[a-zA-Z0-9_]{3,20}$/.test(username);

  // 确认密码实时比对
  const passwordMatches =
    confirmPassword.length === 0 || confirmPassword === password;

  const getPasswordStrength = (
    pwd: string,
  ): { level: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, label: '弱', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: '中', color: 'bg-yellow-500' };
    return { level: 3, label: '强', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(password);

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

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('用户名只能包含字母、数字和下划线，长度3-20位');
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

    if (password.length < 6) {
      setError('密码长度至少6位');
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
          // 防止 Open Redirect 漏洞：只允许相对路径
          const safeRedirect =
            redirect.startsWith('/') && !redirect.startsWith('//')
              ? redirect
              : '/';
          router.replace(safeRedirect);
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

  const alertBox = (kind: 'error' | 'success', msg: string) => (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live='polite'
      className={`flex items-center gap-2 rounded-lg border p-3 animate-slide-down ${
        kind === 'error'
          ? 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20'
          : 'border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/20'
      }`}
    >
      {kind === 'error' ? (
        <AlertCircle className='h-4 w-4 shrink-0 text-red-600 dark:text-red-400' />
      ) : (
        <CheckCircle className='h-4 w-4 shrink-0 text-green-600 dark:text-green-400' />
      )}
      <p
        className={`text-xs sm:text-sm ${
          kind === 'error'
            ? 'text-red-600 dark:text-red-400'
            : 'text-green-600 dark:text-green-400'
        }`}
      >
        {msg}
      </p>
    </div>
  );

  if (!shouldShowRegister) {
    return (
      <AuthShell
        title='注册'
        subtitle='创建您的新账户'
        icon={<UserPlus className='h-6 w-6 text-white' />}
        footer={<AppDownloads />}
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
        <div className='absolute right-4 top-4 z-20'>
          <ThemeToggle />
        </div>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,194,77,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),_transparent_26%),linear-gradient(180deg,_#f6f7fb,_#eef2f7)] dark:bg-[radial-gradient(circle_at_top,_rgba(244,194,77,0.1),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.08),_transparent_24%),linear-gradient(180deg,_#0b0f14,_#111827)]' />
        <div className='relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center sm:min-h-screen'>
          <div className='w-full max-w-md overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white/82 p-6 shadow-md dark:bg-[#0f131a]/82 sm:p-10'>
            <div className='mb-8 text-center'>
              <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#f59e0b] via-[#ea580c] to-[#dc2626] text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)]'>
                <AlertCircle className='h-6 w-6' />
              </div>
              <div className='text-lg font-semibold text-gray-800 dark:text-gray-100'>
                注册功能暂不可用
              </div>
            </div>
            <div className='space-y-6 text-center'>
              <div className='rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800/50 dark:bg-yellow-900/20'>
                <p className='text-sm leading-relaxed text-gray-700 dark:text-gray-300'>
                  {disabledReason || '管理员已关闭用户注册功能'}
                </p>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-500'>
                如需注册账户，请联系网站管理员
              </p>
              <button
                onClick={() => router.push('/login')}
                className='group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl hover:shadow-green-500/40'
              >
                <span className='absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-full' />
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
      footer={<AppDownloads />}
    >
      <form
        onSubmit={handleSubmit}
        className='auth-field-grid space-y-4 sm:space-y-5'
      >
        <FormField
          id='username'
          label='用户名'
          icon={<User className='h-4 w-4 sm:h-5 sm:w-5' />}
          type='text'
          autoComplete='username'
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
          autoFocus
          placeholder='3-20位字母数字下划线'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={
            username.length > 0 && !usernameValid
              ? '用户名只能包含字母、数字和下划线，长度3-20位'
              : undefined
          }
        />

        <FormField
          id='password'
          label='密码'
          icon={<Lock className='h-4 w-4 sm:h-5 sm:w-5' />}
          type={showPassword ? 'text' : 'password'}
          autoComplete='new-password'
          placeholder='至少6位字符'
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
          hint={
            password ? (
              <div className='mt-2'>
                <div className='mb-1 flex gap-1'>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={`strength-${i}`}
                      className={`h-1 flex-1 rounded-full ${i <= strength.level ? strength.color : 'bg-gray-200 dark:bg-gray-700'}`}
                    />
                  ))}
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  密码强度: {strength.label}
                </p>
              </div>
            ) : undefined
          }
        />

        <FormField
          id='confirmPassword'
          label='确认密码'
          icon={<Shield className='h-4 w-4 sm:h-5 sm:w-5' />}
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete='new-password'
          placeholder='再次输入密码'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          rightElement={
            <button
              type='button'
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className='flex items-center p-2 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
            >
              {showConfirmPassword ? (
                <EyeOff className='h-4 w-4 sm:h-5 sm:w-5' />
              ) : (
                <Eye className='h-4 w-4 sm:h-5 sm:w-5' />
              )}
            </button>
          }
          error={
            confirmPassword.length > 0 && !passwordMatches
              ? '两次输入的密码不一致'
              : undefined
          }
        />

        {requireInviteCode && (
          <FormField
            id='inviteCode'
            label='邀请码'
            icon={<Sparkles className='h-4 w-4 sm:h-5 sm:w-5' />}
            type='text'
            autoComplete='off'
            className='uppercase'
            placeholder='请输入邀请码'
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />
        )}

        {error && alertBox('error', error)}
        {success && alertBox('success', success)}

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
          className='ui-primary-button group relative w-full overflow-hidden'
        >
          <span className='absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-full' />
          <UserPlus className='h-4 w-4 sm:h-5 sm:w-5' />
          {loading
            ? '注册中...'
            : success
              ? '注册成功，正在跳转...'
              : '立即注册'}
        </button>

        <div className='space-y-3 border-t border-gray-200 pt-6 dark:border-white/10'>
          <p className='text-center text-xs text-gray-600 dark:text-gray-400 sm:text-sm'>
            已有账户？
          </p>
          <a
            href='/login'
            className='ui-secondary-button group w-full text-xs sm:text-sm'
          >
            <Lock className='h-4 w-4' />
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
    <Suspense fallback={null}>
      <RegisterPageClient />
    </Suspense>
  );
}
