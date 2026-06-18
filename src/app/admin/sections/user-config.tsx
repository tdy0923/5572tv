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
  const [users, setUsers] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editingGroupApis, setEditingGroupApis] = useState<string[]>([]);
  const [editingGroupAdultContent, setEditingGroupAdultContent] =
    useState(false);
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
        await callApi({ action: 'change_password', ...changePassword });
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
        await callApi({ action: 'add_tag', name: newGroupName.trim() });
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
        await callApi({ action: 'delete_tag', name });
        showSuccess('分组已删除', showAlert);
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
    setShowEditGroupModal(true);
  };

  const handleEditGroup = async () => {
    await withLoading('editGroup', async () => {
      try {
        await callApi({
          action: 'update_tag',
          name: editGroupName,
          enabledApis: editingGroupApis,
          showAdultContent: editingGroupAdultContent,
        });
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

  const filteredUsers = users.filter(
    (u: any) =>
      !searchTerm ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()),
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
          {/* 搜索 + 操作 */}
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='relative flex-1'>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='🔍 搜索用户名...'
                className='w-full px-4 py-2.5 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500'
              />
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                🔍
              </span>
            </div>
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

          {/* 用户列表 */}
          <div className='text-xs text-gray-500 dark:text-gray-400'>
            共 {filteredUsers.length} 个用户
          </div>
          <div className='max-h-[50vh] overflow-y-auto space-y-2'>
            {filteredUsers.map((u: any) => (
              <div
                key={u.username}
                className='flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow'
              >
                <div className='w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0'>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                    {u.username}
                  </div>
                  <div className='flex items-center gap-2 mt-0.5'>
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
                    className='p-1.5 text-red-500 hover:text-red-700 rounded-lg'
                    title='删除'
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
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

          <div className='space-y-3'>
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
                      <button
                        onClick={() => openEditGroup(group)}
                        className='px-3 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600'
                      >
                        编辑
                      </button>
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
                <div className='max-h-[35vh] overflow-y-auto space-y-1'>
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
