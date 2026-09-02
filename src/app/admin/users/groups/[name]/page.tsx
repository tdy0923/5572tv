'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { AdminConfig } from '@/lib/admin.types';

import { FluentBadge } from '@/components/FluentBadge';
import { FluentButton } from '@/components/FluentButton';
import { FluentCard } from '@/components/FluentCard';
import { FluentEmptyState } from '@/components/FluentEmptyState';
import { FluentSpinner } from '@/components/FluentSpinner';
import PageLayout from '@/components/PageLayout';

export default function GroupEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupName = decodeURIComponent(params.name as string);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAdultContent, setShowAdultContent] = useState(false);
  const [selectedApis, setSelectedApis] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch config
  const { data: config, isLoading } = useQuery({
    queryKey: ['admin', 'config'],
    queryFn: async () => {
      const res = await fetch('/api/admin/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      const result = await res.json();
      // API returns { Role, Config } - extract Config
      return (result.Config || result.config || result) as AdminConfig;
    },
  });

  // Sources come from config
  const sources = config?.SourceConfig || [];

  // Initialize state from config
  useEffect(() => {
    if (!config) return;
    const group = (config.UserConfig as any)?.Tags?.find(
      (t: any) => t.name === groupName,
    );
    if (group) {
      // Find members of this group
      const members = (config.UserConfig?.Users || [])
        .filter((u: any) => u.tags?.includes(groupName))
        .map((u: any) => u.username);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedUsers(members);

      setShowAdultContent(group.showAdultContent || false);

      setSelectedApis(group.enabledApis || []);
    }
  }, [config, groupName]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batchUpdateUserGroups',
          usernames: selectedUsers,
          userGroups: [groupName],
        }),
      });
      if (!res.ok) throw new Error('Failed to save');

      // Update group settings
      const res2 = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'userGroup',
          name: groupName,
          showAdultContent,
          enabledApis: selectedApis.length > 0 ? selectedApis : undefined,
        }),
      });
      if (!res2.ok) throw new Error('Failed to save group settings');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
      setHasChanges(false);
      router.push('/admin?section=user-config');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_tag', name: groupName }),
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
      router.push('/admin?section=user-config');
    },
  });

  const toggleUser = (username: string) => {
    setSelectedUsers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username],
    );
    setHasChanges(true);
  };

  const toggleApi = (apiKey: string) => {
    setSelectedApis((prev) =>
      prev.includes(apiKey)
        ? prev.filter((k) => k !== apiKey)
        : [...prev, apiKey],
    );
    setHasChanges(true);
  };

  const users = config?.UserConfig?.Users || [];
  const getRoleVariant = (role: string): 'error' | 'info' | 'default' => {
    switch (role) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'info';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return '站长';
      case 'admin':
        return '管理员';
      default:
        return '用户';
    }
  };

  if (isLoading) {
    return (
      <PageLayout activePath='/admin'>
        <div className='max-w-4xl mx-auto p-6'>
          <FluentCard padding='24px' className='flex flex-col items-center justify-center py-16'>
            <FluentSpinner size='large' label='加载中...' />
            <p className='mt-3 text-sm' style={{ color: 'var(--color-foreground-muted)' }}>
              正在加载分组信息
            </p>
          </FluentCard>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath='/admin'>
      <div className='max-w-4xl mx-auto p-6 space-y-6'>
        {/* Header */}
        <FluentCard padding='16px' className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <div className='flex items-center gap-4 min-w-0'>
            <Link
              href='/admin?section=user-config'
              className='p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0'
              aria-label='返回'
            >
              <ArrowLeft className='w-5 h-5' />
            </Link>
            <div className='min-w-0'>
              <h1 className='text-xl font-semibold tracking-tight text-gray-900 dark:text-white truncate'>
                编辑分组: <span style={{ color: 'var(--color-primary-500)' }}>{groupName}</span>
              </h1>
              <p className='text-sm mt-0.5' style={{ color: 'var(--color-foreground-muted)' }}>
                管理分组成员、权限和视频源访问
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <FluentButton
              variant='danger'
              size='md'
              icon={<Trash2 className='w-4 h-4' />}
              loading={deleteMutation.isPending}
              onClick={() => {
                if (confirm('确定要删除此分组吗？')) {
                  deleteMutation.mutate();
                }
              }}
            >
              删除分组
            </FluentButton>
            <FluentButton
              variant='primary'
              size='md'
              icon={<Save className='w-4 h-4' />}
              loading={saveMutation.isPending}
              disabled={!hasChanges || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? '保存中…' : '保存'}
            </FluentButton>
          </div>
        </FluentCard>

        {hasChanges && (
          <div className='flex items-center gap-2 text-xs px-1' style={{ color: 'var(--color-foreground-muted)' }}>
            <span className='w-1.5 h-1.5 rounded-full bg-[#f59e0b] inline-block animate-pulse' />
            有未保存的更改
          </div>
        )}

        {/* Member Management */}
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <span className='w-8 h-8 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
                <Users className='w-4 h-4 text-[#3b82f6]' />
              </span>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>成员管理</h2>
              <FluentBadge variant='info' size='sm' rounded>
                {selectedUsers.length} / {users.length} 个成员
              </FluentBadge>
            </div>
          </div>
          <p className='text-xs leading-relaxed' style={{ color: 'var(--color-foreground-muted)' }}>
            勾选用户 = 加入此分组。取消勾选 = 从分组移除。
          </p>
          <div className='flex gap-2'>
            <FluentButton
              variant='secondary'
              size='sm'
              onClick={() => {
                setSelectedUsers(users.map((u: any) => u.username));
                setHasChanges(true);
              }}
            >
              全选
            </FluentButton>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() => {
                setSelectedUsers([]);
                setHasChanges(true);
              }}
            >
              全不选
            </FluentButton>
          </div>
          {users.length === 0 ? (
            <FluentEmptyState
              icon={<Users className='h-6 w-6 text-[#9ca3af]' />}
              title='暂无用户'
              description='请先在用户管理中添加用户'
            />
          ) : (
            <div className='max-h-[50vh] overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-2'>
              {users.map((u: any) => (
                <label
                  key={u.username}
                  className='flex items-center gap-3 p-3 bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.05] rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/5'
                >
                  <input
                    type='checkbox'
                    checked={selectedUsers.includes(u.username)}
                    onChange={() => toggleUser(u.username)}
                    className='w-4 h-4 rounded border-gray-300 text-[#f4c24d] focus:ring-[#f4c24d] shrink-0'
                  />
                  <div className='w-8 h-8 rounded-full bg-gradient-to-br from-[#f4c24d] to-[#e78a2f] flex items-center justify-center text-black text-xs font-bold shrink-0 shadow-sm'>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className='flex-1 flex items-center gap-2 min-w-0'>
                    <span className='text-sm font-medium text-gray-900 dark:text-white truncate'>{u.username}</span>
                    <FluentBadge variant={getRoleVariant(u.role)} size='sm' rounded>
                      {getRoleLabel(u.role)}
                    </FluentBadge>
                  </div>
                </label>
              ))}
            </div>
          )}
        </FluentCard>

        {/* Adult Content Permission */}
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${showAdultContent ? 'bg-[#ef4444]/15' : 'bg-gray-100 dark:bg-white/5'}`}>
              {showAdultContent ? (
                <Eye className='w-4 h-4 text-[#ef4444]' />
              ) : (
                <EyeOff className='w-4 h-4 text-[#9ca3af]' />
              )}
            </span>
            <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>成人内容权限</h2>
            <FluentBadge variant={showAdultContent ? 'warning' : 'success'} size='sm' rounded>
              {showAdultContent ? '已允许' : '已禁止'}
            </FluentBadge>
          </div>
          <label className='flex items-center gap-4 cursor-pointer p-3 rounded-xl border bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors'>
            <input
              type='checkbox'
              checked={showAdultContent}
              onChange={(e) => {
                setShowAdultContent(e.target.checked);
                setHasChanges(true);
              }}
              className='w-5 h-5 rounded border-gray-300 text-[#ef4444] focus:ring-[#ef4444] shrink-0'
            />
            <div className='flex-1 min-w-0'>
              <div className='text-sm font-medium text-gray-900 dark:text-white'>允许查看成人内容</div>
              <div className='text-xs mt-0.5' style={{ color: 'var(--color-foreground-muted)' }}>
                开启后此分组的用户可以查看成人影片
              </div>
            </div>
          </label>
        </FluentCard>

        {/* Video Source Permissions */}
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <span className='w-8 h-8 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center'>
                <Shield className='w-4 h-4 text-[#8b5cf6]' />
              </span>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>视频源权限</h2>
            </div>
            <FluentBadge variant={selectedApis.length === 0 ? 'success' : 'info'} size='sm' rounded>
              {selectedApis.length === 0 ? '全部源' : `已选 ${selectedApis.length} 个源`}
            </FluentBadge>
          </div>
          <p className='text-xs leading-relaxed' style={{ color: 'var(--color-foreground-muted)' }}>
            不勾选 = 全部源。勾选 = 仅勾选的源。
          </p>
          {sources.length === 0 ? (
            <FluentEmptyState
              icon={<Shield className='h-6 w-6 text-[#9ca3af]' />}
              title='暂无视频源'
              description='请先配置视频源后再分配权限'
            />
          ) : (
            <div className='max-h-[40vh] overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-2'>
              {sources.map((s: any) => (
                <label
                  key={s.key}
                  className='flex items-center gap-3 p-3 bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.05] rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/5'
                >
                  <input
                    type='checkbox'
                    checked={selectedApis.includes(s.key)}
                    onChange={() => toggleApi(s.key)}
                    className='w-4 h-4 rounded border-gray-300 text-[#8b5cf6] focus:ring-[#8b5cf6] shrink-0'
                  />
                  <span className='text-sm text-gray-900 dark:text-white flex-1 min-w-0 truncate'>{s.name}</span>
                  {s.is_adult && (
                    <FluentBadge variant='error' size='sm' rounded>
                      成人
                    </FluentBadge>
                  )}
                </label>
              ))}
            </div>
          )}
        </FluentCard>

        {/* Bottom sticky save bar - mobile friendly */}
        <FluentCard padding='12px' className='flex items-center justify-between gap-3 sticky bottom-4 shadow-lg backdrop-blur bg-white/80 dark:bg-[#1a1a1a]/80'>
          <div className='text-xs' style={{ color: 'var(--color-foreground-muted)' }}>
            {hasChanges ? '有未保存的更改' : '已同步'}
          </div>
          <div className='flex gap-2'>
            <FluentButton variant='ghost' size='sm' onClick={() => router.push('/admin?section=user-config')}>
              取消
            </FluentButton>
            <FluentButton
              variant='primary'
              size='sm'
              icon={<Save className='w-3.5 h-3.5' />}
              loading={saveMutation.isPending}
              disabled={!hasChanges || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              保存
            </FluentButton>
          </div>
        </FluentCard>
      </div>
    </PageLayout>
  );
}
