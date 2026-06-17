/* eslint-disable unused-imports/no-unused-vars */

'use client';

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
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showAddUserGroupForm, setShowAddUserGroupForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user' as string,
    tags: [] as string[],
  });
  const [changePassword, setChangePassword] = useState({
    username: '',
    newPassword: '',
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditUserRolesModal, setShowEditUserRolesModal] = useState(false);
  const [editingUserTagUsers, setEditingUserTagUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');

  const userGroups = config?.UserConfig?.Tags || [];

  useEffect(() => {
    requestAnimationFrame(() => {
      if (config?.UserConfig?.Users) setUsers(config.UserConfig.Users);
    });
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
        await callApi({
          action: 'add',
          username: newUser.username,
          password: newUser.password,
          role: newUser.role,
          tags: newUser.tags,
        });
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
          action: 'change_password',
          username: changePassword.username,
          newPassword: changePassword.newPassword,
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
    if (!confirm(`确定要删除用户 "${username}" 吗？`)) return;

    await withLoading('deleteUser', async () => {
      try {
        await callApi({ action: 'delete', username });
        showSuccess('用户已删除', showAlert);
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
          action: 'add_tag',
          name: newGroupName.trim(),
        });
        showSuccess('分组添加成功', showAlert);
        setShowAddUserGroupForm(false);
        setNewGroupName('');
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleDeleteGroup = async (groupName: string) => {
    if (!confirm(`确定要删除分组 "${groupName}" 吗？`)) return;

    await withLoading('deleteGroup', async () => {
      try {
        await callApi({ action: 'delete_tag', name: groupName });
        showSuccess('分组已删除', showAlert);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const openEditGroup = (groupName: string) => {
    setEditGroupName(groupName);
    setEditingUserTagUsers([]);
    setShowEditUserRolesModal(true);
  };

  const toggleUserTag = (username: string) => {
    setEditingUserTagUsers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username],
    );
  };

  const handleEditGroup = async () => {
    await withLoading('editGroup', async () => {
      try {
        await callApi({
          action: 'update_tag',
          name: editGroupName,
          users: editingUserTagUsers,
        });
        showSuccess('分组更新成功', showAlert);
        setShowEditUserRolesModal(false);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const filteredUsers = users.filter(
    (u: any) =>
      !searchTerm ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const inp =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors';

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
    <div className='space-y-6'>
      {/* Tab 切换 */}
      <div className='flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg'>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'users'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          👥 用户管理 ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'groups'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          🏷️ 用户分组 ({userGroups.length})
        </button>
      </div>

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <div className='space-y-4'>
          {/* 操作按钮 */}
          <div className='flex items-center justify-between'>
            <div className='relative flex-1 max-w-xs'>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='🔍 搜索用户...'
                className={`${inp} pl-10`}
              />
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <span className='text-gray-400 text-sm'>🔍</span>
              </div>
            </div>
            {role === 'owner' && (
              <div className='flex gap-2'>
                <button
                  onClick={() => setShowAddUserForm(true)}
                  className='px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors'
                >
                  + 添加用户
                </button>
                <button
                  onClick={() => setShowChangePasswordForm(true)}
                  className='px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors'
                >
                  🔑 修改密码
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
                  className={inp}
                />
                <input
                  type='password'
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder='密码'
                  className={inp}
                />
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className={inp}
                >
                  <option value='user'>普通用户</option>
                  <option value='admin'>管理员</option>
                  {role === 'owner' && <option value='owner'>站长</option>}
                </select>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={handleAddUser}
                  className='px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors'
                >
                  ✅ 确认添加
                </button>
                <button
                  onClick={() => setShowAddUserForm(false)}
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors'
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
                修改用户密码
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
                  className={inp}
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
                  className={inp}
                />
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={handleChangePassword}
                  className='px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors'
                >
                  🔑 确认修改
                </button>
                <button
                  onClick={() => setShowChangePasswordForm(false)}
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors'
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 用户列表 */}
          <div className='space-y-2'>
            <div className='text-xs text-gray-500 dark:text-gray-400'>
              共 {filteredUsers.length} 个用户
              {searchTerm && ` (搜索: "${searchTerm}")`}
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
              {filteredUsers.map((u: any) => (
                <div
                  key={u.username}
                  className='flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow'
                >
                  <div className='w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm'>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                      {u.username}
                    </div>
                    <div className='flex items-center gap-2 mt-1'>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(u.role)}`}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                      {u.tags && u.tags.length > 0 && (
                        <span className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                          {u.tags.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {role === 'owner' && u.role !== 'owner' && (
                    <button
                      onClick={() => handleDeleteUser(u.username)}
                      className='p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                      title='删除用户'
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 用户分组管理 */}
      {activeTab === 'groups' && (
        <div className='space-y-4'>
          {/* 操作按钮 */}
          <div className='flex items-center justify-between'>
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              管理用户分组，控制不同分组的权限
            </div>
            {role === 'owner' && (
              <button
                onClick={() => setShowAddUserGroupForm(true)}
                className='px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors'
              >
                + 添加分组
              </button>
            )}
          </div>

          {/* 添加分组表单 */}
          {showAddUserGroupForm && (
            <div className='p-4 border rounded-xl bg-blue-50 dark:bg-blue-900/20 space-y-3'>
              <h4 className='text-sm font-semibold text-blue-700 dark:text-blue-400'>
                添加新分组
              </h4>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder='分组名称'
                className={inp}
              />
              <div className='flex gap-2'>
                <button
                  onClick={handleAddGroup}
                  className='px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors'
                >
                  ✅ 确认添加
                </button>
                <button
                  onClick={() => setShowAddUserGroupForm(false)}
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors'
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 分组列表 */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
            {userGroups.map((tag: any) => (
              <div
                key={tag.name || tag}
                className='p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow'
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>🏷️</span>
                    <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                      {tag.name || tag}
                    </span>
                  </div>
                  {role === 'owner' && (
                    <div className='flex gap-1'>
                      <button
                        onClick={() => openEditGroup(tag.name || tag)}
                        className='p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                        title='编辑分组用户'
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(tag.name || tag)}
                        className='p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                        title='删除分组'
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {tag.enabledApis && tag.enabledApis.length > 0 ? (
                    <span>📺 已启用 {tag.enabledApis.length} 个源</span>
                  ) : (
                    <span className='text-gray-400'>全部源</span>
                  )}
                </div>
                {tag.enabledApis && tag.enabledApis.length > 0 && (
                  <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
                    📺 已启用 {tag.enabledApis.length} 个源
                  </div>
                )}
              </div>
            ))}
          </div>

          {userGroups.length === 0 && (
            <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
              <div className='text-4xl mb-2'>🏷️</div>
              <p>暂无用户分组</p>
              <p className='text-xs mt-1'>点击上方按钮创建第一个分组</p>
            </div>
          )}
        </div>
      )}

      {/* 编辑分组用户弹窗 */}
      {showEditUserRolesModal && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto shadow-2xl'>
            <h3 className='text-lg font-semibold mb-1'>
              编辑分组: {editGroupName}
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              选择属于此分组的用户
            </p>
            <div className='space-y-1 max-h-[50vh] overflow-y-auto'>
              {users.map((u: any) => (
                <label
                  key={u.username}
                  className='flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors'
                >
                  <input
                    type='checkbox'
                    checked={editingUserTagUsers.includes(u.username)}
                    onChange={() => toggleUserTag(u.username)}
                    className='w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500'
                  />
                  <div className='flex-1'>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>
                      {u.username}
                    </span>
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getRoleBadge(u.role)}`}
                    >
                      {getRoleLabel(u.role)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className='flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700'>
              <button
                onClick={() => setShowEditUserRolesModal(false)}
                className='px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors'
              >
                取消
              </button>
              <button
                onClick={handleEditGroup}
                className='px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors'
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
