'use client';

import {
  Ban,
  Check,
  CheckCircle,
  Copy,
  Plus,
  RefreshCw,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';

interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: string;
  maxUses: number;
  currentUses: number;
  remainingUses: number;
  expiresAt: string;
  expired: boolean;
  disabled: boolean;
  status: 'active' | 'used_up' | 'expired' | 'disabled';
  users: string[];
}

export default function InviteCodeManager() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [maxUses, setMaxUses] = useState(10);
  const [expiresIn, setExpiresIn] = useState(7);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/invites');
      const data = await res.json();
      if (data.ok) {
        setCodes(data.codes);
      }
    } catch (error) {
      console.error('加载邀请码失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxUses,
          expiresIn: expiresIn * 86400,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreateModal(false);
        await fetchCodes();
        await navigator.clipboard.writeText(data.code);
        setCopiedCode(data.code);
        setTimeout(() => setCopiedCode(null), 2000);
      } else {
        alert(data.error || '生成邀请码失败');
      }
    } catch (error) {
      console.error('生成邀请码失败:', error);
      alert('生成邀请码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`确定要删除邀请码 ${code} 吗？`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/invites?code=${code}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        await fetchCodes();
      } else {
        alert(data.error || '删除邀请码失败');
      }
    } catch (error) {
      console.error('删除邀请码失败:', error);
      alert('删除邀请码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (code: string, disabled: boolean) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/invites?code=${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchCodes();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('切换邀请码状态失败:', error);
      alert('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusBadge = (status: InviteCode['status']) => {
    if (status === 'disabled')
      return (
        <FluentBadge variant='default' size='sm' rounded>
          已禁用
        </FluentBadge>
      );
    if (status === 'expired')
      return (
        <FluentBadge variant='error' size='sm' rounded>
          已过期
        </FluentBadge>
      );
    if (status === 'used_up')
      return (
        <FluentBadge variant='warning' size='sm' rounded>
          已用完
        </FluentBadge>
      );
    return (
      <FluentBadge variant='success' size='sm' rounded>
        可用
      </FluentBadge>
    );
  };

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold flex items-center gap-2'
            style={{ color: 'var(--color-foreground)' }}
          >
            <Ticket className='w-4 h-4 text-[#3b82f6]' />
            邀请码管理
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            邀请码发放与状态管理 · 共 {codes.length} 个
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <FluentBadge variant='info' size='sm' rounded>
            {codes.length} 个
          </FluentBadge>
          <FluentButton
            variant='secondary'
            size='sm'
            icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
            loading={loading}
            onClick={fetchCodes}
          >
            刷新
          </FluentButton>
          <FluentButton
            variant='primary'
            size='sm'
            icon={<Plus className='h-3.5 w-3.5' />}
            onClick={() => setShowCreateModal(true)}
          >
            生成邀请码
          </FluentButton>
        </div>
      </div>

      {/* Table */}
      <FluentCard padding='0' className='overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/5'>
              <tr>
                <th className='px-4 py-3 text-left font-medium text-[#9ca3af] text-xs'>邀请码</th>
                <th className='px-4 py-3 text-left font-medium text-[#9ca3af] text-xs'>创建者</th>
                <th className='px-4 py-3 text-left font-medium text-[#9ca3af] text-xs'>使用情况</th>
                <th className='px-4 py-3 text-left font-medium text-[#9ca3af] text-xs'>创建时间</th>
                <th className='px-4 py-3 text-left font-medium text-[#9ca3af] text-xs'>过期时间</th>
                <th className='px-4 py-3 text-left font-medium text-[#9ca3af] text-xs'>状态</th>
                <th className='px-4 py-3 text-right font-medium text-[#9ca3af] text-xs'>操作</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 dark:divide-white/5'>
              {loading && codes.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-4 py-8'>
                    <div className='flex justify-center'>
                      <FluentSpinner size='medium' label='加载中...' />
                    </div>
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-4 py-2'>
                    <FluentEmptyState
                      icon={<Ticket className='h-6 w-6 text-[#9ca3af]' />}
                      title='暂无邀请码'
                      description='点击“生成邀请码”创建第一个邀请码'
                      action={
                        <FluentButton
                          variant='primary'
                          size='sm'
                          icon={<Plus className='h-3.5 w-3.5' />}
                          onClick={() => setShowCreateModal(true)}
                        >
                          生成邀请码
                        </FluentButton>
                      }
                    />
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
                  <tr
                    key={code.code}
                    className='hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors'
                  >
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <code className='px-2 py-1 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/5 rounded font-mono text-xs text-gray-900 dark:text-white'>
                          {code.code}
                        </code>
                        <FluentButton
                          variant='ghost'
                          size='sm'
                          onClick={() => handleCopy(code.code)}
                          className='!p-1 !min-h-0'
                        >
                          {copiedCode === code.code ? (
                            <Check size={14} className='text-green-600' />
                          ) : (
                            <Copy size={14} />
                          )}
                        </FluentButton>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-gray-700 dark:text-gray-300 text-xs'>
                      {code.createdBy}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-700 dark:text-gray-300 text-xs'>
                          {code.currentUses} / {code.maxUses}
                        </span>
                        <div className='w-16 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-[#3b82f6] transition-all rounded-full'
                            style={{
                              width: `${(code.currentUses / code.maxUses) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-[#9ca3af] text-xs'>{formatDate(code.createdAt)}</td>
                    <td className='px-4 py-3 text-[#9ca3af] text-xs'>{formatDate(code.expiresAt)}</td>
                    <td className='px-4 py-3'>{statusBadge(code.status)}</td>
                    <td className='px-4 py-3 text-right'>
                      <div className='flex items-center justify-end gap-1.5'>
                        {code.status !== 'expired' && code.status !== 'used_up' && (
                          <FluentButton
                            variant={code.disabled ? 'primary' : 'secondary'}
                            size='sm'
                            onClick={() => handleToggle(code.code, !code.disabled)}
                            disabled={loading}
                            className='!px-2 !py-1 !min-h-[26px]'
                          >
                            {code.disabled ? <CheckCircle size={14} /> : <Ban size={14} />}
                          </FluentButton>
                        )}
                        <FluentButton
                          variant='danger'
                          size='sm'
                          onClick={() => handleDelete(code.code)}
                          disabled={loading}
                          icon={<Trash2 size={14} />}
                          className='!px-2 !py-1 !min-h-[26px]'
                        >
                          删除
                        </FluentButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {loading && codes.length > 0 && (
          <div className='flex items-center justify-center gap-2 py-3 border-t border-gray-200 dark:border-white/5'>
            <FluentSpinner size='small' />
            <span className='text-xs text-[#9ca3af]'>加载中...</span>
          </div>
        )}
      </FluentCard>

      {/* Create form */}
      {showCreateModal && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <span className='w-7 h-7 rounded-lg bg-[#22c55e]/15 flex items-center justify-center'>
                <Plus className='w-3.5 h-3.5 text-[#22c55e]' />
              </span>
              生成新邀请码
            </h3>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() => setShowCreateModal(false)}
              className='!p-1.5 !min-h-0'
            >
              <X size={16} />
            </FluentButton>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <FluentInput
              label='最大使用次数'
              type='number'
              min={1}
              max={1000}
              value={String(maxUses)}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              placeholder='10'
            />
            <FluentInput
              label='有效期（天）'
              type='number'
              min={1}
              max={365}
              value={String(expiresIn)}
              onChange={(e) => setExpiresIn(Number(e.target.value))}
              placeholder='7'
            />
          </div>
          <p className='text-xs text-[#9ca3af]'>范围：使用次数 1-1000，天数 1-365</p>

          <div className='flex gap-2 pt-2'>
            <FluentButton
              variant='primary'
              size='md'
              onClick={handleCreate}
              loading={loading}
              icon={<Plus className='h-4 w-4' />}
            >
              生成邀请码
            </FluentButton>
            <FluentButton
              variant='secondary'
              size='md'
              onClick={() => setShowCreateModal(false)}
              disabled={loading}
            >
              取消
            </FluentButton>
          </div>
        </FluentCard>
      )}
    </div>
  );
}
