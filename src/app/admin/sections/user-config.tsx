/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';

import {
  buttonStyles,
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
      showError('请填写完整信息', showAlert);
      return;
    }
    await withLoading('changePwd', async () => {
      try {
        await callApi({
          action: 'changePassword',
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
    if (!confirm(`确定删除用户 ${username} 吗？`)) return;
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
    if (!newGroupName) {
      showError('分组名不能为空', showAlert);
      return;
    }
    await withLoading('addGroup', async () => {
      try {
        await callApi({ action: 'addTag', tag: newGroupName });
        showSuccess('分组添加成功', showAlert);
        setNewGroupName('');
        setShowAddUserGroupForm(false);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleEditGroup = async () => {
    await withLoading('editGroup', async () => {
      try {
        await callApi({
          action: 'updateTagUsers',
          tag: editGroupName,
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

  const handleDeleteGroup = async (tag: string) => {
    if (!confirm(`确定删除分组 ${tag} 吗？`)) return;
    await withLoading('deleteGroup', async () => {
      try {
        await callApi({ action: 'deleteTag', tag });
        showSuccess('分组已删除', showAlert);
        await reload();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const openEditGroup = (tag: string) => {
    setEditGroupName(tag);
    const tagUsers = users
      .filter((u) => (u.tags || []).includes(tag))
      .map((u) => u.username);
    setEditingUserTagUsers(tagUsers);
    setShowEditUserRolesModal(true);
  };

  const toggleUserTag = (username: string) => {
    setEditingUserTagUsers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username],
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      !searchTerm ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const inp =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm';

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold'>用户管理</h3>
        <div className='flex gap-2'>
          {role === 'owner' && (
            <>
              <button
                onClick={() => setShowAddUserForm(true)}
                className={buttonStyles.successSmall}
              >
                添加用户
              </button>
              <button
                onClick={() => setShowChangePasswordForm(true)}
                className={buttonStyles.warningSmall}
              >
                修改密码
              </button>
              <button
                onClick={() => setShowAddUserGroupForm(true)}
                className={buttonStyles.primarySmall}
              >
                添加分组
              </button>
            </>
          )}
        </div>
      </div>

      {showAddUserForm && (
        <div className='p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
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
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className={inp}
          >
            <option value='user'>普通用户</option>
            <option value='admin'>管理员</option>
            {role === 'owner' && <option value='owner'>站长</option>}
          </select>
          <div className='flex gap-2'>
            <button
              onClick={handleAddUser}
              className={buttonStyles.primarySmall}
            >
              添加
            </button>
            <button
              onClick={() => setShowAddUserForm(false)}
              className={buttonStyles.secondarySmall}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {showChangePasswordForm && (
        <div className='p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
          <select
            value={changePassword.username}
            onChange={(e) =>
              setChangePassword({ ...changePassword, username: e.target.value })
            }
            className={inp}
          >
            <option value=''>选择用户</option>
            {users.map((u: any) => (
              <option key={u.username} value={u.username}>
                {u.username} ({u.role})
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
          <div className='flex gap-2'>
            <button
              onClick={handleChangePassword}
              className={buttonStyles.warningSmall}
            >
              修改密码
            </button>
            <button
              onClick={() => setShowChangePasswordForm(false)}
              className={buttonStyles.secondarySmall}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {showAddUserGroupForm && (
        <div className='p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder='分组名称'
            className={inp}
          />
          <div className='flex gap-2'>
            <button
              onClick={handleAddGroup}
              className={buttonStyles.primarySmall}
            >
              添加
            </button>
            <button
              onClick={() => setShowAddUserGroupForm(false)}
              className={buttonStyles.secondarySmall}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='搜索用户...'
            className={`${inp} max-w-xs`}
          />
          <span className='text-xs text-gray-500'>
            共 {users.length} 个用户
          </span>
        </div>
        <div className='border rounded-lg divide-y'>
          {filteredUsers.map((u: any) => (
            <div
              key={u.username}
              className='flex items-center gap-3 p-3 bg-white dark:bg-gray-800'
            >
              <span className='flex-1 text-sm font-medium'>{u.username}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${u.role === 'owner' ? 'bg-red-100 text-red-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              >
                {u.role === 'owner'
                  ? '站长'
                  : u.role === 'admin'
                    ? '管理员'
                    : '用户'}
              </span>
              <span className='text-xs text-gray-400'>
                {u.tags?.join(', ') || '-'}
              </span>
              {role === 'owner' && (
                <button
                  onClick={() => handleDeleteUser(u.username)}
                  className='p-1 text-red-600 hover:text-red-800 text-xs'
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='text-base font-semibold pt-4'>用户分组</h3>
        {userGroups.map((tag: any) => (
          <div
            key={tag.name || tag}
            className='flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-lg'
          >
            <span className='flex-1 text-sm'>{tag.name || tag}</span>
            {role === 'owner' && (
              <>
                <button
                  onClick={() => openEditGroup(tag.name || tag)}
                  className={buttonStyles.primarySmall}
                >
                  编辑用户
                </button>
                <button
                  onClick={() => handleDeleteGroup(tag.name || tag)}
                  className={buttonStyles.dangerSmall}
                >
                  删除分组
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {showEditUserRolesModal && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto space-y-3'>
            <h3 className='text-lg font-semibold'>编辑分组: {editGroupName}</h3>
            <p className='text-sm text-gray-500'>选择属于此分组的用户</p>
            {users.map((u: any) => (
              <label
                key={u.username}
                className='flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer'
              >
                <input
                  type='checkbox'
                  checked={editingUserTagUsers.includes(u.username)}
                  onChange={() => toggleUserTag(u.username)}
                  className='w-4 h-4'
                />
                <span className='text-sm'>{u.username}</span>
              </label>
            ))}
            <div className='flex justify-end gap-2 pt-2'>
              <button
                onClick={() => setShowEditUserRolesModal(false)}
                className={buttonStyles.secondarySmall}
              >
                取消
              </button>
              <button
                onClick={handleEditGroup}
                className={buttonStyles.primarySmall}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
