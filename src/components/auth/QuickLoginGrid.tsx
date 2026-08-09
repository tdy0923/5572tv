'use client';

import { Send } from 'lucide-react';

import {
  detectProvider,
  getProviderButtonStyle,
  getProviderButtonText,
  OIDCProviderLogo,
} from '@/components/OIDCProviderLogos';

export interface OIDCProviderItem {
  id: string;
  name: string;
  buttonText: string;
  issuer: string;
}

type QuickLoginGridProps = {
  oidcProviders: OIDCProviderItem[];
  oidcEnabled: boolean;
  telegramEnabled: boolean;
  telegramExpanded: boolean;
  onTelegramToggle: () => void;
  onOIDCStart: (providerId: string, redirect: string) => void;
  children?: React.ReactNode;
};

/**
 * 快捷登录网格：动态 OIDC Provider（Google/GitHub/...）+ Telegram。
 * 按钮全部可见不折叠，后台上新 Provider 自动出现。
 */
export function QuickLoginGrid({
  oidcProviders,
  oidcEnabled,
  telegramEnabled,
  telegramExpanded,
  onTelegramToggle,
  onOIDCStart,
  children,
}: QuickLoginGridProps) {
  const hasOIDC = oidcEnabled && oidcProviders.length > 0;
  const hasAny = hasOIDC || telegramEnabled;
  if (!hasAny) return null;

  return (
    <div className='auth-field-grid space-y-4'>
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-gray-200 dark:border-white/10' />
        </div>
        <div className='relative flex justify-center'>
          <span className='flex items-center gap-1.5 bg-[#0d1117]/0 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500'>
            快捷登录
          </span>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
        {hasOIDC &&
          oidcProviders.map((provider) => {
            const providerId = provider.id.toLowerCase();
            const known = [
              'google',
              'github',
              'microsoft',
              'facebook',
              'wechat',
              'apple',
              'linuxdo',
            ] as const;
            const detected = (known as readonly string[]).includes(providerId)
              ? (providerId as (typeof known)[number])
              : detectProvider(provider.issuer || provider.buttonText);
            const customText =
              provider.buttonText && provider.buttonText !== '使用OIDC登录'
                ? provider.buttonText
                : undefined;
            const text = getProviderButtonText(detected, customText);

            return (
              <button
                key={provider.id}
                type='button'
                onClick={() => onOIDCStart(provider.id, '/')}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-95 ${getProviderButtonStyle(detected)}`}
              >
                <OIDCProviderLogo provider={detected} />
                <span className='truncate'>{text}</span>
              </button>
            );
          })}

        {telegramEnabled && (
          <button
            type='button'
            onClick={onTelegramToggle}
            aria-expanded={telegramExpanded}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-95 ${
              telegramExpanded
                ? 'border-[#2AABEE]/70 bg-[#2AABEE]/15 text-[#7ecbff]'
                : 'border-white/15 bg-white/[0.05] text-gray-200 hover:border-[#2AABEE]/50 hover:bg-[#2AABEE]/10'
            }`}
          >
            <Send className='h-4 w-4 text-[#2AABEE]' />
            Telegram 登录
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
