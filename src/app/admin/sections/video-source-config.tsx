/* eslint-disable unused-imports/no-unused-vars */

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
import { Database, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentCheckbox,
  FluentEmptyState,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';

import {
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
  const [hasChanges, setHasChanges] = useState(false);
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
        setHasChanges(false);
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
    setHasChanges(true);
  };

  const handleDelete = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
    setOrderChanged(true);
    setHasChanges(true);
  };

  const toggleDisabled = (index: number) => {
    setSources(
      sources.map((s, i) =>
        i === index ? { ...s, disabled: !s.disabled } : s,
      ),
    );
    setOrderChanged(true);
    setHasChanges(true);
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

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            视频源配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            拖拽排序 · {sources.length} 个源
          </p>
        </div>
        <FluentButton
          variant='primary'
          size='sm'
          icon={<Plus className='h-3.5 w-3.5' />}
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
        >
          添加视频源
        </FluentButton>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <FluentInput
              label='名称'
              value={newSource.name}
              onChange={(e) =>
                setNewSource({ ...newSource, name: e.target.value })
              }
              placeholder='例如：量子资源'
            />
            <FluentInput
              label='Key'
              value={newSource.key}
              onChange={(e) =>
                setNewSource({ ...newSource, key: e.target.value })
              }
              placeholder='唯一标识，如 qb'
            />
            <div className='sm:col-span-2'>
              <FluentInput
                label='API 地址'
                value={newSource.api}
                onChange={(e) =>
                  setNewSource({ ...newSource, api: e.target.value })
                }
                placeholder='https://example.com/api.php/provide/vod/at/xml/'
              />
            </div>
            <FluentInput
              label='详情页 (可选)'
              value={newSource.detail || ''}
              onChange={(e) =>
                setNewSource({ ...newSource, detail: e.target.value })
              }
              placeholder='留空则使用 API 地址'
            />
            <FluentInput
              label='权重 (0-100)'
              type='number'
              min={0}
              max={100}
              value={String(newSource.weight ?? 50)}
              onChange={(e) =>
                setNewSource({
                  ...newSource,
                  weight: parseInt(e.target.value) || 50,
                })
              }
            />
            <div className='flex items-center gap-5 sm:col-span-2 pt-1'>
              <FluentCheckbox
                label='成人源'
                checked={!!newSource.is_adult}
                onCheckedChange={(checked) =>
                  setNewSource({ ...newSource, is_adult: checked })
                }
              />
              <FluentCheckbox
                label='短剧源'
                checked={newSource.type === 'shortdrama'}
                onCheckedChange={(checked) =>
                  setNewSource({
                    ...newSource,
                    type: checked ? 'shortdrama' : 'vod',
                  })
                }
              />
            </div>
          </div>
          <div className='flex gap-2 pt-1'>
            <FluentButton variant='primary' size='sm' onClick={handleAdd}>
              {editingIndex !== null ? '更新' : '添加'}
            </FluentButton>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
              }}
            >
              取消
            </FluentButton>
          </div>
        </FluentCard>
      )}

      {/* Sortable List */}
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
            {sources.length === 0 ? (
              <FluentCard padding='0'>
                <FluentEmptyState
                  icon={<Database className='h-6 w-6 text-[#9ca3af]' />}
                  title='暂无视频源'
                  description='点击“添加视频源”创建第一个数据源，支持拖拽排序与权重配置'
                  action={
                    <FluentButton
                      variant='primary'
                      size='sm'
                      icon={<Plus className='h-3.5 w-3.5' />}
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
                    >
                      添加视频源
                    </FluentButton>
                  }
                />
              </FluentCard>
            ) : (
              sources.map((src, i) => (
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
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Save bar */}
      {(orderChanged || hasChanges) && (
        <div className='flex items-center gap-3 pt-1'>
          <FluentButton
            variant='primary'
            size='md'
            loading={isLoading('saveSources')}
            onClick={handleSaveAll}
          >
            {isLoading('saveSources') ? '保存中…' : '保存更改'}
          </FluentButton>
          <span
            className='text-xs'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            有未保存的更改
          </span>
        </div>
      )}

      {isLoading('exportSources') && (
        <div className='flex items-center gap-2 text-sm text-[#3b82f6]'>
          <FluentSpinner size='small' />
          <span>导出中...</span>
        </div>
      )}

      {/* keep alertModal reference to avoid unused warning */}
      <span className='hidden' aria-hidden>
        {alertModal.isOpen ? 'open' : 'closed'}
      </span>
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
      }}
    >
      <FluentCard
        hoverable
        padding='12px'
        className='flex items-center gap-2'
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <button
          {...attributes}
          {...listeners}
          className='cursor-grab p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 shrink-0 touch-manipulation'
          aria-label='拖拽排序'
        >
          <GripVertical className='w-4 h-4 text-[#9ca3af]' />
        </button>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <span className='text-sm font-medium truncate text-gray-900 dark:text-white'>
              {source.name || source.key}
            </span>
            {source.key && source.name && source.key !== source.name && (
              <span className='text-xs text-[#9ca3af] truncate hidden sm:inline'>
                {source.key}
              </span>
            )}
          </div>
          <div className='text-xs truncate text-[#9ca3af] hidden sm:block'>
            {source.api || '—'}
          </div>
        </div>

        <div className='hidden sm:flex items-center gap-1.5 shrink-0'>
          <FluentBadge
            variant={source.type === 'shortdrama' ? 'warning' : 'info'}
            size='sm'
            rounded
          >
            {source.type === 'shortdrama' ? '短剧' : '影视'}
          </FluentBadge>
          <FluentBadge variant='default' size='sm' rounded>
            权重 {source.weight ?? 50}
          </FluentBadge>
          <FluentBadge
            variant={source.is_adult ? 'error' : 'success'}
            size='sm'
            rounded
          >
            {source.is_adult ? '成人' : '普通'}
          </FluentBadge>
          {source.disabled && (
            <FluentBadge variant='warning' size='sm' rounded>
              已禁用
            </FluentBadge>
          )}
        </div>

        {/* Mobile badges compact */}
        <div className='flex sm:hidden items-center gap-1 shrink-0'>
          <FluentBadge variant='default' size='sm' rounded>
            {source.weight ?? 50}
          </FluentBadge>
          {source.disabled && (
            <FluentBadge variant='warning' size='sm' rounded>
              禁用
            </FluentBadge>
          )}
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          <FluentButton
            variant='ghost'
            size='sm'
            icon={<Pencil className='h-3.5 w-3.5' />}
            onClick={onEdit}
            aria-label='编辑'
          >
            编辑
          </FluentButton>
          <FluentButton
            variant='ghost'
            size='sm'
            onClick={onToggle}
            className={
              source.disabled
                ? 'text-[#22c55e] hover:text-[#16a34a]'
                : 'text-[#f59e0b] hover:text-[#d97706]'
            }
          >
            {source.disabled ? '启用' : '禁用'}
          </FluentButton>
          <FluentButton
            variant='ghost'
            size='sm'
            icon={<Trash2 className='h-3.5 w-3.5' />}
            onClick={onDelete}
            className='text-[#ef4444] hover:text-[#dc2626] hover:bg-red-50 dark:hover:bg-red-500/10'
            aria-label='删除'
          >
            删除
          </FluentButton>
        </div>
      </FluentCard>
    </div>
  );
}
