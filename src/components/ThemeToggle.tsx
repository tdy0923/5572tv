'use client';

import { MonitorSmartphone, Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme, resolvedTheme } = useTheme();
  const pathname = usePathname();

  const setThemeColor = (t?: string) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      const m = document.createElement('meta');
      m.name = 'theme-color';
      m.content = t === 'dark' ? '#0c111c' : '#f9fbfe';
      document.head.appendChild(m);
    } else {
      meta.setAttribute('content', t === 'dark' ? '#0c111c' : '#f9fbfe');
    }
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  // 监听主题变化和路由变化，确保主题色始终同步
  useEffect(() => {
    if (mounted) {
      setThemeColor(resolvedTheme);
    }
  }, [mounted, resolvedTheme, pathname]);

  // 三态循环：亮色 → 暗色 → 跟随系统 → 亮色
  const toggleTheme = () => {
    const next =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

    // 计算 next 实际解析后的明暗，用于同步浏览器主题色
    const resolvedNext =
      next === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : next;
    setThemeColor(resolvedNext);

    if (!(document as any).startViewTransition) {
      setTheme(next);
      return;
    }

    (document as any).startViewTransition(() => {
      setTheme(next);
    });
  };

  if (!mounted) {
    // 渲染一个占位符以避免布局偏移
    return <div className='nav-cluster-btn' />;
  }

  const isSystem = theme === 'system';
  const label = isSystem
    ? `主题：跟随系统${resolvedTheme === 'dark' ? '（当前暗色）' : '（当前亮色）'}，点击切换`
    : theme === 'dark'
      ? '主题：暗色，点击切换'
      : '主题：亮色，点击切换';

  return (
    <button
      onClick={toggleTheme}
      className='nav-cluster-btn group text-gray-600 hover:text-amber-500 dark:text-gray-300 dark:hover:text-amber-300'
      aria-label={label}
      title={label}
    >
      {/* 微光背景效果 */}
      <div className='absolute inset-0 rounded-full bg-linear-to-br from-amber-400/0 via-transparent to-orange-500/0 group-hover:from-amber-400/20 group-hover:to-orange-500/10 dark:group-hover:from-amber-300/20 dark:group-hover:to-orange-400/10 transition-all duration-300'></div>

      {theme === 'system' ? (
        <MonitorSmartphone
          className='relative z-10 shrink-0 transition-transform duration-500'
          strokeWidth={2.5}
        />
      ) : theme === 'dark' ? (
        <Moon
          className='relative z-10 shrink-0 group-hover:rotate-180 transition-transform duration-500'
          strokeWidth={2.5}
        />
      ) : (
        <Sun
          className='relative z-10 shrink-0 group-hover:rotate-180 transition-transform duration-500'
          strokeWidth={2.5}
        />
      )}
    </button>
  );
}
