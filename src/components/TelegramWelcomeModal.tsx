/* eslint-disable no-console */
'use client';

import { CheckCircle2, Copy, Eye, EyeOff, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TelegramWelcomeModal() {
  const [show, setShow] = useState(false);
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
    message: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);

  useEffect(() => {
    // 从 cookie 中读取新用户信息
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    const cookieData = getCookie('telegram_new_user');
    if (cookieData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookieData));
        requestAnimationFrame(() => {
          setCredentials({
            username: parsed.username,
            password: parsed.password,
            message: '您已通过 Telegram 成功登录！系统已为您创建账户。',
          });
          setShow(true);
        });

        // 清除 cookie（立即过期）
        document.cookie = 'telegram_new_user=; path=/; max-age=0';
      } catch (error) {
        console.error('Failed to parse telegram new user data:', error);
      }
    }
  }, []);

  const handleCopy = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!show || !credentials) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fluent2-fade-in'>
      <div className='relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fluent2-slide-up'>
        {/* 关闭按钮 */}
        <button
          onClick={() => setShow(false)}
          className='absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700'
        >
          <X className='w-5 h-5' />
        </button>

        {/* 标题 */}
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-full'>
              <CheckCircle2 className='w-6 h-6 text-green-600 dark:text-green-400' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
              欢迎加入！
            </h2>
          </div>
          <p className='text-sm text-gray-600 dark:text-gray-400 ml-11'>
            {credentials.message}
          </p>
        </div>

        {/* 内容 */}
        <div className='p-6 space-y-4'>
          {/* 重要提示 */}
          <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
            <p className='text-sm text-yellow-800 dark:text-yellow-200 font-medium'>
              ⚠️ 请务必记住以下信息，下次可以直接使用用户名和密码登录！
            </p>
          </div>

          {/* 用户名 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              用户名
            </label>
            <div className='flex items-center gap-2'>
              <input
                type='text'
                value={credentials.username}
                readOnly
                className='flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-mono text-sm'
              />
              <button
                onClick={() => handleCopy(credentials.username, 'username')}
                className='p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
                title='复制用户名'
              >
                {copied === 'username' ? (
                  <CheckCircle2 className='w-5 h-5' />
                ) : (
                  <Copy className='w-5 h-5' />
                )}
              </button>
            </div>
          </div>

          {/* 密码 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              初始密码
            </label>
            <div className='flex items-center gap-2'>
              <div className='relative flex-1'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  readOnly
                  className='w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-mono text-sm'
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  title={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? (
                    <EyeOff className='w-5 h-5' />
                  ) : (
                    <Eye className='w-5 h-5' />
                  )}
                </button>
              </div>
              <button
                onClick={() => handleCopy(credentials.password, 'password')}
                className='p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
                title='复制密码'
              >
                {copied === 'password' ? (
                  <CheckCircle2 className='w-5 h-5' />
                ) : (
                  <Copy className='w-5 h-5' />
                )}
              </button>
            </div>
          </div>

          {/* 提示信息 */}
          <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <p className='text-sm text-blue-800 dark:text-blue-200'>
              💡 您可以在个人中心修改密码，也可以继续使用 Telegram 一键登录
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className='p-6 border-t border-gray-200 dark:border-gray-700'>
          <button
            onClick={() => setShow(false)}
            className='w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors'
          >
            我已记住，开始使用
          </button>
        </div>
      </div>
    </div>
  );
}
