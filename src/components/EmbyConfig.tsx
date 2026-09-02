/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { Film, KeyRound, Pencil, Plus, Server, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';
import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentInput,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

interface EmbyConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

const EmbyConfig = ({ config, refreshConfig }: EmbyConfigProps) => {
  const { message, isLoading, setIsLoading, showMessage } = useConfigMessage();
  const [sources, setSources] = useState<any[]>([]);
  const [editingSource, setEditingSource] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    enabled: true,
    isPublic: false,
    ServerURL: '',
    ApiKey: '',
    Username: '',
    Password: '',
    UserId: '',
    removeEmbyPrefix: false,
    appendMediaSourceId: false,
    transcodeMp4: false,
    proxyPlay: false,
  });
  const [authMode, setAuthMode] = useState<'apikey' | 'password'>('apikey');

  // 从配置加载源列表
  useEffect(() => {
    if (config?.EmbyConfig?.Sources) {
      setSources(config.EmbyConfig.Sources);
    }
  }, [config]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      enabled: true,
      isPublic: false,
      ServerURL: '',
      ApiKey: '',
      Username: '',
      Password: '',
      UserId: '',
      removeEmbyPrefix: false,
      appendMediaSourceId: false,
      transcodeMp4: false,
      proxyPlay: false,
    });
    setEditingSource(null);
    setShowAddForm(false);
    setAuthMode('apikey');
  };

  // 开始编辑
  const handleEdit = (source: any) => {
    setFormData({ ...source });
    if (source.ApiKey) {
      setAuthMode('apikey');
    } else if (source.Username) {
      setAuthMode('password');
    } else {
      setAuthMode('apikey');
    }
    setEditingSource(source);
    setShowAddForm(false);
  };

  // 开始添加
  const handleAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  // 保存源
  const handleSave = async () => {
    if (!formData.key || !formData.name || !formData.ServerURL) {
      showMessage('error', '请填写必填字段：标识符、名称、服务器地址');
      return;
    }

    // 根据认证方式验证必填字段
    if (authMode === 'apikey') {
      if (!formData.ApiKey) {
        showMessage('error', '使用密钥认证时，API Key 为必填项');
        return;
      }
    } else if (authMode === 'password') {
      if (!formData.Username) {
        showMessage('error', '使用账号认证时，用户名为必填项');
        return;
      }
    }

    if (!editingSource && sources.some((s) => s.key === formData.key)) {
      showMessage('error', '标识符已存在，请使用其他标识符');
      return;
    }

    setIsLoading(true);
    try {
      // 如果没有 UserId，先测试连接获取 UserId
      let dataToSave = { ...formData };
      if (!dataToSave.UserId) {
        const testResponse = await fetch('/api/admin/emby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'test',
            ServerURL: formData.ServerURL,
            ApiKey: formData.ApiKey,
            Username: formData.Username,
            Password: formData.Password,
          }),
        });

        const testResult = await testResponse.json();
        if (!testResult.success) {
          showMessage(
            'error',
            '连接测试失败，请检查配置: ' + (testResult.message || ''),
          );
          setIsLoading(false);
          return;
        }

        if (testResult.userId) {
          dataToSave.UserId = testResult.userId;
        }
      }

      let newSources;
      if (editingSource) {
        newSources = sources.map((s) =>
          s.key === editingSource.key ? dataToSave : s,
        );
      } else {
        newSources = [...sources, dataToSave];
      }

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          EmbyConfig: { Sources: newSources },
        }),
      });

      if (!response.ok) throw new Error('保存失败');

      await refreshConfig();
      resetForm();
      showMessage('success', editingSource ? '更新成功' : '添加成功');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除源
  const handleDelete = async (source: any) => {
    if (!confirm(`确定要删除 "${source.name}" 吗？`)) return;

    setIsLoading(true);
    try {
      const newSources = sources.filter((s) => s.key !== source.key);

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          EmbyConfig: { Sources: newSources },
        }),
      });

      if (!response.ok) throw new Error('删除失败');

      await refreshConfig();
      showMessage('success', '删除成功');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '删除失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换启用状态
  const handleToggleEnabled = async (source: any) => {
    setIsLoading(true);
    try {
      const newSources = sources.map((s) =>
        s.key === source.key ? { ...s, enabled: !s.enabled } : s,
      );

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          EmbyConfig: { Sources: newSources },
        }),
      });

      if (!response.ok) throw new Error('更新失败');

      await refreshConfig();
      showMessage('success', source.enabled ? '已禁用' : '已启用');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '更新失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 测试连接
  const handleTest = async (source: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/emby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          ServerURL: source.ServerURL,
          ApiKey: source.ApiKey,
          Username: source.Username,
          Password: source.Password,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // 如果测试成功且返回了 userId，更新 formData
        if (
          result.userId &&
          editingSource &&
          editingSource.key === source.key
        ) {
          setFormData((prev) => ({ ...prev, UserId: result.userId }));
        }
        showMessage('success', result.message || 'Emby 连接测试成功');
      } else {
        showMessage('error', result.message || 'Emby 连接测试失败');
      }
    } catch (err) {
      showMessage('error', '连接测试失败');
    } finally {
      setIsLoading(false);
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
            Emby 私人影库
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            私有 Emby 源 · {sources.length} 个源 · 支持密钥与账号认证
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <FluentBadge variant='info' size='sm' rounded>
            <Film className='w-3 h-3' /> {sources.length} 源
          </FluentBadge>
          <FluentButton
            variant='primary'
            size='sm'
            icon={<Plus className='h-3.5 w-3.5' />}
            onClick={handleAdd}
            disabled={isLoading || showAddForm || !!editingSource}
            loading={isLoading}
          >
            添加新源
          </FluentButton>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 text-sm ${
            message.type === 'success'
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          <FluentBadge
            variant={message.type === 'success' ? 'success' : 'error'}
            size='sm'
            rounded
          >
            {message.type === 'success' ? '成功' : '错误'}
          </FluentBadge>
          <span className='flex-1'>{message.text}</span>
        </FluentCard>
      )}

      {/* 源列表 */}
      <div className='space-y-3'>
        {sources.length === 0 ? (
          <FluentCard padding='0'>
            <FluentEmptyState
              icon={<Server className='h-6 w-6 text-[#9ca3af]' />}
              title='暂无 Emby 源'
              description='点击“添加新源”创建第一个 Emby 源，支持密钥与账号两种认证方式'
              action={
                <FluentButton
                  variant='primary'
                  size='sm'
                  icon={<Plus className='h-3.5 w-3.5' />}
                  onClick={handleAdd}
                  disabled={isLoading}
                >
                  添加新源
                </FluentButton>
              }
            />
          </FluentCard>
        ) : (
          sources.map((source) => (
            <FluentCard
              key={source.key}
              hoverable
              padding='16px'
              className='space-y-3'
            >
              <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center shrink-0'>
                      <Film className='w-3.5 h-3.5 text-[#3b82f6]' />
                    </span>
                    <h4 className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                      {source.name}
                    </h4>
                    <FluentBadge
                      variant={source.enabled ? 'success' : 'default'}
                      size='sm'
                      rounded
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block ${source.enabled ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`}
                      />
                      {source.enabled ? '已启用' : '已禁用'}
                    </FluentBadge>
                    {source.isPublic && (
                      <FluentBadge variant='info' size='sm' rounded>
                        公共源
                      </FluentBadge>
                    )}
                    <FluentBadge variant='default' size='sm' rounded>
                      {source.ApiKey ? '密钥' : source.Username ? '账号' : '未配置'}
                    </FluentBadge>
                  </div>
                  <div className='mt-2 space-y-1'>
                    <p className='text-xs text-[#9ca3af] flex items-center gap-1.5'>
                      <span className='font-medium text-gray-600 dark:text-gray-400'>标识符:</span>
                      <FluentBadge variant='default' size='sm' rounded>
                        {source.key}
                      </FluentBadge>
                    </p>
                    <p className='text-xs text-[#9ca3af] truncate flex items-center gap-1.5'>
                      <Server className='w-3 h-3 shrink-0' />
                      <span className='truncate'>{source.ServerURL}</span>
                    </p>
                  </div>
                </div>
                <div className='flex gap-1.5 flex-wrap sm:flex-nowrap shrink-0'>
                  <FluentButton
                    variant='ghost'
                    size='sm'
                    onClick={() => handleToggleEnabled(source)}
                    disabled={isLoading}
                    className={
                      source.enabled
                        ? '!text-[#f59e0b] hover:!bg-amber-50 dark:hover:!bg-amber-500/10'
                        : '!text-[#22c55e] hover:!bg-green-50 dark:hover:!bg-green-500/10'
                    }
                  >
                    {source.enabled ? '禁用' : '启用'}
                  </FluentButton>
                  <FluentButton
                    variant='ghost'
                    size='sm'
                    onClick={() => handleTest(source)}
                    disabled={isLoading}
                  >
                    测试
                  </FluentButton>
                  <FluentButton
                    variant='secondary'
                    size='sm'
                    icon={<Pencil className='h-3.5 w-3.5' />}
                    onClick={() => handleEdit(source)}
                  >
                    编辑
                  </FluentButton>
                  <FluentButton
                    variant='ghost'
                    size='sm'
                    icon={<Trash2 className='h-3.5 w-3.5' />}
                    onClick={() => handleDelete(source)}
                    disabled={isLoading}
                    className='!text-[#ef4444] hover:!bg-red-50 dark:hover:!bg-red-500/10'
                  >
                    删除
                  </FluentButton>
                </div>
              </div>
            </FluentCard>
          ))
        )}
      </div>

      {/* 添加/编辑表单 */}
      {(showAddForm || editingSource) && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#f4c24d]/15 flex items-center justify-center'>
              <Server className='w-3.5 h-3.5 text-[#f4c24d]' />
            </span>
            <h3 className='text-[15px] font-semibold text-gray-900 dark:text-white'>
              {editingSource ? '编辑 Emby 源' : '添加新的 Emby 源'}
            </h3>
            {editingSource ? (
              <FluentBadge variant='warning' size='sm' rounded>
                编辑中
              </FluentBadge>
            ) : (
              <FluentBadge variant='success' size='sm' rounded>
                新增
              </FluentBadge>
            )}
            <FluentBadge variant='default' size='sm' rounded className='ml-auto'>
              {authMode === 'apikey' ? '密钥认证' : '账号认证'}
            </FluentBadge>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <FluentInput
              label='标识符 *'
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              disabled={!!editingSource}
              placeholder='home, office, etc.'
            />
            <FluentInput
              label='显示名称 *'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder='家庭Emby, 公司Emby, etc.'
            />
            <div className='sm:col-span-2'>
              <FluentInput
                label='Emby 服务器地址 *'
                value={formData.ServerURL}
                onChange={(e) =>
                  setFormData({ ...formData, ServerURL: e.target.value })
                }
                placeholder='https://emby.example.com/emby'
              />
              <p className='mt-1 text-xs text-[#9ca3af]'>
                如果是反代，请包含完整路径，例如: https://emby.example.com/emby
              </p>
            </div>
          </div>

          {/* 认证方式切换 */}
          <div className='space-y-2'>
            <p className='text-sm font-medium text-[#9ca3af]'>认证方式 *</p>
            <div className='flex gap-2 p-1 rounded-xl border bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/5'>
              <FluentButton
                variant={authMode === 'apikey' ? 'primary' : 'ghost'}
                size='sm'
                fullWidth
                icon={<KeyRound className='h-3.5 w-3.5' />}
                onClick={() => {
                  setAuthMode('apikey');
                  setFormData({ ...formData, Username: '', Password: '' });
                }}
              >
                密钥认证
              </FluentButton>
              <FluentButton
                variant={authMode === 'password' ? 'primary' : 'ghost'}
                size='sm'
                fullWidth
                icon={<UserRound className='h-3.5 w-3.5' />}
                onClick={() => {
                  setAuthMode('password');
                  setFormData({ ...formData, ApiKey: '', UserId: '' });
                }}
              >
                账号认证
              </FluentButton>
            </div>
          </div>

          {/* 密钥认证模式 */}
          {authMode === 'apikey' && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <FluentInput
                label='API Key *'
                type='password'
                value={formData.ApiKey}
                onChange={(e) =>
                  setFormData({ ...formData, ApiKey: e.target.value })
                }
                placeholder='在 Emby 控制台的 API 密钥页面生成'
              />
              <FluentInput
                label='用户 ID（可选）'
                value={formData.UserId}
                onChange={(e) =>
                  setFormData({ ...formData, UserId: e.target.value })
                }
                placeholder='留空则自动获取'
              />
              <p className='sm:col-span-2 text-xs text-[#9ca3af] -mt-1'>
                不填则自动获取当前认证用户的 ID；如需指定其他用户可手动填写
              </p>
            </div>
          )}

          {/* 账号认证模式 */}
          {authMode === 'password' && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <FluentInput
                label='用户名 *'
                value={formData.Username}
                onChange={(e) =>
                  setFormData({ ...formData, Username: e.target.value })
                }
                placeholder='Emby 用户名'
              />
              <FluentInput
                label='密码（可选）'
                type='password'
                value={formData.Password}
                onChange={(e) =>
                  setFormData({ ...formData, Password: e.target.value })
                }
                placeholder='如果账号没有密码可留空'
              />
            </div>
          )}

          {/* 高级选项 */}
          <FluentCard padding='16px' className='space-y-3 bg-gray-50 dark:!bg-white/[0.02]'>
            <div className='flex items-center gap-2'>
              <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
                高级选项
              </h4>
              <FluentBadge variant='default' size='sm' rounded>
                可选
              </FluentBadge>
            </div>

            <Toggle
              checked={formData.removeEmbyPrefix}
              onChange={(v) =>
                setFormData({ ...formData, removeEmbyPrefix: v })
              }
              label='播放链接移除/emby前缀'
              description='启用后将从播放链接中移除 /emby 前缀'
            />

            <Toggle
              checked={formData.appendMediaSourceId}
              onChange={(v) =>
                setFormData({ ...formData, appendMediaSourceId: v })
              }
              label='拼接MediaSourceId参数'
              description='启用后将调用 PlaybackInfo API 获取 MediaSourceId 并添加到播放链接'
            />

            <Toggle
              checked={formData.transcodeMp4}
              onChange={(v) => setFormData({ ...formData, transcodeMp4: v })}
              label='转码mp4'
              description='启用后将使用 stream.mp4 格式并移除 Static 参数'
            />

            <Toggle
              checked={formData.proxyPlay}
              onChange={(v) => setFormData({ ...formData, proxyPlay: v })}
              label='视频播放代理'
              description='启用后视频播放将通过服务器代理'
            />
          </FluentCard>

          <div className='space-y-3'>
            <Toggle
              checked={formData.enabled}
              onChange={(v) => setFormData({ ...formData, enabled: v })}
              label='启用此源'
            />

            <Toggle
              checked={formData.isPublic}
              onChange={(v) => setFormData({ ...formData, isPublic: v })}
              label='设为公共源'
              description='开启后，所有用户的私人媒体库将自动包含此源'
            />
          </div>

          {/* 操作按钮 */}
          <div className='flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-white/5'>
            <FluentButton variant='ghost' size='sm' onClick={resetForm} disabled={isLoading}>
              取消
            </FluentButton>
            <FluentButton
              variant='primary'
              size='sm'
              onClick={handleSave}
              disabled={isLoading}
              loading={isLoading}
            >
              {isLoading ? '保存中...' : '保存'}
            </FluentButton>
          </div>
        </FluentCard>
      )}
    </div>
  );
};

export default EmbyConfig;
