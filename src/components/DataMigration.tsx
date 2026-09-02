'use client';

import {
  AlertTriangle,
  CheckCircle,
  Download,
  FileCheck,
  Lock,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';

interface DataMigrationProps {
  onRefreshConfig?: () => Promise<void>;
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  html?: string;
  confirmText?: string;
  onConfirm?: () => void;
  showConfirm?: boolean;
  timer?: number;
}

const AlertModal = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  html,
  confirmText = '确定',
  onConfirm,
  showConfirm = false,
  timer,
}: AlertModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  // 控制动画状态
  useEffect(() => {
    let animationFrameId: number | null = null;
    let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

    if (isOpen) {
      animationFrameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      if (timer) {
        autoCloseTimer = setTimeout(() => {
          onClose();
        }, timer);
      }
    } else {
      animationFrameId = window.requestAnimationFrame(() => {
        setIsVisible(false);
      });
    }

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [isOpen, timer, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className='w-12 h-12 text-green-500' />;
      case 'error':
        return <AlertTriangle className='w-12 h-12 text-red-500' />;
      case 'warning':
        return <AlertTriangle className='w-12 h-12 text-yellow-500' />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border ${getBgColor()} transition-all duration-200 ${isVisible ? 'scale-100' : 'scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='p-6 text-center'>
          <div className='flex justify-center mb-4'>{getIcon()}</div>

          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
            {title}
          </h3>

          {message && (
            <p className='text-gray-600 dark:text-gray-400 mb-4'>{message}</p>
          )}

          {html && (
            <div
              className='text-left text-gray-600 dark:text-gray-400 mb-4'
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}

          <div className='flex justify-center gap-2'>
            {showConfirm && onConfirm ? (
              <>
                <FluentButton variant='ghost' size='md' onClick={onClose}>
                  取消
                </FluentButton>
                <FluentButton
                  variant='primary'
                  size='md'
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                >
                  {confirmText}
                </FluentButton>
              </>
            ) : (
              <FluentButton variant='primary' size='md' onClick={onClose}>
                确定
              </FluentButton>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const DataMigration = ({ onRefreshConfig }: DataMigrationProps) => {
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message?: string;
    html?: string;
    confirmText?: string;
    onConfirm?: () => void;
    showConfirm?: boolean;
    timer?: number;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (config: Omit<typeof alertModal, 'isOpen'>) => {
    setAlertModal({ ...config, isOpen: true });
  };

  const hideAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  // 导出数据
  const handleExport = async () => {
    if (!exportPassword.trim()) {
      showAlert({
        type: 'error',
        title: '错误',
        message: '请输入加密密码',
      });
      return;
    }

    try {
      setIsExporting(true);

      const response = await fetch('/api/admin/data_migration/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: exportPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `导出失败: ${response.status}`);
      }

      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || '5572tv-backup.dat';

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      a.style.position = 'fixed';
      a.style.top = '0';
      a.style.left = '0';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showAlert({
        type: 'success',
        title: '导出成功',
        message: '数据已成功导出，请妥善保管备份文件和密码',
        timer: 3000,
      });

      setExportPassword('');
    } catch (error) {
      showAlert({
        type: 'error',
        title: '导出失败',
        message: error instanceof Error ? error.message : '导出过程中发生错误',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 导入数据
  const handleImport = async () => {
    if (!selectedFile) {
      showAlert({
        type: 'error',
        title: '错误',
        message: '请选择备份文件',
      });
      return;
    }

    if (!importPassword.trim()) {
      showAlert({
        type: 'error',
        title: '错误',
        message: '请输入解密密码',
      });
      return;
    }

    try {
      setIsImporting(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('password', importPassword);

      const response = await fetch('/api/admin/data_migration/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `导入失败: ${response.status}`);
      }

      // Sanitize values to prevent XSS
      const escapeHtml = (val: any) =>
        String(val || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      showAlert({
        type: 'success',
        title: '导入成功',
        html: `
          <div class="text-left">
            <p><strong>导入完成！</strong></p>
            <p class="mt-2">导入的用户数量: ${escapeHtml(result.importedUsers)}</p>
            <p>备份时间: ${escapeHtml(new Date(result.timestamp).toLocaleString('zh-CN'))}</p>
            <p>服务器版本: ${escapeHtml(result.serverVersion || '未知版本')}</p>
            <p class="mt-3 text-orange-600">请刷新页面以查看最新数据。</p>
          </div>
        `,
        confirmText: '刷新页面',
        showConfirm: true,
        onConfirm: async () => {
          // 清理状态
          setSelectedFile(null);
          setImportPassword('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          // 刷新配置
          if (onRefreshConfig) {
            await onRefreshConfig();
          }

          // 刷新页面
          window.location.reload();
        },
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: '导入失败',
        message: error instanceof Error ? error.message : '导入过程中发生错误',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h3
              className='text-[15px] font-semibold'
              style={{ color: 'var(--color-foreground)' }}
            >
              数据迁移
            </h3>
            <p
              className='text-xs mt-0.5'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              加密备份 · 跨站恢复
            </p>
          </div>
          <FluentBadge variant='warning' size='sm' rounded>
            <AlertTriangle className='w-3 h-3' /> 谨慎操作
          </FluentBadge>
        </div>

        <FluentCard
          padding='12px'
          className='flex gap-3 bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'
        >
          <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0'>
            <AlertTriangle className='w-3.5 h-3.5 text-[#f59e0b]' />
          </span>
          <p className='text-xs leading-relaxed text-amber-800 dark:text-amber-200'>
            数据迁移会覆盖现有数据，请提前备份重要数据并妥善保管密码。
          </p>
        </FluentCard>

        {/* Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {/* Export */}
          <FluentCard padding='16px' className='space-y-4 flex flex-col'>
            <div className='flex items-center gap-3'>
              <span className='w-8 h-8 rounded-xl bg-[#3b82f6]/15 flex items-center justify-center'>
                <Download className='w-4 h-4 text-[#3b82f6]' />
              </span>
              <div>
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
                  数据导出
                </h4>
                <p className='text-xs text-[#9ca3af]'>创建加密备份文件</p>
              </div>
              <FluentBadge variant='info' size='sm' rounded className='ml-auto'>
                .dat
              </FluentBadge>
            </div>

            <div className='space-y-3 flex-1'>
              <FluentInput
                label='加密密码'
                type='password'
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder='设置强密码保护备份文件'
                fullWidth
                prefix={<Lock className='w-3.5 h-3.5' />}
                disabled={isExporting}
              />
              <p className='text-xs text-[#9ca3af]'>导入时需使用相同密码</p>

              <div className='rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5 p-3'>
                <p className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'>
                  备份内容
                </p>
                <div className='grid grid-cols-2 gap-1 text-xs text-[#9ca3af]'>
                  <span className='flex items-center gap-1'>
                    <span className='w-1 h-1 rounded-full bg-[#3b82f6] inline-block' />
                    管理配置
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-1 h-1 rounded-full bg-[#3b82f6] inline-block' />
                    用户数据
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-1 h-1 rounded-full bg-[#3b82f6] inline-block' />
                    播放记录
                  </span>
                  <span className='flex items-center gap-1'>
                    <span className='w-1 h-1 rounded-full bg-[#3b82f6] inline-block' />
                    收藏夹
                  </span>
                </div>
              </div>
            </div>

            <FluentButton
              variant='primary'
              size='md'
              fullWidth
              icon={<Download className='w-4 h-4' />}
              loading={isExporting}
              disabled={!exportPassword.trim()}
              onClick={handleExport}
            >
              {isExporting ? '导出中...' : '导出数据'}
            </FluentButton>
          </FluentCard>

          {/* Import */}
          <FluentCard padding='16px' className='space-y-4 flex flex-col'>
            <div className='flex items-center gap-3'>
              <span className='w-8 h-8 rounded-xl bg-[#ef4444]/15 flex items-center justify-center'>
                <Upload className='w-4 h-4 text-[#ef4444]' />
              </span>
              <div>
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
                  数据导入
                </h4>
                <p className='text-xs text-[#ef4444] flex items-center gap-1'>
                  <AlertTriangle className='w-3 h-3' /> 将清空现有数据
                </p>
              </div>
              <FluentBadge variant='error' size='sm' rounded className='ml-auto'>
                覆盖
              </FluentBadge>
            </div>

            <div className='space-y-3 flex-1'>
              <div className='space-y-1'>
                <label className='text-sm font-medium text-[#9ca3af] flex items-center gap-2'>
                  <FileCheck className='w-3.5 h-3.5' />
                  备份文件
                  {selectedFile && (
                    <FluentBadge variant='success' size='sm' rounded className='ml-auto'>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </FluentBadge>
                  )}
                </label>
                {selectedFile && (
                  <p className='text-xs text-[#22c55e] truncate'>{selectedFile.name}</p>
                )}
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.dat'
                  onChange={handleFileSelect}
                  className='w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-white/10 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-white/15 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-white p-1.5 cursor-pointer'
                  disabled={isImporting}
                />
              </div>

              <FluentInput
                label='解密密码'
                type='password'
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder='输入导出时的加密密码'
                fullWidth
                prefix={<Lock className='w-3.5 h-3.5' />}
                disabled={isImporting}
              />
            </div>

            <FluentButton
              variant='danger'
              size='md'
              fullWidth
              icon={<Upload className='w-4 h-4' />}
              loading={isImporting}
              disabled={!selectedFile || !importPassword.trim()}
              onClick={handleImport}
            >
              {isImporting ? '导入中...' : '导入数据'}
            </FluentButton>
          </FluentCard>
        </div>

        {(isExporting || isImporting) && (
          <div className='flex items-center justify-center gap-2 text-sm text-[#3b82f6]'>
            <FluentSpinner size='small' />
            <span>{isExporting ? '正在导出...' : '正在导入...'}</span>
          </div>
        )}
      </div>

      {/* 弹窗组件 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        html={alertModal.html}
        confirmText={alertModal.confirmText}
        onConfirm={alertModal.onConfirm}
        showConfirm={alertModal.showConfirm}
        timer={alertModal.timer}
      />
    </>
  );
};

export default DataMigration;
