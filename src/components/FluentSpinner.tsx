'use client';

interface FluentSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
  className?: string;
}

const sizes = {
  small: { ring: 16, stroke: 2 },
  medium: { ring: 24, stroke: 2.5 },
  large: { ring: 36, stroke: 3 },
};

export default function FluentSpinner({
  size = 'medium',
  label,
  className = '',
}: FluentSpinnerProps) {
  const { ring, stroke } = sizes[size];
  const radius = (ring - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <svg
        width={ring}
        height={ring}
        viewBox={`0 0 ${ring} ${ring}`}
        className='animate-spin'
        style={{ animationDuration: '800ms' }}
      >
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill='none'
          stroke='var(--color-stroke)'
          strokeWidth={stroke}
          opacity='0.3'
        />
        <circle
          cx={ring / 2}
          cy={ring / 2}
          r={radius}
          fill='none'
          stroke='var(--color-primary-500)'
          strokeWidth={stroke}
          strokeDasharray={circumference * 0.75}
          strokeLinecap='round'
          style={{
            transformOrigin: 'center',
            animation: 'fluent2-spinner 1.2s ease-in-out infinite',
          }}
        />
      </svg>
      {label && (
        <span
          className='text-xs font-medium'
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
    <div className='flex min-h-[400px] flex-col items-center justify-center gap-4'>
      <FluentSpinner size='large' />
      <p
        className='text-sm font-medium'
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
      <FluentSpinner size='medium' label={text} />
    </div>
  );
}
