'use client';

import { useState } from 'react';

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
    console.log(message);
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
    <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'>
      <div className='mb-4 flex items-center gap-2'>
        {icon}
        <h3 className='text-base font-semibold text-gray-800'>{title}</h3>
      </div>
      {children}
    </div>
  );
}
