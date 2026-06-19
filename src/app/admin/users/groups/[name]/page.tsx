'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { AdminConfig } from '@/lib/admin.types';

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
      return (result.Config || result) as AdminConfig;
    },
  });

  // Sources come from config
  const sources = config?.SourceConfig || [];

  // Initialize state from config
  useEffect(() => {
    if (!config) return;
    const group = config.UserConfig?.Tags?.find(
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
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'admin':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <PageLayout activePath='/admin'>
        <div className='flex items-center justify-center py-20'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-500' />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath='/admin'>
      <div className='max-w-4xl mx-auto p-6'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-4'>
            <Link
              href='/admin?section=user-config'
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            >
              <ArrowLeft className='w-5 h-5' />
            </Link>
            <div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                编辑分组: {groupName}
              </h1>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                管理分组成员、权限和视频源访问
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => {
                if (confirm('确定要删除此分组吗？')) {
                  deleteMutation.mutate();
                }
              }}
              className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2'
            >
              <Trash2 className='w-4 h-4' />
              删除分组
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50'
            >
              {saveMutation.isPending ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Save className='w-4 h-4' />
              )}
              保存
            </button>
          </div>
        </div>

        {/* Member Management */}
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <Users className='w-5 h-5 text-blue-500' />
              <h2 className='text-lg font-semibold'>成员管理</h2>
            </div>
            <span className='text-sm text-gray-500'>
              {selectedUsers.length} / {users.length} 个成员
            </span>
          </div>
          <p className='text-sm text-gray-500 mb-4'>
            勾选用户 = 加入此分组。取消勾选 = 从分组移除。
          </p>
          <div className='flex gap-2 mb-4'>
            <button
              onClick={() => {
                setSelectedUsers(users.map((u: any) => u.username));
                setHasChanges(true);
              }}
              className='px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800/30'
            >
              全选
            </button>
            <button
              onClick={() => {
                setSelectedUsers([]);
                setHasChanges(true);
              }}
              className='px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600'
            >
              全不选
            </button>
          </div>
          <div className='max-h-[50vh] overflow-y-auto space-y-2 pr-1'>
            {users.map((u: any) => (
              <label
                key={u.username}
                className='flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors'
              >
                <input
                  type='checkbox'
                  checked={selectedUsers.includes(u.username)}
                  onChange={() => toggleUser(u.username)}
                  className='w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500'
                />
                <div className='w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0'>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className='flex-1'>
                  <span className='text-sm font-medium'>{u.username}</span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getRoleBadge(u.role)}`}
                  >
                    {u.role}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Adult Content Permission */}
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6'>
          <div className='flex items-center gap-2 mb-4'>
            {showAdultContent ? (
              <Eye className='w-5 h-5 text-red-500' />
            ) : (
              <EyeOff className='w-5 h-5 text-gray-400' />
            )}
            <h2 className='text-lg font-semibold'>成人内容权限</h2>
          </div>
          <label className='flex items-center gap-4 cursor-pointer'>
            <input
              type='checkbox'
              checked={showAdultContent}
              onChange={(e) => {
                setShowAdultContent(e.target.checked);
                setHasChanges(true);
              }}
              className='w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500'
            />
            <div>
              <div className='text-sm font-medium'>允许查看成人内容</div>
              <div className='text-xs text-gray-500'>
                开启后此分组的用户可以查看成人影片
              </div>
            </div>
          </label>
        </div>

        {/* Video Source Permissions */}
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <Shield className='w-5 h-5 text-purple-500' />
              <h2 className='text-lg font-semibold'>视频源权限</h2>
            </div>
            <span className='text-sm text-gray-500'>
              {selectedApis.length === 0
                ? '全部源'
                : `已选 ${selectedApis.length} 个源`}
            </span>
          </div>
          <p className='text-sm text-gray-500 mb-4'>
            不勾选 = 全部源。勾选 = 仅勾选的源。
          </p>
          <div className='max-h-[40vh] overflow-y-auto space-y-2 pr-1'>
            {sources.map((s: any) => (
              <label
                key={s.key}
                className='flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors'
              >
                <input
                  type='checkbox'
                  checked={selectedApis.includes(s.key)}
                  onChange={() => toggleApi(s.key)}
                  className='w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500'
                />
                <span className='text-sm'>{s.name}</span>
                {s.is_adult && (
                  <span className='text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'>
                    成人
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
