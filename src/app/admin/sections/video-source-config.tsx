'use client';

import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  buttonStyles,
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

interface DataSource {
  name: string;
  key: string;
  api: string;
  detail?: string;
  disabled?: boolean;
  from: 'config' | 'custom';
  is_adult?: boolean;
  type?: 'vod' | 'shortdrama';
  weight?: number;
}

export default function VideoSourceConfig({
  config,
  refreshConfig,
}: {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}) {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [newSource, setNewSource] = useState<DataSource>({
    name: '',
    key: '',
    api: '',
    from: 'config',
    weight: 50,
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  useEffect(() => {
    if (config?.SourceConfig && Array.isArray(config.SourceConfig))
      setSources(config.SourceConfig as DataSource[]);
  }, [config]);

  const handleSaveAll = async () => {
    await withLoading('saveSources', async () => {
      try {
        const resp = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'SourceConfig', value: sources }),
        });
        if (!resp.ok) throw new Error('保存失败');
        setOrderChanged(false);
        showSuccess('视频源配置已保存', showAlert);
        await refreshConfig();
      } catch (err) {
        showError('保存失败: ' + (err as Error).message, showAlert);
      }
    });
  };

  const handleAdd = () => {
    const updated =
      editingIndex !== null
        ? sources.map((s, i) => (i === editingIndex ? { ...newSource } : s))
        : [...sources, { ...newSource, from: 'config' as const }];
    setSources(updated);
    setNewSource({ name: '', key: '', api: '', from: 'config', weight: 50 });
    setShowAddForm(false);
    setEditingIndex(null);
    setOrderChanged(true);
  };

  const handleDelete = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
    setOrderChanged(true);
  };

  const toggleDisabled = (index: number) => {
    setSources(
      sources.map((s, i) =>
        i === index ? { ...s, disabled: !s.disabled } : s,
      ),
    );
    setOrderChanged(true);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIdx = sources.findIndex((_, i) => `src-${i}` === active.id);
      const newIdx = sources.findIndex((_, i) => `src-${i}` === over?.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        setSources(arrayMove(sources, oldIdx, newIdx));
        setOrderChanged(true);
      }
    }
  };

  const inpCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm';
  const lblCls =
    'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold'>视频源配置</h3>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingIndex(null);
            setNewSource({
              name: '',
              key: '',
              api: '',
              from: 'config',
              weight: 50,
            });
          }}
          className={buttonStyles.successSmall}
        >
          添加视频源
        </button>
      </div>

      {showAddForm && (
        <div className='p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className={lblCls}>名称</label>
              <input
                value={newSource.name}
                onChange={(e) =>
                  setNewSource({ ...newSource, name: e.target.value })
                }
                className={inpCls}
              />
            </div>
            <div>
              <label className={lblCls}>Key</label>
              <input
                value={newSource.key}
                onChange={(e) =>
                  setNewSource({ ...newSource, key: e.target.value })
                }
                className={inpCls}
              />
            </div>
            <div className='col-span-2'>
              <label className={lblCls}>API 地址</label>
              <input
                value={newSource.api}
                onChange={(e) =>
                  setNewSource({ ...newSource, api: e.target.value })
                }
                className={inpCls}
                placeholder='https://example.com/api.php/provide/vod/at/xml/'
              />
            </div>
            <div>
              <label className={lblCls}>详情页(可选)</label>
              <input
                value={newSource.detail || ''}
                onChange={(e) =>
                  setNewSource({ ...newSource, detail: e.target.value })
                }
                className={inpCls}
              />
            </div>
            <div>
              <label className={lblCls}>权重(0-100)</label>
              <input
                type='number'
                min='0'
                max='100'
                value={newSource.weight ?? 50}
                onChange={(e) =>
                  setNewSource({
                    ...newSource,
                    weight: parseInt(e.target.value) || 50,
                  })
                }
                className={inpCls}
              />
            </div>
            <div className='flex items-center gap-4 pt-6'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={newSource.is_adult || false}
                  onChange={(e) =>
                    setNewSource({ ...newSource, is_adult: e.target.checked })
                  }
                  className='w-4 h-4'
                />
                成人源
              </label>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={newSource.type === 'shortdrama'}
                  onChange={(e) =>
                    setNewSource({
                      ...newSource,
                      type: e.target.checked ? 'shortdrama' : 'vod',
                    })
                  }
                  className='w-4 h-4'
                />
                短剧源
              </label>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement, restrictToVerticalAxis]}
      >
        <SortableContext
          items={sources.map((_, i) => `src-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-2'>
            {sources.map((src, i) => (
              <SortableItem
                key={`src-${i}`}
                id={`src-${i}`}
                source={src}
                onEdit={() => {
                  setEditingIndex(i);
                  setNewSource(src);
                  setShowAddForm(true);
                }}
                onDelete={() => handleDelete(i)}
                onToggle={() => toggleDisabled(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {orderChanged && (
        <button
          onClick={handleSaveAll}
          disabled={isLoading('saveSources')}
          className={`px-4 py-2 ${isLoading('saveSources') ? buttonStyles.disabled : buttonStyles.success} rounded-lg transition-colors`}
        >
          {isLoading('saveSources') ? '保存中…' : '保存排序'}
        </button>
      )}

      {isLoading('exportSources') && (
        <div className='text-sm text-blue-600'>导出中...</div>
      )}
    </div>
  );
}

function SortableItem({
  id,
  source,
  onEdit,
  onDelete,
  onToggle,
}: {
  id: string;
  source: DataSource;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className='flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border rounded-lg'
    >
      <button {...attributes} {...listeners} className='cursor-grab p-1'>
        <GripVertical className='w-4 h-4 text-gray-400' />
      </button>
      <span className='flex-1 text-sm truncate'>
        {source.name || source.key}
      </span>
      <span
        className={`text-xs px-2 py-0.5 rounded ${source.is_adult ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
      >
        {source.is_adult ? '成人' : '普通'}
      </span>
      <span className='text-xs text-gray-500 w-12 text-right'>
        {source.weight ?? 50}
      </span>
      <button
        onClick={onEdit}
        className='p-1 text-blue-600 hover:text-blue-800 text-sm'
      >
        编辑
      </button>
      <button
        onClick={onDelete}
        className='p-1 text-red-600 hover:text-red-800 text-sm'
      >
        删除
      </button>
    </div>
  );
}
