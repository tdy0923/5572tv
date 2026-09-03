'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const dismissedStorageKey = 'pwa_install_dismissed';

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 已安装为 PWA 或已在 standalone 模式则不提示
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstalled(true);
      return;
    }

    try {
      if (localStorage.getItem(dismissedStorageKey)) {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallEvent(null);
      }
    } catch {
      /* 用户取消或浏览器不支持 */
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedStorageKey, '1');
    } catch {
      /* ignore */
    }
  };

  if (installed || dismissed || !installEvent) return null;

  return (
    <div className='fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[70] sm:bottom-6 sm:left-auto sm:right-6 sm:w-80'>
      <div className='flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-16 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/95'>
        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/20'>
          <Download className='h-5 w-5 text-[#b78415] dark:text-[#f4c24d]' />
        </div>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-gray-900 dark:text-white'>
            安装 5572 影视
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            添加到主屏幕，体验更流畅
          </p>
        </div>
        <button
          onClick={handleInstall}
          className='shrink-0 rounded-full bg-primary-500 px-3 py-1.5 text-sm font-semibold text-[#111] transition-colors hover:bg-primary-600'
        >
          安装
        </button>
        <button
          onClick={handleDismiss}
          className='shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200'
          aria-label='关闭安装提示'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}
