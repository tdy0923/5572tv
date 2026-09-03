/* eslint-disable unused-imports/no-unused-vars */

'use client';

import {
  CheckCircle,
  KeyRound,
  Plus,
  Search,
  Tag,
  Tv,
  UserRound,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentInput,
  FluentSelect,
} from '@/components/FluentUI';

import {
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

interface UserConfigProps {
  config: AdminConfig | null;
  role: 'owner' | 'admin' | null;
  refreshConfig: () => Promise<void>;
}

export default function UserConfig({
  config,
  role,
  refreshConfig,
}: UserConfigProps) {
  const { showAlert } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [users, setUsers] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editingGroupApis, setEditingGroupApis] = useState<string[]>([]);
  const [editingGroupAdultContent, setEditingGroupAdultContent] =
    useState(false);
  const [editingGroupMembers, setEditingGroupMembers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    tags: [] as string[],
  });
  const [changePassword, setChangePassword] = useState({
    username: '',
    newPassword: '',
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const userGroups = config?.UserConfig?.Tags || [];

  useEffect(() => {
    // Sync state with config on config changes
    if (config?.UserConfig?.Users) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsers(config.UserConfig.Users);
    }
    if (config?.SourceConfig) {
      setSources(config.SourceConfig);
    }
  }, [config]);

  const reload = async () => {
    await refreshConfig();
  };

  const callApi = async (body: any) => {
    const resp = await fetch('/api/admin/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: '操作失败' }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    return resp.json();
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      showError('用户名和密码不能为空', showAlert);
      return;
    }
    await withLoading('addUser', async () => {
      try {
        await callApi({ action: 'add', ...newUser });
        showSuccess('用户添加成功', showAlert);
        setShowAddUserForm(false);
        setNewUser({ username: '', password: '', role: 'user', tags: [] });
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleChangePassword = async () => {
    if (!changePassword.username || !changePassword.newPassword) {
      showError('请选择用户并输入新密码', showAlert);
      return;
    }
    await withLoading('changePassword', async () => {
      try {
        await callApi({
          action: 'changePassword',
          targetUsername: changePassword.username,
          targetPassword: changePassword.newPassword,
        });
        showSuccess('密码修改成功', showAlert);
        setShowChangePasswordForm(false);
        setChangePassword({ username: '', newPassword: '' });
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`确定删除用户 "${username}"？`)) return;
    await withLoading('deleteUser', async () => {
      try {
        await callApi({ action: 'deleteUser', targetUsername: username });
        showSuccess('用户已删除', showAlert);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleBanUser = async (username: string, banned: boolean) => {
    const action = banned ? 'unban' : 'ban';
    await withLoading('banUser', async () => {
      try {
        await callApi({ action, targetUsername: username });
        showSuccess(banned ? '已解除封禁' : '已封禁用户', showAlert);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleSetAdmin = async (username: string, makeAdmin: boolean) => {
    const action = makeAdmin ? 'setAdmin' : 'cancelAdmin';
    await withLoading('setAdmin', async () => {
      try {
        await callApi({ action, targetUsername: username });
        showSuccess(makeAdmin ? '已设为管理员' : '已取消管理员', showAlert);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      showError('分组名称不能为空', showAlert);
      return;
    }
    await withLoading('addGroup', async () => {
      try {
        await callApi({
          action: 'userGroup',
          groupAction: 'add',
          name: newGroupName.trim(),
        });
        showSuccess('分组添加成功', showAlert);
        setNewGroupName('');
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleDeleteGroup = async (name: string) => {
    if (!confirm(`确定删除分组 "${name}"？`)) return;
    await withLoading('deleteGroup', async () => {
      try {
        await callApi({ action: 'userGroup', groupAction: 'delete', name });
        showSuccess('分组已删除', showAlert);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleToggleUserGroup = async (username: string, groupName: string) => {
    const user = users.find((u: any) => u.username === username);
    if (!user) return;
    const currentTags = user.tags || [];
    const newTags = currentTags.includes(groupName)
      ? currentTags.filter((t: string) => t !== groupName)
      : [...currentTags, groupName];
    await withLoading('toggleUserGroup', async () => {
      try {
        await callApi({
          action: 'updateUserGroups',
          targetUsername: username,
          userGroups: newTags,
        });
        showSuccess('分组已更新', showAlert);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const openEditGroup = (group: any) => {
    setEditGroupName(group.name || '');
    setEditingGroupApis(group.enabledApis || []);
    setEditingGroupAdultContent(group.showAdultContent || false);
    // Load members - find users that have this group in their tags
    const members = users
      .filter((u: any) => u.tags && u.tags.includes(group.name))
      .map((u: any) => u.username);
    setEditingGroupMembers(members);
    setShowEditGroupModal(true);
  };

  const handleEditGroup = async () => {
    await withLoading('editGroup', async () => {
      try {
        // Save group permissions
        await callApi({
          action: 'update_tag',
          name: editGroupName,
          enabledApis: editingGroupApis,
          showAdultContent: editingGroupAdultContent,
        });

        // Save member assignments in parallel
        const addPromises: Promise<any>[] = [];
        for (const username of editingGroupMembers) {
          const user = users.find((u: any) => u.username === username);
          if (user && !(user.tags || []).includes(editGroupName)) {
            addPromises.push(
              callApi({
                action: 'userGroup',
                username,
                userGroup: editGroupName,
              }),
            );
          }
        }

        // Remove tag from users not in the list in parallel
        const removePromises: Promise<any>[] = [];
        for (const user of users) {
          if (!editingGroupMembers.includes(user.username)) {
            if ((user.tags || []).includes(editGroupName)) {
              removePromises.push(
                callApi({
                  action: 'userGroup',
                  username: user.username,
                  userGroup: '',
                }),
              );
            }
          }
        }

        // Execute all updates in parallel
        await Promise.all([...addPromises, ...removePromises]);

        showSuccess('分组更新成功', showAlert);
        setShowEditGroupModal(false);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const toggleGroupApi = (apiKey: string) => {
    setEditingGroupApis((prev) =>
      prev.includes(apiKey)
        ? prev.filter((k) => k !== apiKey)
        : [...prev, apiKey],
    );
  };

  const toggleGroupMember = (username: string) => {
    setEditingGroupMembers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username],
    );
  };

  const filteredUsers = users.filter(
    (u: any) =>
      (!searchTerm ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filterRole || u.role === filterRole) &&
      (filterStatus === '' ||
        (filterStatus === 'banned' && u.banned) ||
        (filterStatus === 'active' && !u.banned)),
  );

  const getRoleBadgeVariant = (r: string): 'error' | 'info' | 'default' => {
    switch (r) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'info';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'owner':
        return '站长';
      case 'admin':
        return '管理员';
      default:
        return '用户';
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
            用户与分组
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            集中管理账号、角色与分组权限
          </p>
        </div>
        <div className='flex items-center gap-1.5'>
          <FluentBadge variant='default' size='sm' rounded>
            {users.length} 用户
          </FluentBadge>
          <FluentBadge variant='info' size='sm' rounded>
            {userGroups.length} 分组
          </FluentBadge>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className='flex gap-1 p-1 rounded-xl border bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/5 shadow-sm'>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-250 ease-out ${
            activeTab === 'users'
              ? 'bg-[#f4c24d] text-black shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          <Users className='w-3.5 h-3.5' /> 用户
          <FluentBadge
            variant={activeTab === 'users' ? 'default' : 'default'}
            size='sm'
            rounded
            className='ml-1 !bg-white/70 dark:!bg-white/10 !border-white/50'
          >
            {users.length}
          </FluentBadge>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-4 text-sm font-medium rounded-lg transition-all duration-250 ease-out ${
            activeTab === 'groups'
              ? 'bg-[#f4c24d] text-black shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          <Tag className='w-3.5 h-3.5' /> 分组
          <FluentBadge
            variant='default'
            size='sm'
            rounded
            className='ml-1 !bg-white/70 dark:!bg-white/10 !border-white/50'
          >
            {userGroups.length}
          </FluentBadge>
        </button>
      </div>

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className='space-y-4'>
          {/* 操作按钮 */}
          {role === 'owner' && (
            <div className='flex flex-wrap gap-2'>
              <FluentButton
                variant='primary'
                size='sm'
                icon={<Plus className='h-3.5 w-3.5' />}
                onClick={() => setShowAddUserForm(true)}
              >
                添加用户
              </FluentButton>
              <FluentButton
                variant='secondary'
                size='sm'
                icon={<KeyRound className='h-3.5 w-3.5' />}
                onClick={() => setShowChangePasswordForm(true)}
              >
                修改密码
              </FluentButton>
            </div>
          )}

          {/* 添加用户表单 */}
          {showAddUserForm && (
            <FluentCard padding='16px' className='space-y-3'>
              <div className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-[#22c55e] animate-pulse' />
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
                  添加新用户
                </h4>
                <FluentBadge variant='success' size='sm' rounded>
                  新增
                </FluentBadge>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <FluentInput
                  label='用户名'
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  placeholder='输入用户名'
                />
                <FluentInput
                  label='密码'
                  type='password'
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder='设置初始密码'
                />
                <FluentSelect
                  label='角色'
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  options={[
                    { value: 'user', label: '普通用户' },
                    { value: 'admin', label: '管理员' },
                    ...(role === 'owner'
                      ? [{ value: 'owner', label: '站长' }]
                      : []),
                  ]}
                />
              </div>
              <div className='flex gap-2 pt-1'>
                <FluentButton
                  variant='primary'
                  size='sm'
                  icon={<CheckCircle className='h-3.5 w-3.5' />}
                  loading={isLoading('addUser')}
                  onClick={handleAddUser}
                >
                  确认添加
                </FluentButton>
                <FluentButton
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowAddUserForm(false)}
                >
                  取消
                </FluentButton>
              </div>
            </FluentCard>
          )}

          {/* 修改密码表单 */}
          {showChangePasswordForm && (
            <FluentCard padding='16px' className='space-y-3'>
              <div className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-[#f59e0b] animate-pulse' />
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
                  修改密码
                </h4>
                <FluentBadge variant='warning' size='sm' rounded>
                  安全操作
                </FluentBadge>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <FluentSelect
                  label='选择用户'
                  value={changePassword.username}
                  onChange={(e) =>
                    setChangePassword({
                      ...changePassword,
                      username: e.target.value,
                    })
                  }
                  options={[
                    { value: '', label: '选择用户' },
                    ...users.map((u: any) => ({
                      value: u.username,
                      label: `${u.username} (${getRoleLabel(u.role)})`,
                    })),
                  ]}
                />
                <FluentInput
                  label='新密码'
                  type='password'
                  value={changePassword.newPassword}
                  onChange={(e) =>
                    setChangePassword({
                      ...changePassword,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder='输入新密码'
                />
              </div>
              <div className='flex gap-2 pt-1'>
                <FluentButton
                  variant='primary'
                  size='sm'
                  icon={<KeyRound className='h-3.5 w-3.5' />}
                  loading={isLoading('changePassword')}
                  onClick={handleChangePassword}
                >
                  确认修改
                </FluentButton>
                <FluentButton
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowChangePasswordForm(false)}
                >
                  取消
                </FluentButton>
              </div>
            </FluentCard>
          )}

          {/* 用户列表 */}
          <FluentCard padding='0' className='overflow-hidden'>
            {/* 表格工具栏 */}
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 sm:p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]'>
              <div className='flex-1 min-w-0'>
                <FluentInput
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder='搜索用户名…'
                  prefix={<Search className='w-3.5 h-3.5' />}
                />
              </div>
              <div className='flex items-center gap-2'>
                <FluentSelect
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  options={[
                    { value: '', label: '全部角色' },
                    { value: 'owner', label: '站长' },
                    { value: 'admin', label: '管理员' },
                    { value: 'user', label: '普通用户' },
                  ]}
                  className='min-w-[120px]'
                />
                <FluentSelect
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: '', label: '全部状态' },
                    { value: 'active', label: '正常' },
                    { value: 'banned', label: '已封禁' },
                  ]}
                  className='min-w-[120px]'
                />
              </div>
              <FluentBadge
                variant='default'
                size='sm'
                rounded
                className='shrink-0 self-center'
              >
                {filteredUsers.length} / {users.length} 个用户
              </FluentBadge>
            </div>

            {/* 数据表格 */}
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-gray-50 dark:bg-white/[0.02] text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider'>
                    <th className='px-4 py-3'>用户</th>
                    <th className='px-4 py-3'>角色</th>
                    <th className='px-4 py-3'>分组</th>
                    <th className='px-4 py-3'>状态</th>
                    <th className='px-4 py-3 text-right'>操作</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-white/5'>
                  {filteredUsers.map((u: any) => (
                    <tr
                      key={u.username}
                      className='hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors duration-150'
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-gradient-to-br from-[#f4c24d] to-[#e78a2f] flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-sm'>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {u.username}
                          </span>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <FluentBadge
                          variant={getRoleBadgeVariant(u.role)}
                          size='sm'
                          rounded
                        >
                          {getRoleLabel(u.role)}
                        </FluentBadge>
                      </td>
                      <td className='px-4 py-3'>
                        {role === 'owner' ? (
                          <div className='relative group'>
                            <button className='flex items-center gap-1 text-xs px-2.5 py-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full hover:bg-gray-50 dark:hover:bg-white/10 transition-colors duration-150'>
                              {u.tags && u.tags.length > 0 ? (
                                <div className='flex flex-wrap gap-1'>
                                  {u.tags.map((tag: string) => (
                                    <FluentBadge
                                      key={tag}
                                      variant='info'
                                      size='sm'
                                      rounded
                                    >
                                      {tag}
                                    </FluentBadge>
                                  ))}
                                </div>
                              ) : (
                                <span className='text-[#9ca3af]'>无分组</span>
                              )}
                              <svg
                                className='w-3 h-3 text-[#9ca3af]'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth='2'
                                  d='M19 9l-7 7-7-7'
                                />
                              </svg>
                            </button>
                            <div className='absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-10 hidden group-hover:block overflow-hidden'>
                              <div className='p-2 max-h-48 overflow-y-auto'>
                                {userGroups.length === 0 ? (
                                  <p className='text-xs text-center py-3 text-[#9ca3af]'>
                                    暂无分组
                                  </p>
                                ) : (
                                  userGroups.map((g: any) => (
                                    <label
                                      key={g.name}
                                      className='flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors'
                                    >
                                      <input
                                        type='checkbox'
                                        checked={(u.tags || []).includes(
                                          g.name,
                                        )}
                                        onChange={() =>
                                          handleToggleUserGroup(
                                            u.username,
                                            g.name,
                                          )
                                        }
                                        className='w-3.5 h-3.5 rounded border-gray-300 text-[#f4c24d] focus:ring-[#f4c24d]'
                                      />
                                      <span className='text-xs text-gray-700 dark:text-gray-300'>
                                        {g.name}
                                      </span>
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='flex flex-wrap gap-1'>
                            {u.tags && u.tags.length > 0 ? (
                              u.tags.map((tag: string) => (
                                <FluentBadge
                                  key={tag}
                                  variant='info'
                                  size='sm'
                                  rounded
                                >
                                  {tag}
                                </FluentBadge>
                              ))
                            ) : (
                              <span className='text-[#9ca3af] text-xs'>—</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        {u.banned ? (
                          <FluentBadge variant='error' size='sm' rounded>
                            <span className='w-1.5 h-1.5 rounded-full bg-[#ef4444] inline-block' />
                            封禁
                          </FluentBadge>
                        ) : (
                          <FluentBadge variant='success' size='sm' rounded>
                            <span className='w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block' />
                            正常
                          </FluentBadge>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        {role === 'owner' && u.role !== 'owner' ? (
                          <div className='flex items-center justify-end gap-1'>
                            <FluentButton
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                handleBanUser(u.username, !!u.banned)
                              }
                              className={
                                u.banned
                                  ? '!text-[#22c55e] hover:!bg-green-50 dark:hover:!bg-green-500/10'
                                  : '!text-[#f59e0b] hover:!bg-amber-50 dark:hover:!bg-amber-500/10'
                              }
                            >
                              {u.banned ? '解封' : '封禁'}
                            </FluentButton>
                            {u.role === 'admin' ? (
                              <FluentButton
                                variant='ghost'
                                size='sm'
                                onClick={() =>
                                  handleSetAdmin(u.username, false)
                                }
                                className='!text-[#3b82f6] hover:!bg-blue-50 dark:hover:!bg-blue-500/10'
                              >
                                取消管理
                              </FluentButton>
                            ) : (
                              <FluentButton
                                variant='ghost'
                                size='sm'
                                onClick={() => handleSetAdmin(u.username, true)}
                              >
                                设为管理
                              </FluentButton>
                            )}
                            <FluentButton
                              variant='ghost'
                              size='sm'
                              onClick={() => handleDeleteUser(u.username)}
                              className='!text-[#ef4444] hover:!bg-red-50 dark:hover:!bg-red-500/10'
                            >
                              删除
                            </FluentButton>
                          </div>
                        ) : (
                          <span className='text-xs text-[#9ca3af]'>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <FluentEmptyState
                icon={<UserRound className='h-6 w-6 text-[#9ca3af]' />}
                title='没有找到匹配的用户'
                description={
                  searchTerm || filterRole || filterStatus
                    ? '试试调整搜索或筛选条件'
                    : '暂无用户数据'
                }
              />
            )}
          </FluentCard>
        </div>
      )}

      {/* 分组管理 */}
      {activeTab === 'groups' && (
        <div className='space-y-4'>
          {role === 'owner' && (
            <FluentCard padding='16px'>
              <div className='flex gap-2 items-end'>
                <div className='flex-1'>
                  <FluentInput
                    label='新分组名称'
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder='例如：会员组、高级用户'
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                  />
                </div>
                <FluentButton
                  variant='primary'
                  size='md'
                  icon={<Plus className='h-3.5 w-3.5' />}
                  loading={isLoading('addGroup')}
                  onClick={handleAddGroup}
                >
                  添加分组
                </FluentButton>
              </div>
            </FluentCard>
          )}

          {userGroups.length === 0 ? (
            <FluentCard padding='0'>
              <FluentEmptyState
                icon={<Tag className='h-6 w-6 text-[#9ca3af]' />}
                title='暂无分组'
                description='创建分组后可按分组控制视频源与成人内容权限'
                action={
                  role === 'owner' ? (
                    <FluentButton
                      variant='primary'
                      size='sm'
                      icon={<Plus className='h-3.5 w-3.5' />}
                      onClick={() =>
                        document
                          .querySelector<HTMLInputElement>(
                            'input[placeholder="例如：会员组、高级用户"]',
                          )
                          ?.focus()
                      }
                    >
                      创建分组
                    </FluentButton>
                  ) : undefined
                }
              />
            </FluentCard>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1'>
              {userGroups.map((group: any) => (
                <FluentCard
                  key={group.name}
                  hoverable
                  padding='16px'
                  className='group/card transition-all duration-250 ease-out hover:-translate-y-[1px] hover:shadow-md'
                >
                  <div className='flex items-center justify-between gap-2 mb-3'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <span className='w-8 h-8 rounded-lg bg-gradient-to-br from-[#f4c24d]/20 to-[#e78a2f]/20 border border-[#f4c24d]/20 flex items-center justify-center shrink-0'>
                        <Tag className='w-4 h-4 text-[#f4c24d]' />
                      </span>
                      <span className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                        {group.name}
                      </span>
                    </div>
                    {role === 'owner' && (
                      <div className='flex gap-1 shrink-0'>
                        <Link
                          href={`/admin/users/groups/${encodeURIComponent(group.name)}`}
                        >
                          <FluentButton variant='ghost' size='sm'>
                            编辑
                          </FluentButton>
                        </Link>
                        <FluentButton
                          variant='ghost'
                          size='sm'
                          onClick={() => handleDeleteGroup(group.name)}
                          className='!text-[#ef4444] hover:!bg-red-50 dark:hover:!bg-red-500/10'
                        >
                          删除
                        </FluentButton>
                      </div>
                    )}
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    <FluentBadge variant='info' size='sm' rounded>
                      <Tv className='w-3 h-3' />{' '}
                      {group.enabledApis?.length
                        ? `${group.enabledApis.length} 个源`
                        : '全部源'}
                    </FluentBadge>
                    <FluentBadge
                      variant={group.showAdultContent ? 'warning' : 'success'}
                      size='sm'
                      rounded
                    >
                      {group.showAdultContent ? '成人: 允许' : '成人: 禁止'}
                    </FluentBadge>
                  </div>
                  {/* Hover quick edit */}
                  {role === 'owner' && (
                    <div className='mt-3 pt-3 border-t border-gray-200 dark:border-white/5'>
                      <FluentButton
                        variant='secondary'
                        size='sm'
                        fullWidth
                        onClick={() => openEditGroup(group)}
                      >
                        权限与成员
                      </FluentButton>
                    </div>
                  )}
                </FluentCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 编辑分组弹窗 */}
      {showEditGroupModal && (
        <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-28 border border-gray-200 dark:border-white/10'>
            <div className='px-6 py-4 border-b border-gray-200 dark:border-white/5 shrink-0 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='w-8 h-8 rounded-lg bg-[#f4c24d]/15 flex items-center justify-center'>
                  <Tag className='w-4 h-4 text-[#f4c24d]' />
                </span>
                <h3 className='text-[15px] font-semibold text-gray-900 dark:text-white'>
                  编辑分组: {editGroupName}
                </h3>
                <FluentBadge variant='info' size='sm' rounded>
                  {editingGroupMembers.length} 成员
                </FluentBadge>
              </div>
              <FluentButton
                variant='ghost'
                size='sm'
                onClick={() => setShowEditGroupModal(false)}
              >
                关闭
              </FluentButton>
            </div>
            <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4'>
              {/* 成员管理 */}
              <FluentCard padding='16px'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-semibold flex items-center gap-1.5'>
                    <Users className='w-4 h-4' /> 成员管理
                  </h4>
                  <FluentBadge variant='default' size='sm' rounded>
                    {editingGroupMembers.length} 个成员
                  </FluentBadge>
                </div>
                <p className='text-xs text-[#9ca3af] mb-3'>
                  勾选用户 = 加入此分组。取消勾选 =
                  从分组移除。变更将在保存后生效。
                </p>
                <div className='flex gap-2 mb-3'>
                  <FluentButton
                    variant='secondary'
                    size='sm'
                    onClick={() =>
                      setEditingGroupMembers(users.map((u: any) => u.username))
                    }
                  >
                    全选
                  </FluentButton>
                  <FluentButton
                    variant='ghost'
                    size='sm'
                    onClick={() => setEditingGroupMembers([])}
                  >
                    全不选
                  </FluentButton>
                </div>
                <div className='max-h-[28vh] overflow-y-auto space-y-1 pr-1 border rounded-xl border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-2'>
                  {users.map((u: any) => (
                    <label
                      key={u.username}
                      className='flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors duration-150'
                    >
                      <input
                        type='checkbox'
                        checked={editingGroupMembers.includes(u.username)}
                        onChange={() => toggleGroupMember(u.username)}
                        className='w-4 h-4 rounded border-gray-300 text-[#f4c24d] focus:ring-[#f4c24d]'
                      />
                      <div className='w-7 h-7 rounded-full bg-gradient-to-br from-[#f4c24d] to-[#e78a2f] flex items-center justify-center text-black text-xs font-bold shrink-0'>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className='flex-1 flex items-center gap-2 min-w-0'>
                        <span className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                          {u.username}
                        </span>
                        <FluentBadge
                          variant={getRoleBadgeVariant(u.role)}
                          size='sm'
                          rounded
                        >
                          {getRoleLabel(u.role)}
                        </FluentBadge>
                      </div>
                    </label>
                  ))}
                  {users.length === 0 && (
                    <FluentEmptyState
                      icon={<UserRound className='h-5 w-5 text-[#9ca3af]' />}
                      title='暂无用户'
                      description='请先添加用户'
                    />
                  )}
                </div>
              </FluentCard>

              {/* 成人内容权限 */}
              <FluentCard padding='16px'>
                <h4 className='text-sm font-semibold mb-3'>🔞 成人内容</h4>
                <label className='flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'>
                  <input
                    type='checkbox'
                    checked={editingGroupAdultContent}
                    onChange={(e) =>
                      setEditingGroupAdultContent(e.target.checked)
                    }
                    className='w-5 h-5 rounded border-gray-300 text-[#ef4444] focus:ring-[#ef4444]'
                  />
                  <div>
                    <div className='text-sm font-medium text-gray-900 dark:text-white'>
                      允许查看成人内容
                    </div>
                    <div className='text-xs text-[#9ca3af]'>
                      开启后此分组的用户可以查看成人影片
                    </div>
                  </div>
                  {editingGroupAdultContent ? (
                    <FluentBadge
                      variant='warning'
                      size='sm'
                      rounded
                      className='ml-auto'
                    >
                      已允许
                    </FluentBadge>
                  ) : (
                    <FluentBadge
                      variant='success'
                      size='sm'
                      rounded
                      className='ml-auto'
                    >
                      已禁止
                    </FluentBadge>
                  )}
                </label>
              </FluentCard>
              {/* 源权限 */}
              <FluentCard padding='16px'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-semibold flex items-center gap-1.5'>
                    <Tv className='w-4 h-4' /> 视频源权限
                  </h4>
                  <FluentBadge
                    variant={editingGroupApis.length === 0 ? 'success' : 'info'}
                    size='sm'
                    rounded
                  >
                    {editingGroupApis.length === 0
                      ? '全部源'
                      : `已选 ${editingGroupApis.length} 个源`}
                  </FluentBadge>
                </div>
                <p className='text-xs text-[#9ca3af] mb-3'>
                  不勾选 = 全部源。勾选 =
                  仅勾选的源。细粒度控制分组可访问的播放源。
                </p>
                <div className='max-h-[28vh] overflow-y-auto space-y-1 pr-1 border rounded-xl border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-2'>
                  {sources.length === 0 ? (
                    <FluentEmptyState
                      icon={<Tv className='h-5 w-5 text-[#9ca3af]' />}
                      title='暂无视频源'
                      description='请先配置视频源后再分配权限'
                    />
                  ) : (
                    sources.map((s: any) => (
                      <label
                        key={s.key}
                        className='flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors'
                      >
                        <input
                          type='checkbox'
                          checked={editingGroupApis.includes(s.key)}
                          onChange={() => toggleGroupApi(s.key)}
                          className='w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6]'
                        />
                        <span className='text-sm text-gray-900 dark:text-white flex-1 truncate'>
                          {s.name}
                        </span>
                        {s.is_adult && (
                          <FluentBadge variant='error' size='sm' rounded>
                            成人
                          </FluentBadge>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </FluentCard>
            </div>
            <div className='px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-end gap-2 shrink-0 bg-gray-50/50 dark:bg-white/[0.02] rounded-b-2xl'>
              <FluentButton
                variant='ghost'
                size='md'
                onClick={() => setShowEditGroupModal(false)}
              >
                取消
              </FluentButton>
              <FluentButton
                variant='primary'
                size='md'
                icon={<CheckCircle className='h-4 w-4' />}
                loading={isLoading('editGroup')}
                onClick={handleEditGroup}
              >
                保存分组
              </FluentButton>
            </div>
          </div>
        </div>
      )}

      {/* keep selectedUsers reference */}
      <span className='hidden' aria-hidden>
        {selectedUsers.length}
      </span>
    </div>
  );
}
