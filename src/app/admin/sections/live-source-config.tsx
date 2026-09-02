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
import { GripVertical, Pencil, Plus, Trash2, Tv } from 'lucide-react';
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
  const [orderChanged, setOrderChanged] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

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
        setOrderChanged(false);
        setHasChanges(false);
        showSuccess('直播源配置已保存', showAlert);
        await refreshConfig();
      } catch (err) {
        showError('保存失败: ' + (err as Error).message, showAlert);
      }
    });
  };

  const handleAdd = () => {
    if (!newSource.name?.trim()) {
      showError('名称不能为空', showAlert);
      return;
    }
    if (!newSource.key?.trim()) {
      showError('Key 不能为空', showAlert);
      return;
    }
    if (!newSource.url?.trim()) {
      showError('URL 不能为空', showAlert);
      return;
    }
    if (
      liveSources.some(
        (s, i) => s.key === newSource.key.trim() && i !== editingIndex,
      )
    ) {
      showError('Key 已存在，请使用唯一的 Key', showAlert);
      return;
    }
    try {
      new URL(newSource.url.trim());
    } catch {
      showError('URL 必须是有效的 URL', showAlert);
      return;
    }
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
    setOrderChanged(true);
    setHasChanges(true);
  };

  const handleDelete = (index: number) => {
    if (!window.confirm('确认删除？')) return;
    setLiveSources(liveSources.filter((_, i) => i !== index));
    setOrderChanged(true);
    setHasChanges(true);
  };

  const toggleDisabled = (index: number) => {
    setLiveSources(
      liveSources.map((s, i) =>
        i === index ? { ...s, disabled: !s.disabled } : s,
      ),
    );
    setOrderChanged(true);
    setHasChanges(true);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIdx = liveSources.findIndex((_, i) => `live-${i}` === active.id);
      const newIdx = liveSources.findIndex((_, i) => `live-${i}` === over?.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        setLiveSources(arrayMove(liveSources, oldIdx, newIdx));
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
            直播源配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            拖拽排序 · {liveSources.length} 个源
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
              url: '',
              key: '',
              group: '',
              ua: '',
              epg: '',
              isTvBox: false,
              disabled: false,
            });
          }}
        >
          添加直播源
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
              placeholder='例如：央视直播'
            />
            <FluentInput
              label='Key'
              value={newSource.key}
              onChange={(e) =>
                setNewSource({ ...newSource, key: e.target.value })
              }
              placeholder='唯一标识，如 cctv'
            />
            <div className='sm:col-span-2'>
              <FluentInput
                label='URL'
                value={newSource.url}
                onChange={(e) =>
                  setNewSource({ ...newSource, url: e.target.value })
                }
                placeholder='https://example.com/live.m3u'
              />
            </div>
            <FluentInput
              label='分组'
              value={newSource.group}
              onChange={(e) =>
                setNewSource({ ...newSource, group: e.target.value })
              }
              placeholder='例如：央视、卫视'
            />
            <FluentInput
              label='User-Agent'
              value={newSource.ua}
              onChange={(e) =>
                setNewSource({ ...newSource, ua: e.target.value })
              }
              placeholder='可选，自定义 UA'
            />
            <FluentInput
              label='EPG'
              value={newSource.epg}
              onChange={(e) =>
                setNewSource({ ...newSource, epg: e.target.value })
              }
              placeholder='可选，EPG 地址'
            />
            <div className='flex items-center pt-1 sm:col-span-2'>
              <FluentCheckbox
                label='TVBox 源'
                checked={!!newSource.isTvBox}
                onCheckedChange={(checked) =>
                  setNewSource({ ...newSource, isTvBox: checked })
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
          items={liveSources.map((_, i) => `live-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-2'>
            {liveSources.length === 0 ? (
              <FluentCard padding='0'>
                <FluentEmptyState
                  icon={<Tv className='h-6 w-6 text-[#9ca3af]' />}
                  title='暂无直播源'
                  description='点击“添加直播源”创建第一个直播源，支持拖拽排序与分组'
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
                          url: '',
                          key: '',
                          group: '',
                          ua: '',
                          epg: '',
                          isTvBox: false,
                          disabled: false,
                        });
                      }}
                    >
                      添加直播源
                    </FluentButton>
                  }
                />
              </FluentCard>
            ) : (
              liveSources.map((source, i) => (
                <SortableItem
                  key={`live-${i}`}
                  id={`live-${i}`}
                  source={source}
                  onEdit={() => {
                    setEditingIndex(i);
                    setNewSource(source);
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
      {(orderChanged || hasChanges) && liveSources.length > 0 && (
        <div className='flex items-center gap-3 pt-1'>
          <FluentButton
            variant='primary'
            size='md'
            loading={isLoading('saveLive')}
            onClick={handleSaveAll}
          >
            {isLoading('saveLive') ? '保存中…' : '保存所有直播源'}
          </FluentButton>
          <span
            className='text-xs'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            有未保存的更改
          </span>
        </div>
      )}

      {isLoading('saveLive') && !(orderChanged || hasChanges) && (
        <div className='flex items-center gap-2 text-sm text-[#3b82f6]'>
          <FluentSpinner size='small' />
          <span>保存中...</span>
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
  source: any;
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
            <span
              className={`text-sm font-medium truncate ${source.disabled ? 'line-through text-[#9ca3af]' : 'text-gray-900 dark:text-white'}`}
            >
              {source.name || source.key}
            </span>
            {source.key && source.name && source.key !== source.name && (
              <span className='text-xs text-[#9ca3af] truncate hidden sm:inline'>
                {source.key}
              </span>
            )}
          </div>
          <div className='text-xs truncate text-[#9ca3af] hidden sm:block'>
            {source.url || '—'}
          </div>
        </div>

        <div className='hidden sm:flex items-center gap-1.5 shrink-0'>
          {source.group && (
            <FluentBadge variant='default' size='sm' rounded>
              {source.group}
            </FluentBadge>
          )}
          <FluentBadge
            variant={source.isTvBox ? 'primary' : 'default'}
            size='sm'
            rounded
          >
            {source.isTvBox ? 'TVBox' : '普通'}
          </FluentBadge>
          {source.disabled && (
            <FluentBadge variant='warning' size='sm' rounded>
              已禁用
            </FluentBadge>
          )}
        </div>

        {/* Mobile badges compact */}
        <div className='flex sm:hidden items-center gap-1 shrink-0'>
          <FluentBadge
            variant={source.isTvBox ? 'primary' : 'default'}
            size='sm'
            rounded
          >
            {source.isTvBox ? 'TVBox' : '普通'}
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
