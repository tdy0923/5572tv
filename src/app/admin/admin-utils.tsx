/* eslint-disable no-console */
'use client';

import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ==================== 弹窗管理 ====================

interface AlertModalConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timer?: number;
  showConfirm?: boolean;
}

export function useAlertModal() {
  const [alertModal, setAlertModal] = useState<AlertModalConfig>({
    isOpen: false,
    type: 'success',
    title: '',
  });

  const showAlert = (config: Omit<AlertModalConfig, 'isOpen'>) => {
    setAlertModal({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  return { alertModal, showAlert, hideAlert };
}

// ==================== 统一提示 ====================

export const showError = (
  message: string,
  showAlert?: (config: any) => void,
) => {
  if (showAlert) {
    showAlert({ type: 'error', title: '错误', message, showConfirm: true });
  } else {
    console.error(message);
  }
};

export const showSuccess = (
  message: string,
  showAlert?: (config: any) => void,
) => {
  if (showAlert) {
    showAlert({ type: 'success', title: '成功', message, timer: 2000 });
  } else {
    //     console.log(message);
  }
};

// ==================== 加载状态 ====================

interface LoadingState {
  [key: string]: boolean;
}

export function useLoadingState() {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  };

  const isLoading = (key: string) => loadingStates[key] || false;

  const withLoading = async (
    key: string,
    operation: () => Promise<any>,
  ): Promise<any> => {
    setLoading(key, true);
    try {
      const result = await operation();
      return result;
    } finally {
      setLoading(key, false);
    }
  };

  return { isLoading, withLoading, setLoading };
}

// ==================== 通用组件 ====================

interface AdminModulePanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminModulePanel({
  title,
  icon,
  children,
}: AdminModulePanelProps) {
  return (
    <div className='overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md  dark:border-gray-700 dark:bg-gray-800'>
      <div className='flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4 dark:border-gray-700 dark:bg-gray-800'>
        {icon}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {title}
          </h3>
          <p className='mt-1 text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400'>
            Module Workspace
          </p>
        </div>
      </div>

      <div className='border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3 dark:border-gray-700 dark:bg-gray-800'>
        <div className='flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
          <span className='rounded-full border border-gray-200 dark:border-gray-700 bg-white px-2.5 py-1 dark:border-gray-700 dark:bg-gray-800'>
            Single Module
          </span>
          <span className='rounded-full border border-gray-200 dark:border-gray-700 bg-white px-2.5 py-1 dark:border-gray-700 dark:bg-gray-800'>
            Admin Workspace
          </span>
        </div>
      </div>

      <div className='px-6 py-5'>{children}</div>
    </div>
  );
}

// ==================== 按钮样式 ====================

export const buttonStyles = {
  primary:
    'px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-colors',
  success:
    'px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg transition-colors',
  danger:
    'px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors',
  secondary:
    'px-3 py-1.5 text-sm font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-colors',
  warning:
    'px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg transition-colors',
  primarySmall:
    'px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-colors',
  successSmall:
    'px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-md transition-colors',
  dangerSmall:
    'px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-md transition-colors',
  secondarySmall:
    'px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-md transition-colors',
  warningSmall:
    'px-2 py-1 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-md transition-colors',
  roundedPrimary:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-200 transition-colors',
  roundedSuccess:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-200 transition-colors',
  roundedDanger:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-200 transition-colors',
  roundedSecondary:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 dark:text-gray-200 transition-colors',
  roundedWarning:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:hover:bg-yellow-900/60 dark:text-yellow-200 transition-colors',
  roundedPurple:
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-200 transition-colors',
  disabled:
    'px-3 py-1.5 text-sm font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-lg transition-colors',
  disabledSmall:
    'px-2 py-1 text-xs font-medium bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white rounded-md transition-colors',
  toggleOn: 'bg-green-600 dark:bg-green-600',
  toggleOff: 'bg-gray-200 dark:bg-gray-700',
  toggleThumb: 'bg-white',
  toggleThumbOn: 'translate-x-6',
  toggleThumbOff: 'translate-x-1',
  quickAction:
    'px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors',
};

// ==================== 通用弹窗组件 ====================

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timer?: number;
  showConfirm?: boolean;
}

export function AlertModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  timer,
  showConfirm = false,
}: AlertModalProps) {
  useEffect(() => {
    if (isOpen && timer) {
      const id = window.setTimeout(() => onClose(), timer);
      return () => window.clearTimeout(id);
    }
  }, [isOpen, timer, onClose]);

  if (!isOpen) return null;

  const icon =
    type === 'success' ? (
      <CheckCircle className='w-8 h-8 text-green-500' />
    ) : type === 'error' ? (
      <AlertCircle className='w-8 h-8 text-red-500' />
    ) : (
      <AlertTriangle className='w-8 h-8 text-yellow-500' />
    );

  const bgColor =
    type === 'success'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : type === 'error'
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';

  return createPortal(
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full border ${bgColor} p-6 text-center`}
      >
        <div className='flex justify-center mb-4'>{icon}</div>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
          {title}
        </h3>
        {message && (
          <p className='text-gray-600 dark:text-gray-400 mb-4'>{message}</p>
        )}
        {showConfirm && (
          <button onClick={onClose} className={buttonStyles.primary}>
            确定
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
