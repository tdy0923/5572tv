'use client';

import { Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();

  const setThemeColor = (theme?: string) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#0c111c' : '#f9fbfe';
      document.head.appendChild(meta);
    } else {
      meta.setAttribute('content', theme === 'dark' ? '#0c111c' : '#f9fbfe');
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

  if (!mounted) {
    // 渲染一个占位符以避免布局偏移
    return <div className='h-11 w-11' />;
  }

  const toggleTheme = () => {
    // 检查浏览器是否支持 View Transitions API
    const targetTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeColor(targetTheme);
    if (!(document as any).startViewTransition) {
      setTheme(targetTheme);
      return;
    }

    (document as any).startViewTransition(() => {
      setTheme(targetTheme);
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className='ui-control ui-control-icon relative text-gray-600 hover:text-amber-500 dark:text-gray-300 dark:hover:text-amber-300 group'
      aria-label='Toggle theme'
    >
      {/* 微光背景效果 */}
      <div className='absolute inset-0 rounded-2xl bg-linear-to-br from-amber-400/0 via-transparent to-orange-500/0 group-hover:from-amber-400/20 group-hover:to-orange-500/10 dark:group-hover:from-amber-300/20 dark:group-hover:to-orange-400/10 transition-all duration-300'></div>

      {resolvedTheme === 'dark' ? (
        <Sun className='relative z-10 h-5 w-5 group-hover:rotate-180 transition-transform duration-500' />
      ) : (
        <Moon className='relative z-10 h-5 w-5 group-hover:rotate-180 transition-transform duration-500' />
      )}
    </button>
  );
}
