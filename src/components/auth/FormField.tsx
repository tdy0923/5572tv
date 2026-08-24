'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  rightElement?: ReactNode;
};

/**
 * 认证表单字段：标签 + 图标输入框 + 右侧操作（如显隐密码）+ 错误/提示。
 */
export function FormField({
  id,
  label,
  icon,
  error,
  hint,
  rightElement,
  className = '',
  ...inputProps
}: FormFieldProps) {
  return (
    <div className='group'>
      <label
        htmlFor={id}
        className='auth-label mb-1.5 block text-xs font-medium text-gray-700 transition-colors dark:text-gray-300 sm:mb-2 sm:text-sm'
      >
        {label}
      </label>
      <div className='relative'>
        <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4'>
          <span className='text-gray-400 transition-colors group-focus-within:text-[#f4c24d] dark:text-gray-400'>
            {icon}
          </span>
        </div>
        <input
          id={id}
          className={`ui-input ${className}`}
          style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
          {...inputProps}
        />
        {rightElement && (
          <div className='absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2'>
            {rightElement}
          </div>
        )}
      </div>
      {hint}
      {error && <p className='mt-1.5 text-xs text-red-500'>{error}</p>}
    </div>
  );
}
