import { LucideIcon } from 'lucide-react';

interface SectionTitleProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  kicker?: string;
  index?: string;
}

export default function SectionTitle({
  title,
  icon: Icon,
  iconColor = 'text-primary-500',
  kicker,
  index,
}: SectionTitleProps) {
  return (
    <div className='group inline-flex flex-col gap-2'>
      {(kicker || index) && (
        <div className='flex items-center gap-2'>
          {index && (
            <span className='font-mono text-[11px] font-bold tracking-[0.2em] text-primary-500/70 dark:text-primary-400/60'>
              {index}
            </span>
          )}
          {kicker && <span className='ui-section-kicker'>{kicker}</span>}
        </div>
      )}
      <div className='ui-section-heading'>
        {Icon && (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm transition-transform duration-300 group- dark:border-gray-700 dark:bg-gray-800 ${iconColor}`}
          >
            <Icon size={24} strokeWidth={2.5} />
          </div>
        )}
        <div className='flex flex-col gap-1'>
          <h2 className='bg-linear-to-r from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-xl font-bold text-transparent dark:from-white dark:via-gray-100 dark:to-gray-400 sm:text-2xl'>
            {title}
          </h2>
          <div className='h-px w-20 rounded-full bg-linear-to-r from-primary-500 via-primary-300 to-transparent transition-all duration-300 group-hover:w-28' />
        </div>
      </div>
    </div>
  );
}
