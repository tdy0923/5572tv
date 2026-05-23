'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  AlertModal,
  buttonStyles,
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

interface LiveSourceConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

export default function LiveSourceConfig({
  config,
  refreshConfig,
}: LiveSourceConfigProps) {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [liveSources, setLiveSources] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState<any>({
    name: '',
    url: '',
    key: '',
    group: '',
    ua: '',
    epg: '',
    isTvBox: false,
    disabled: false,
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (config?.LiveConfig && Array.isArray(config.LiveConfig))
      setLiveSources(config.LiveConfig);
  }, [config]);

  const handleSaveAll = async () => {
    await withLoading('saveLive', async () => {
      try {
        const resp = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'LiveConfig', value: liveSources }),
        });
        if (!resp.ok) throw new Error('保存失败');
        showSuccess('直播源配置已保存', showAlert);
        await refreshConfig();
      } catch (err) {
        showError('保存失败: ' + (err as Error).message, showAlert);
      }
    });
  };

  const handleAdd = () => {
    const updated =
      editingIndex !== null
        ? liveSources.map((s, i) => (i === editingIndex ? { ...newSource } : s))
        : [...liveSources, { ...newSource }];
    setLiveSources(updated);
    setNewSource({
      name: '',
      url: '',
      key: '',
      group: '',
      ua: '',
      epg: '',
      isTvBox: false,
      disabled: false,
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    setLiveSources(liveSources.filter((_, i) => i !== index));
  };

  const toggleDisabled = (index: number) => {
    setLiveSources(
      liveSources.map((s, i) =>
        i === index ? { ...s, disabled: !s.disabled } : s,
      ),
    );
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm';
  const labelCls =
    'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold'>直播源配置</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className={buttonStyles.successSmall}
        >
          添加直播源
        </button>
      </div>

      {showAddForm && (
        <div className='p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className={labelCls}>名称</label>
              <input
                value={newSource.name}
                onChange={(e) =>
                  setNewSource({ ...newSource, name: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Key</label>
              <input
                value={newSource.key}
                onChange={(e) =>
                  setNewSource({ ...newSource, key: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div className='col-span-2'>
              <label className={labelCls}>URL</label>
              <input
                value={newSource.url}
                onChange={(e) =>
                  setNewSource({ ...newSource, url: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>分组</label>
              <input
                value={newSource.group}
                onChange={(e) =>
                  setNewSource({ ...newSource, group: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>User-Agent</label>
              <input
                value={newSource.ua}
                onChange={(e) =>
                  setNewSource({ ...newSource, ua: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>EPG</label>
              <input
                value={newSource.epg}
                onChange={(e) =>
                  setNewSource({ ...newSource, epg: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div className='flex items-center space-x-2 pt-6'>
              <input
                type='checkbox'
                checked={newSource.isTvBox}
                onChange={(e) =>
                  setNewSource({ ...newSource, isTvBox: e.target.checked })
                }
                className='w-4 h-4 text-blue-600'
              />
              <span className='text-sm'>TVBox 源</span>
            </div>
          </div>
          <div className='flex gap-2'>
            <button onClick={handleAdd} className={buttonStyles.primarySmall}>
              {editingIndex !== null ? '更新' : '添加'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
              }}
              className={buttonStyles.secondarySmall}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className='space-y-2'>
        {liveSources.map((source, i) => (
          <div
            key={i}
            className='flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-lg'
          >
            <span
              className={`flex-1 text-sm ${source.disabled ? 'line-through text-gray-400' : ''}`}
            >
              {source.name || source.key}
            </span>
            <span className='text-xs text-gray-500 w-20 truncate'>
              {source.group}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${source.isTvBox ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {source.isTvBox ? 'TVBox' : '普通'}
            </span>
            <button
              onClick={() => {
                setEditingIndex(i);
                setNewSource(source);
                setShowAddForm(true);
              }}
              className='p-1 text-blue-600 hover:text-blue-800 text-sm'
            >
              编辑
            </button>
            <button onClick={() => toggleDisabled(i)} className='p-1 text-sm'>
              {source.disabled ? (
                <span className='text-green-600'>启用</span>
              ) : (
                <span className='text-gray-400'>禁用</span>
              )}
            </button>
            <button
              onClick={() => handleDelete(i)}
              className='p-1 text-red-600 hover:text-red-800 text-sm'
            >
              删除
            </button>
          </div>
        ))}
      </div>

      {liveSources.length > 0 && (
        <button
          onClick={handleSaveAll}
          disabled={isLoading('saveLive')}
          className={`px-4 py-2 ${isLoading('saveLive') ? buttonStyles.disabled : buttonStyles.success} rounded-lg transition-colors`}
        >
          {isLoading('saveLive') ? '保存中…' : '保存所有直播源'}
        </button>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={hideAlert}
        type={alertModal.type as any}
        title={alertModal.title}
        message={alertModal.message}
        timer={alertModal.timer}
        showConfirm={alertModal.showConfirm}
      />
    </div>
  );
}
