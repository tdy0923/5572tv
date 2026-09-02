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
            className={`flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition-transform duration-300 group- dark:border-gray-700 dark:bg-gray-800 sm:h-10 sm:w-10 sm:rounded-2xl ${iconColor}`}
          >
            <Icon size={18} strokeWidth={2.5} className='sm:hidden' />
            <Icon size={24} strokeWidth={2.5} className='hidden sm:block' />
          </div>
        )}
        <div className='flex flex-col gap-0.5 sm:gap-1'>
          <h2 className='bg-linear-to-r from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-base font-bold text-transparent dark:from-white dark:via-gray-100 dark:to-gray-400 sm:text-2xl'>
            {title}
          </h2>
          <div className='h-px w-14 rounded-full bg-linear-to-r from-primary-500 via-primary-300 to-transparent transition-all duration-300 group-hover:w-20 sm:w-20 sm:group-hover:w-28' />
        </div>
      </div>
    </div>
  );
}
