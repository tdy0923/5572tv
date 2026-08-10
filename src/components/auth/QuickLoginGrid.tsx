'use client';

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
  onOIDCStart: (providerId: string, redirect: string) => void;
  /** Telegram 官方授权按钮（常显，无需二次展开） */
  children?: React.ReactNode;
};

/**
 * 快捷登录：OIDC Provider 按钮网格 + Telegram 官方授权按钮（内联常显）。
 * 后台上新 Provider 自动出现。
 */
export function QuickLoginGrid({
  oidcProviders,
  oidcEnabled,
  telegramEnabled,
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
          <span className='flex items-center gap-1.5 bg-transparent px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500'>
            快捷登录
          </span>
        </div>
      </div>

      {hasOIDC && (
        <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
          {oidcProviders.map((provider) => {
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
        </div>
      )}

      {telegramEnabled && children}
    </div>
  );
}
