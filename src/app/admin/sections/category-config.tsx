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
import { GripVertical, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentInput,
  FluentSelect,
  FluentSpinner,
} from '@/components/FluentUI';

import {
  showError,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

interface CustomCategory {
  name?: string;
  type: 'movie' | 'tv';
  query: string;
  disabled?: boolean;
  from: 'config' | 'custom';
}

function SortableCategoryItem({
  category,
  onEdit,
  onDelete,
  onToggle,
}: {
  category: CustomCategory & { id: string };
  index: number;
  onEdit: (cat: CustomCategory & { id: string }) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
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
          className='cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 shrink-0 touch-manipulation'
          aria-label='拖拽排序'
        >
          <GripVertical className='w-4 h-4 text-[#9ca3af]' />
        </button>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <span
              className={`text-sm font-medium truncate ${category.disabled ? 'line-through text-[#9ca3af]' : 'text-gray-900 dark:text-white'}`}
            >
              {category.name || category.query.slice(0, 30) || '未命名分类'}
            </span>
            {category.name && category.query && category.name !== category.query && (
              <span className='text-xs text-[#9ca3af] truncate hidden sm:inline'>
                {category.query.slice(0, 24)}
              </span>
            )}
          </div>
          <div className='text-xs truncate text-[#9ca3af] hidden sm:block'>
            {category.query || '—'}
          </div>
        </div>

        <div className='hidden sm:flex items-center gap-1.5 shrink-0'>
          <FluentBadge
            variant={category.type === 'movie' ? 'info' : 'success'}
            size='sm'
            rounded
          >
            {category.type === 'movie' ? '电影' : '剧集'}
          </FluentBadge>
          <FluentBadge variant='default' size='sm' rounded>
            {category.from === 'config' ? '配置' : '自定义'}
          </FluentBadge>
          {category.disabled && (
            <FluentBadge variant='warning' size='sm' rounded>
              已禁用
            </FluentBadge>
          )}
        </div>

        {/* Mobile badges compact */}
        <div className='flex sm:hidden items-center gap-1 shrink-0'>
          <FluentBadge
            variant={category.type === 'movie' ? 'info' : 'success'}
            size='sm'
            rounded
          >
            {category.type === 'movie' ? '电影' : '剧集'}
          </FluentBadge>
          {category.disabled && (
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
            onClick={() => onEdit(category)}
            aria-label='编辑'
          >
            编辑
          </FluentButton>
          <FluentButton
            variant='ghost'
            size='sm'
            onClick={() => onToggle(category.id)}
            className={
              category.disabled
                ? 'text-[#22c55e] hover:text-[#16a34a]'
                : 'text-[#f59e0b] hover:text-[#d97706]'
            }
          >
            {category.disabled ? '启用' : '禁用'}
          </FluentButton>
          <FluentButton
            variant='ghost'
            size='sm'
            icon={<Trash2 className='h-3.5 w-3.5' />}
            onClick={() => onDelete(category.id)}
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

interface CategoryConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

export default function CategoryConfig({
  config,
  refreshConfig,
}: CategoryConfigProps) {
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [newCategory, setNewCategory] = useState<CustomCategory>({
    name: '',
    type: 'movie',
    query: '',
    disabled: false,
    from: 'config',
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  useEffect(() => {
    if (
      (config as any)?.CustomCategories &&
      Array.isArray((config as any).CustomCategories)
    ) {
      setCategories((config as any).CustomCategories);
    }
  }, [config]);

  const handleSave = async () => {
    await withLoading('saveCategory', async () => {
      try {
        const resp = await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'CustomCategories',
            value: categories,
          }),
        });
        if (!resp.ok) throw new Error('保存失败');
        setOrderChanged(false);
        showAlert({ type: 'success', title: '保存成功', timer: 2000 });
        await refreshConfig();
      } catch (err) {
        showError('保存失败: ' + (err as Error).message, showAlert);
      }
    });
  };

  const handleAdd = () => {
    if (!newCategory.query.trim()) {
      showError('搜索关键词不能为空', showAlert);
      return;
    }
    if (
      categories.some((c, i) => c.query === newCategory.query.trim() && i !== editingIndex)
    ) {
      showError('关键词已存在，请使用唯一的关键词', showAlert);
      return;
    }
    setCategories([...categories, newCategory]);
    setNewCategory({
      name: '',
      type: 'movie',
      query: '',
      disabled: false,
      from: 'config',
    });
    setShowAddForm(false);
    setOrderChanged(true);
  };

  const handleUpdate = () => {
    if (!newCategory.query.trim()) {
      showError('搜索关键词不能为空', showAlert);
      return;
    }
    if (
      categories.some((c, i) => c.query === newCategory.query.trim() && i !== editingIndex)
    ) {
      showError('关键词已存在，请使用唯一的关键词', showAlert);
      return;
    }
    if (editingIndex !== null) {
      const updated = [...categories];
      updated[editingIndex] = newCategory;
      setCategories(updated);
      setEditingIndex(null);
      setNewCategory({
        name: '',
        type: 'movie',
        query: '',
        disabled: false,
        from: 'config',
      });
      setShowAddForm(false);
      setOrderChanged(true);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((_, i) => `cat-${i}` === active.id);
    const newIndex = categories.findIndex((_, i) => `cat-${i}` === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setCategories(arrayMove(categories, oldIndex, newIndex));
      setOrderChanged(true);
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
            分类配置
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            拖拽排序 · {categories.length} 个分类
          </p>
        </div>
        <FluentButton
          variant='primary'
          size='sm'
          icon={<Plus className='h-3.5 w-3.5' />}
          onClick={() => {
            setShowAddForm(true);
            setEditingIndex(null);
            setNewCategory({
              name: '',
              type: 'movie',
              query: '',
              disabled: false,
              from: 'config',
            });
          }}
        >
          添加分类
        </FluentButton>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <FluentInput
              label='分类名称（可选）'
              value={newCategory.name || ''}
              onChange={(e) =>
                setNewCategory({ ...newCategory, name: e.target.value })
              }
              placeholder='例如：热门电影'
            />
            <FluentSelect
              label='类型'
              value={newCategory.type}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  type: e.target.value as 'movie' | 'tv',
                })
              }
              options={[
                { value: 'movie', label: '电影' },
                { value: 'tv', label: '剧集' },
              ]}
            />
            <div className='sm:col-span-2'>
              <FluentInput
                label='搜索关键词'
                value={newCategory.query}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, query: e.target.value })
                }
                placeholder='用于搜索的关键词，例如：action'
              />
            </div>
          </div>
          <div className='flex gap-2 pt-1'>
            <FluentButton
              variant='primary'
              size='sm'
              onClick={editingIndex !== null ? handleUpdate : handleAdd}
            >
              {editingIndex !== null ? '更新' : '添加'}
            </FluentButton>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
                setNewCategory({
                  name: '',
                  type: 'movie',
                  query: '',
                  disabled: false,
                  from: 'config',
                });
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
          items={categories.map((_, i) => `cat-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-2'>
            {categories.length === 0 ? (
              <FluentCard padding='0'>
                <FluentEmptyState
                  icon={<Layers className='h-6 w-6 text-[#9ca3af]' />}
                  title='暂无分类'
                  description='点击“添加分类”创建第一个分类，支持拖拽排序、启用/禁用与类型区分'
                  action={
                    <FluentButton
                      variant='primary'
                      size='sm'
                      icon={<Plus className='h-3.5 w-3.5' />}
                      onClick={() => {
                        setShowAddForm(true);
                        setEditingIndex(null);
                        setNewCategory({
                          name: '',
                          type: 'movie',
                          query: '',
                          disabled: false,
                          from: 'config',
                        });
                      }}
                    >
                      添加分类
                    </FluentButton>
                  }
                />
              </FluentCard>
            ) : (
              categories.map((cat, i) => (
                <SortableCategoryItem
                  key={`cat-${i}`}
                  category={{ ...cat, id: `cat-${i}` }}
                  index={i}
                  onEdit={(c) => {
                    const idx = parseInt(c.id.replace('cat-', ''), 10);
                    setEditingIndex(idx);
                    setNewCategory(categories[idx]);
                    setShowAddForm(true);
                  }}
                  onDelete={(id) => {
                    if (!window.confirm('确认删除？')) return;
                    const idx = parseInt(id.replace('cat-', ''), 10);
                    setCategories(categories.filter((_, i) => i !== idx));
                    setOrderChanged(true);
                  }}
                  onToggle={(id) => {
                    const idx = parseInt(id.replace('cat-', ''), 10);
                    const updated = [...categories];
                    updated[idx] = {
                      ...updated[idx],
                      disabled: !updated[idx].disabled,
                    };
                    setCategories(updated);
                    setOrderChanged(true);
                  }}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Save bar */}
      {orderChanged && (
        <div className='flex items-center gap-3 pt-1'>
          <FluentButton
            variant='primary'
            size='md'
            loading={isLoading('saveCategory')}
            onClick={handleSave}
          >
            {isLoading('saveCategory') ? '保存中…' : '保存排序'}
          </FluentButton>
          <span
            className='text-xs'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            有未保存的更改
          </span>
        </div>
      )}

      {isLoading('saveCategory') && !orderChanged && (
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
