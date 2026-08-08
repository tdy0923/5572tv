'use client';

interface FluentSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  label?: string;
  className?: string;
  color?: string;
}

const sizes = {
  small: { ring: 16, stroke: 2 },
  medium: { ring: 24, stroke: 2.5 },
  large: { ring: 40, stroke: 3.5 },
  xlarge: { ring: 64, stroke: 5 },
};

export function FluentSpinner({
  size = 'medium',
  label,
  className = '',
  color,
}: FluentSpinnerProps) {
  const { ring, stroke } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * 0.25;

  return (
    <div
      className={`flex flex-col items-center gap-3 ${className}`}
      role='status'
      aria-live='polite'
    >
      <svg
        width={ring}
        height={ring}
        viewBox={`0 0 ${ring} ${ring}`}
        fill='none'
      >
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          stroke='var(--color-stroke)'
          strokeWidth={stroke}
          opacity='0.3'
        />
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          stroke={color || 'var(--color-primary-500)'}
          strokeWidth={stroke}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap='round'
          style={{
            transformOrigin: 'center',
            ['--fluent2-spinner-offset' as string]: `${dashOffset}px`,
            animation: 'fluent2-spinner 1.2s ease-in-out infinite',
          }}
        />
      </svg>
      {label && (
        <span
          className='text-sm font-medium'
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function FluentLoadingPage({ text = '加载中...' }: { text?: string }) {
  return (
    <div className='flex min-h-[50vh] flex-col items-center justify-center gap-5'>
      <FluentSpinner size='xlarge' />
      <p
        className='text-base font-medium'
        style={{ color: 'var(--color-foreground-muted)' }}
      >
        {text}
      </p>
    </div>
  );
}

export function FluentLoadingOverlay({
  visible,
  text = '加载中...',
}: {
  visible: boolean;
  text?: string;
}) {
  if (!visible) return null;
  return (
    <div
      className='absolute inset-0 z-50 flex items-center justify-center rounded-lg'
      style={{ background: 'var(--color-background)', opacity: 0.85 }}
    >
      <FluentSpinner size='large' label={text} />
    </div>
  );
}

export function FluentInlineLoader({
  text = '正在加载...',
}: {
  text?: string;
}) {
  return (
    <div className='flex items-center justify-center gap-2 py-6'>
      <FluentSpinner size='small' />
      <span
        className='text-sm text-gray-500 dark:text-gray-400'
        aria-hidden='true'
      >
        {text}
      </span>
    </div>
  );
}
