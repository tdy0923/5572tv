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
import { Check, Edit3, GripVertical, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  buttonStyles,
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
  index,
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border rounded-lg'
    >
      <button
        {...attributes}
        {...listeners}
        className='cursor-grab active:cursor-grabbing p-1'
      >
        <GripVertical className='w-4 h-4 text-gray-400' />
      </button>
      <span className='flex-1 text-sm'>
        {category.name || category.query.slice(0, 30)}
        {category.disabled && (
          <span className='text-xs text-gray-400 ml-1'>(已禁用)</span>
        )}
      </span>
      <span className='text-xs text-gray-500 w-12'>{category.type}</span>
      <button
        onClick={() => onEdit(category)}
        className='p-1 text-blue-600 hover:text-blue-800'
      >
        <Edit3 className='w-4 h-4' />
      </button>
      <button onClick={() => onToggle(category.id)} className='p-1'>
        {category.disabled ? (
          <Check className='w-4 h-4 text-green-600' />
        ) : (
          <X className='w-4 h-4 text-gray-400' />
        )}
      </button>
      <button
        onClick={() => onDelete(category.id)}
        className='p-1 text-red-600 hover:text-red-800'
      >
        <X className='w-4 h-4' />
      </button>
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
            key: 'CategoryConfig.Categories',
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
      setOrderChanged(true);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((_, i) => `cat-${i}` === active.id);
      const newIndex = categories.findIndex((_, i) => `cat-${i}` === over.id);
      setCategories(arrayMove(categories, oldIndex, newIndex));
      setOrderChanged(true);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold'>分类配置</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className={buttonStyles.successSmall}
        >
          添加分类
        </button>
      </div>

      {showAddForm && (
        <div className='p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
          <input
            placeholder='分类名称（可选）'
            value={newCategory.name || ''}
            onChange={(e) =>
              setNewCategory({ ...newCategory, name: e.target.value })
            }
            className='w-full px-3 py-2 border rounded-lg text-sm'
          />
          <input
            placeholder='搜索关键词'
            value={newCategory.query}
            onChange={(e) =>
              setNewCategory({ ...newCategory, query: e.target.value })
            }
            className='w-full px-3 py-2 border rounded-lg text-sm'
          />
          <div className='flex gap-2'>
            <select
              value={newCategory.type}
              onChange={(e) =>
                setNewCategory({
                  ...newCategory,
                  type: e.target.value as 'movie' | 'tv',
                })
              }
              className='px-3 py-2 border rounded-lg text-sm'
            >
              <option value='movie'>电影</option>
              <option value='tv'>剧集</option>
            </select>
            <button
              onClick={editingIndex !== null ? handleUpdate : handleAdd}
              className={buttonStyles.primarySmall}
            >
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
          items={categories.map((_, i) => `cat-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-2'>
            {categories.map((cat, i) => (
              <SortableCategoryItem
                key={`cat-${i}`}
                category={{ ...cat, id: `cat-${i}` }}
                index={i}
                onEdit={(c) => {
                  const idx = parseInt(c.id.replace('cat-', ''));
                  setEditingIndex(idx);
                  setNewCategory(categories[idx]);
                  setShowAddForm(true);
                }}
                onDelete={(id) => {
                  const idx = parseInt(id.replace('cat-', ''));
                  setCategories(categories.filter((_, i) => i !== idx));
                  setOrderChanged(true);
                }}
                onToggle={(id) => {
                  const idx = parseInt(id.replace('cat-', ''));
                  const updated = [...categories];
                  updated[idx] = {
                    ...updated[idx],
                    disabled: !updated[idx].disabled,
                  };
                  setCategories(updated);
                  setOrderChanged(true);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {orderChanged && (
        <button onClick={handleSave} className={buttonStyles.primary}>
          保存排序
        </button>
      )}
    </div>
  );
}
