'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: ToggleProps) {
  return (
    <div className='flex items-center justify-between'>
      {(label || description) && (
        <div className='flex-1 mr-4'>
          {label && (
            <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {label}
            </span>
          )}
          {description && (
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
              {description}
            </p>
          )}
        </div>
      )}
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
