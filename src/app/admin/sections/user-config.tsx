/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

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

  return (
    <div className='space-y-4'>
      {/* Tab 切换 */}
      <div className='flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg'>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === 'users' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        >
          👥 用户 ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === 'groups' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
        >
          🏷️ 分组 ({userGroups.length})
        </button>
      </div>

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className='space-y-4'>
          {/* 操作按钮 */}
          <div className='flex flex-col sm:flex-row gap-3'>
            {role === 'owner' && (
              <div className='flex gap-2'>
                <button
                  onClick={() => setShowAddUserForm(true)}
                  className='px-4 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600'
                >
                  + 添加
                </button>
                <button
                  onClick={() => setShowChangePasswordForm(true)}
                  className='px-4 py-2.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600'
                >
                  🔑 改密
                </button>
              </div>
            )}
          </div>

          {/* 添加用户表单 */}
          {showAddUserForm && (
            <div className='p-4 border rounded-xl bg-green-50 dark:bg-green-900/20 space-y-3'>
              <h4 className='text-sm font-semibold text-green-700 dark:text-green-400'>
                添加新用户
              </h4>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                <input
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  placeholder='用户名'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
                />
                <input
                  type='password'
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder='密码'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
                />
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
                >
                  <option value='user'>普通用户</option>
                  <option value='admin'>管理员</option>
                  {role === 'owner' && <option value='owner'>站长</option>}
                </select>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={handleAddUser}
                  className='px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600'
                >
                  ✅ 确认
                </button>
                <button
                  onClick={() => setShowAddUserForm(false)}
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm'
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 修改密码表单 */}
          {showChangePasswordForm && (
            <div className='p-4 border rounded-xl bg-yellow-50 dark:bg-yellow-900/20 space-y-3'>
              <h4 className='text-sm font-semibold text-yellow-700 dark:text-yellow-400'>
                修改密码
              </h4>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <select
                  value={changePassword.username}
                  onChange={(e) =>
                    setChangePassword({
                      ...changePassword,
                      username: e.target.value,
                    })
                  }
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
                >
                  <option value=''>选择用户</option>
                  {users.map((u: any) => (
                    <option key={u.username} value={u.username}>
                      {u.username} ({getRoleLabel(u.role)})
                    </option>
                  ))}
                </select>
                <input
                  type='password'
                  value={changePassword.newPassword}
                  onChange={(e) =>
                    setChangePassword({
                      ...changePassword,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder='新密码'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
                />
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={handleChangePassword}
                  className='px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600'
                >
                  🔑 确认
                </button>
                <button
                  onClick={() => setShowChangePasswordForm(false)}
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm'
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 用户列表 - 数据表格 */}
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
            {/* 表格工具栏 */}
            <div className='flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex-1 relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder='搜索用户名...'
                  className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
              >
                <option value=''>全部角色</option>
                <option value='owner'>站长</option>
                <option value='admin'>管理员</option>
                <option value='user'>普通用户</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
              >
                <option value=''>全部状态</option>
                <option value='active'>正常</option>
                <option value='banned'>已封禁</option>
              </select>
              <span className='text-sm text-gray-500 dark:text-gray-400'>
                {filteredUsers.length} / {users.length} 个用户
              </span>
            </div>

            {/* 数据表格 */}
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    <th className='px-4 py-3'>用户</th>
                    <th className='px-4 py-3'>角色</th>
                    <th className='px-4 py-3'>分组</th>
                    <th className='px-4 py-3'>状态</th>
                    <th className='px-4 py-3 text-right'>操作</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {filteredUsers.map((u: any) => (
                    <tr
                      key={u.username}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs shrink-0'>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {u.username}
                          </span>
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getRoleBadge(u.role)}`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        {role === 'owner' ? (
                          <div className='relative group'>
                            <button className='flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'>
                              {u.tags && u.tags.length > 0 ? (
                                <div className='flex flex-wrap gap-1'>
                                  {u.tags.map((tag: string) => (
                                    <span
                                      key={tag}
                                      className='px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded'
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className='text-gray-500'>无分组</span>
                              )}
                              <svg
                                className='w-3 h-3 text-gray-400'
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
                            <div className='absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 hidden group-hover:block'>
                              <div className='p-2 max-h-48 overflow-y-auto'>
                                {userGroups.map((g: any) => (
                                  <label
                                    key={g.name}
                                    className='flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer'
                                  >
                                    <input
                                      type='checkbox'
                                      checked={(u.tags || []).includes(g.name)}
                                      onChange={() =>
                                        handleToggleUserGroup(
                                          u.username,
                                          g.name,
                                        )
                                      }
                                      className='w-3 h-3 rounded border-gray-300 text-blue-500'
                                    />
                                    <span className='text-xs'>{g.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='flex flex-wrap gap-1'>
                            {u.tags && u.tags.length > 0 ? (
                              u.tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className='text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full'
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className='text-gray-400'>-</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        {u.banned ? (
                          <span className='inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'>
                            <span className='w-1.5 h-1.5 rounded-full bg-red-500'></span>
                            封禁
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'>
                            <span className='w-1.5 h-1.5 rounded-full bg-green-500'></span>
                            正常
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        {role === 'owner' && u.role !== 'owner' && (
                          <div className='flex items-center justify-end gap-1'>
                            <button
                              onClick={() =>
                                handleBanUser(u.username, !!u.banned)
                              }
                              className={`px-2 py-1 text-xs rounded-lg ${u.banned ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'}`}
                            >
                              {u.banned ? '解封' : '封禁'}
                            </button>
                            {u.role === 'admin' ? (
                              <button
                                onClick={() =>
                                  handleSetAdmin(u.username, false)
                                }
                                className='px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg'
                              >
                                取消管理
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSetAdmin(u.username, true)}
                                className='px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 rounded-lg'
                              >
                                设为管理
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className='px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-lg'
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                没有找到匹配的用户
              </div>
            )}
          </div>
        </div>
      )}

      {/* 分组管理 */}
      {activeTab === 'groups' && (
        <div className='space-y-4'>
          {role === 'owner' && (
            <div className='flex gap-2'>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder='新分组名称'
                className='flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm'
              />
              <button
                onClick={handleAddGroup}
                className='px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600'
              >
                + 添加
              </button>
            </div>
          )}

          <div className='max-h-[70vh] overflow-y-auto space-y-3 pr-1'>
            {userGroups.map((group: any) => (
              <div
                key={group.name}
                className='p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl'
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>🏷️</span>
                    <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                      {group.name}
                    </span>
                  </div>
                  {role === 'owner' && (
                    <div className='flex gap-1'>
                      <Link
                        href={`/admin/users/groups/${encodeURIComponent(group.name)}`}
                        className='px-3 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600'
                      >
                        编辑
                      </Link>
                      <button
                        onClick={() => handleDeleteGroup(group.name)}
                        className='px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600'
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 space-y-1'>
                  <div>📺 可用源: {group.enabledApis?.length || '全部'}</div>
                  <div>
                    🔞 成人内容: {group.showAdultContent ? '允许' : '禁止'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 编辑分组弹窗 */}
      {showEditGroupModal && (
        <div className='fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl'>
            <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0'>
              <h3 className='text-lg font-semibold'>
                🏷️ 编辑分组: {editGroupName}
              </h3>
            </div>
            <div className='flex-1 overflow-y-auto px-6 py-4 space-y-6'>
              {/* 成员管理 */}
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-semibold'>👥 成员管理</h4>
                  <span className='text-xs text-gray-500'>
                    {editingGroupMembers.length} 个成员
                  </span>
                </div>
                <p className='text-xs text-gray-500 mb-3'>
                  勾选用户 = 加入此分组。取消勾选 = 从分组移除。
                </p>
                <div className='flex gap-2 mb-3'>
                  <button
                    onClick={() =>
                      setEditingGroupMembers(users.map((u: any) => u.username))
                    }
                    className='px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800/30'
                  >
                    全选
                  </button>
                  <button
                    onClick={() => setEditingGroupMembers([])}
                    className='px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-500'
                  >
                    全不选
                  </button>
                </div>
                <div className='max-h-[50vh] overflow-y-auto space-y-1 pr-1'>
                  {users.map((u: any) => (
                    <label
                      key={u.username}
                      className='flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg cursor-pointer'
                    >
                      <input
                        type='checkbox'
                        checked={editingGroupMembers.includes(u.username)}
                        onChange={() => toggleGroupMember(u.username)}
                        className='w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500'
                      />
                      <div className='w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0'>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className='flex-1'>
                        <span className='text-sm font-medium'>
                          {u.username}
                        </span>
                        <span
                          className={`ml-2 text-xs px-1.5 py-0.5 rounded ${getRoleBadge(u.role)}`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 成人内容权限 */}
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                <h4 className='text-sm font-semibold mb-3'>🔞 成人内容</h4>
                <label className='flex items-center gap-3 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={editingGroupAdultContent}
                    onChange={(e) =>
                      setEditingGroupAdultContent(e.target.checked)
                    }
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
              {/* 源权限 */}
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-semibold'>📺 视频源权限</h4>
                  <span className='text-xs text-gray-500'>
                    {editingGroupApis.length === 0
                      ? '全部源'
                      : `已选 ${editingGroupApis.length} 个源`}
                  </span>
                </div>
                <p className='text-xs text-gray-500 mb-3'>
                  不勾选 = 全部源。勾选 = 仅勾选的源。
                </p>
                <div className='max-h-[50vh] overflow-y-auto space-y-1 pr-1'>
                  {sources.map((s: any) => (
                    <label
                      key={s.key}
                      className='flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg cursor-pointer'
                    >
                      <input
                        type='checkbox'
                        checked={editingGroupApis.includes(s.key)}
                        onChange={() => toggleGroupApi(s.key)}
                        className='w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500'
                      />
                      <span className='text-sm'>{s.name}</span>
                      {s.is_adult && (
                        <span className='text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'>
                          成人
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className='px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0'>
              <button
                onClick={() => setShowEditGroupModal(false)}
                className='px-5 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium'
              >
                取消
              </button>
              <button
                onClick={handleEditGroup}
                className='px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600'
              >
                💾 保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
