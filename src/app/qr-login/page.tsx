'use client';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCodeLib from 'qrcode';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { AuthShell } from '@/components/AuthShell';

type QRStatus =
  | 'loading'
  | 'pending'
  | 'scanned'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'error';

function QRLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sid');

  const [status, setStatus] = useState<QRStatus>('loading');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile confirm form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const startPollingRef = useRef<(sid: string) => void>(() => {});

  // Detect mobile
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const mobile =
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone') ||
      ua.includes('ipad');
    setIsMobile(mobile);
  }, []);

  // Create QR session (desktop mode)
  const createQRSession = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);
      setCountdown(300);

      const res = await fetch('/api/auth/qr', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '创建二维码失败');
        setStatus('error');
        return;
      }

      setQrUrl(data.qrUrl);

      // Generate QR code image
      const dataUrl = await QRCodeLib.toDataURL(data.qrUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
      setStatus('pending');

      // Start polling
      startPollingRef.current(data.sessionId);
    } catch {
      setError('网络错误，请重试');
      setStatus('error');
    }
  }, []);

  // Poll for status changes (desktop)
  const startPolling = useCallback(
    (sid: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            clearInterval(pollRef.current!);
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const poll = async () => {
        try {
          const res = await fetch(`/api/auth/qr?sessionId=${sid}`);
          const data = await res.json();

          if (data.status === 'confirmed' && data.token) {
            // Login successful
            clearInterval(countdownRef.current!);
            setStatus('confirmed');

            // Set auth cookie
            document.cookie = `user_auth=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

            // Redirect after short delay
            setTimeout(() => {
              router.replace('/');
            }, 1500);
            return;
          }

          if (data.status === 'cancelled') {
            clearInterval(countdownRef.current!);
            setStatus('cancelled');
            return;
          }

          if (data.status === 'expired') {
            clearInterval(countdownRef.current!);
            setStatus('expired');
            return;
          }

          if (data.status === 'scanned') {
            setStatus('scanned');
          }

          // Continue polling
          pollRef.current = setTimeout(poll, 2000);
        } catch {
          pollRef.current = setTimeout(poll, 3000);
        }
      };

      pollRef.current = setTimeout(poll, 2000);
    },
    [router],
  );

  // Assign startPolling to ref
  useEffect(() => {
    startPollingRef.current = startPolling;
  }, [startPolling]);

  // Mobile: confirm login
  const handleMobileConfirm = async () => {
    if (!sessionId) return;
    if (!username || !password) {
      setConfirmError('请输入用户名和密码');
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const res = await fetch('/api/auth/qr/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('confirmed');
      } else {
        setConfirmError(data.error || '确认失败');
      }
    } catch {
      setConfirmError('网络错误，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Initialize: check if mobile with session ID, or create new session
  useEffect(() => {
    if (sessionId && isMobile) {
      // Mobile mode: show confirm form
      setStatus('pending');
    } else if (!sessionId) {
      // Desktop mode: create QR session
      createQRSession();
    }
  }, [sessionId, isMobile, createQRSession]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const statusConfig: Record<
    QRStatus,
    { icon: React.ReactNode; text: string; color: string }
  > = {
    loading: {
      icon: <Loader2 className='h-5 w-5 animate-spin' />,
      text: '正在生成二维码...',
      color: 'text-blue-500',
    },
    pending: {
      icon: <QrCode className='h-5 w-5' />,
      text: '等待扫码',
      color: 'text-gray-600 dark:text-gray-400',
    },
    scanned: {
      icon: <Eye className='h-5 w-5' />,
      text: '已扫码，请在手机上确认',
      color: 'text-blue-500',
    },
    confirmed: {
      icon: <CheckCircle className='h-5 w-5' />,
      text: '登录成功，正在跳转...',
      color: 'text-green-500',
    },
    cancelled: {
      icon: <XCircle className='h-5 w-5' />,
      text: '登录已取消',
      color: 'text-red-500',
    },
    expired: {
      icon: <Clock className='h-5 w-5' />,
      text: '二维码已过期',
      color: 'text-orange-500',
    },
    error: {
      icon: <AlertCircle className='h-5 w-5' />,
      text: error || '发生错误',
      color: 'text-red-500',
    },
  };

  const currentStatus = statusConfig[status];

  // Mobile confirm view
  if (sessionId && isMobile) {
    return (
      <AuthShell
        title='扫码登录确认'
        subtitle='请在下方输入密码以确认登录'
        icon={<QrCode className='h-6 w-6 text-white' />}
      >
        {status === 'confirmed' ? (
          <div className='text-center py-8'>
            <CheckCircle className='h-16 w-16 text-green-500 mx-auto mb-4' />
            <p className='text-lg font-semibold text-green-600 dark:text-green-400'>
              登录成功！
            </p>
            <p className='text-sm text-gray-500 mt-2'>您现在可以关闭此页面</p>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='group'>
              <label className='block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                用户名
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none'>
                  <User className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-green-500 transition-colors' />
                </div>
                <input
                  type='text'
                  autoComplete='username'
                  className='ui-input pl-10 sm:pl-12 pr-3 sm:pr-4'
                  placeholder='请输入用户名'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className='group'>
              <label className='block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                密码
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none'>
                  <Lock className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-green-500 transition-colors' />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  className='ui-input pl-10 sm:pl-12 pr-10 sm:pr-12'
                  placeholder='请输入密码'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4 sm:h-5 sm:w-5' />
                  ) : (
                    <Eye className='h-4 w-4 sm:h-5 sm:w-5' />
                  )}
                </button>
              </div>
            </div>

            {confirmError && (
              <div className='flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'>
                <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0' />
                <p className='text-xs sm:text-sm text-red-600 dark:text-red-400'>
                  {confirmError}
                </p>
              </div>
            )}

            <button
              onClick={handleMobileConfirm}
              disabled={confirmLoading || !username || !password}
              className='ui-primary-button group relative w-full overflow-hidden'
            >
              <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000' />
              <CheckCircle className='h-4 w-4 sm:h-5 sm:w-5' />
              {confirmLoading ? '确认中...' : '确认登录'}
            </button>
          </div>
        )}
      </AuthShell>
    );
  }

  // Desktop QR code view
  return (
    <AuthShell
      title='扫码登录'
      subtitle='使用手机扫描二维码登录'
      icon={<QrCode className='h-6 w-6 text-white' />}
    >
      <div className='flex flex-col items-center'>
        {/* QR Code */}
        <div className='relative mb-6'>
          {status === 'loading' ? (
            <div className='w-[280px] h-[280px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700'>
              <Loader2 className='h-12 w-12 text-gray-400 animate-spin' />
            </div>
          ) : status === 'expired' || status === 'error' ? (
            <div className='w-[280px] h-[280px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700'>
              {currentStatus.icon}
              <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
                {currentStatus.text}
              </p>
              <button
                onClick={createQRSession}
                className='mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors'
              >
                <RefreshCw className='h-4 w-4' />
                刷新二维码
              </button>
            </div>
          ) : (
            <div className='relative'>
              <img
                src={qrDataUrl}
                alt='QR Code'
                className='w-[280px] h-[280px] rounded-2xl border border-gray-200 dark:border-gray-700'
              />
              {status === 'scanned' && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl'>
                  <div className='bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-lg'>
                    <Eye className='h-8 w-8 text-blue-500 mx-auto mb-2' />
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      已扫码
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      请在手机上确认
                    </p>
                  </div>
                </div>
              )}
              {status === 'confirmed' && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl'>
                  <div className='bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-lg'>
                    <CheckCircle className='h-8 w-8 text-green-500 mx-auto mb-2' />
                    <p className='text-sm font-medium text-green-600 dark:text-green-400'>
                      登录成功！
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 mb-4 ${currentStatus.color}`}>
          {currentStatus.icon}
          <span className='text-sm font-medium'>{currentStatus.text}</span>
        </div>

        {/* Countdown */}
        {(status === 'pending' || status === 'scanned') && (
          <div className='flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400'>
            <Clock className='h-3.5 w-3.5' />
            <span>有效期 {formatTime(countdown)}</span>
          </div>
        )}

        {/* Instructions */}
        {status === 'pending' && (
          <div className='mt-6 w-full space-y-3'>
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/30'>
              <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center'>
                打开手机上的浏览器，扫描此二维码
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-500 text-center mt-2 break-all'>
                或手动访问：
                <span className='font-mono text-[10px]'>{qrUrl}</span>
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className='mt-6 w-full space-y-3'>
          {sessionId && (
            <button
              onClick={() => router.replace('/login')}
              className='w-full ui-secondary-button'
            >
              返回密码登录
            </button>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

export default function QRLoginPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
        </div>
      }
    >
      <QRLoginClient />
    </Suspense>
  );
}
