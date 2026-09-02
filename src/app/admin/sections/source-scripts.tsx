/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { Code2, FileCode2, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import Toggle from '@/components/Toggle';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentInput,
  FluentTextArea,
} from '@/components/FluentUI';

import {
  showError,
  showSuccess,
  useAlertModal,
  useLoadingState,
} from '../admin-utils';

interface SourceScript {
  id: string;
  name: string;
  enabled: boolean;
  targetSource: string;
  searchScript?: string;
  detailScript?: string;
  playScript?: string;
  headers?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

const EMPTY_FORM: Partial<SourceScript> = {
  name: '',
  enabled: true,
  targetSource: '',
  searchScript: '',
  detailScript: '',
  playScript: '',
};

export default function SourceScripts() {
  const {
    alertModal: _alertModal,
    showAlert,
    hideAlert: _hideAlert,
  } = useAlertModal();
  const { isLoading, withLoading } = useLoadingState();
  const [scripts, setScripts] = useState<SourceScript[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<SourceScript>>(EMPTY_FORM);
  const [testType, setTestType] = useState<'search' | 'detail' | 'play'>(
    'search',
  );
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);

  const fetchScripts = async () => {
    try {
      const resp = await fetch('/api/source-script');
      if (!resp.ok) throw new Error('获取脚本列表失败');
      const data = await resp.json();
      setScripts(data.scripts || []);
    } catch (err) {
      showError((err as Error).message, showAlert);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const handleSave = async () => {
    await withLoading('saveScript', async () => {
      try {
        const body: any = {
          name: form.name,
          enabled: form.enabled,
          targetSource: form.targetSource,
          searchScript: form.searchScript || undefined,
          detailScript: form.detailScript || undefined,
          playScript: form.playScript || undefined,
        };
        if (editingId) body.id = editingId;

        const resp = await fetch('/api/source-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error('保存脚本失败');
        showSuccess(editingId ? '脚本已更新' : '脚本已创建', showAlert);
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        await fetchScripts();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleDelete = async (id: string) => {
    await withLoading(`delete_${id}`, async () => {
      try {
        const resp = await fetch(`/api/source-script?id=${id}`, {
          method: 'DELETE',
        });
        if (!resp.ok) throw new Error('删除失败');
        showSuccess('脚本已删除', showAlert);
        await fetchScripts();
      } catch (err) {
        showError((err as Error).message, showAlert);
      }
    });
  };

  const handleToggle = async (script: SourceScript) => {
    try {
      const resp = await fetch('/api/source-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: script.id, enabled: !script.enabled }),
      });
      if (!resp.ok) throw new Error('切换状态失败');
      await fetchScripts();
    } catch (err) {
      showError((err as Error).message, showAlert);
    }
  };

  const handleTest = async (script: SourceScript) => {
    await withLoading(`test_${script.id}`, async () => {
      setTestResult('');
      try {
        const scriptCode =
          testType === 'search'
            ? script.searchScript
            : testType === 'detail'
              ? script.detailScript
              : script.playScript;

        if (!scriptCode) {
          setTestResult(`该脚本没有设置 ${testType} 类型的脚本代码`);
          return;
        }

        const resp = await fetch('/api/source-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'test',
            type: testType,
            script: scriptCode,
            targetSource: script.targetSource,
            testQuery: testInput || undefined,
            testUrl: testInput || undefined,
            testId: testInput || undefined,
          }),
        });
        const data = await resp.json();
        setTestResult(JSON.stringify(data, null, 2));
      } catch (err) {
        setTestResult(`测试失败: ${(err as Error).message}`);
      }
    });
  };

  const startEdit = (script: SourceScript) => {
    setEditingId(script.id);
    setForm({
      name: script.name,
      enabled: script.enabled,
      targetSource: script.targetSource,
      searchScript: script.searchScript || '',
      detailScript: script.detailScript || '',
      playScript: script.playScript || '',
    });
    setShowForm(true);
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
            源脚本管理
          </h3>
          <p
            className='text-xs mt-0.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            沙箱执行 · {scripts.length} 个脚本 · 拦截搜索 / 详情 / 播放
          </p>
        </div>
        <FluentButton
          variant='primary'
          size='sm'
          icon={<Plus className='h-3.5 w-3.5' />}
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm(EMPTY_FORM);
          }}
        >
          新建脚本
        </FluentButton>
      </div>

      <FluentCard
        padding='12px'
        className='flex items-start gap-3 bg-gradient-to-r from-[#3b82f6]/10 to-transparent dark:from-[#3b82f6]/5'
      >
        <span className='w-8 h-8 rounded-xl bg-[#3b82f6]/15 flex items-center justify-center shrink-0'>
          <Code2 className='w-4 h-4 text-[#3b82f6]' />
        </span>
        <div className='flex-1 min-w-0'>
          <p className='text-xs font-medium text-gray-900 dark:text-white'>
            自定义 JavaScript 脚本
          </p>
          <p className='text-xs text-[#9ca3af] leading-relaxed mt-0.5'>
            用于拦截和替换视频源的搜索、详情、播放解析逻辑。脚本以沙箱方式执行，不可访问系统对象。
          </p>
        </div>
        <FluentBadge variant='info' size='sm' rounded>
          沙箱
        </FluentBadge>
      </FluentCard>

      {/* Form */}
      {showForm && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#f4c24d]/15 flex items-center justify-center'>
              <FileCode2 className='w-3.5 h-3.5 text-[#f4c24d]' />
            </span>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
              {editingId ? '编辑脚本' : '新建脚本'}
            </h4>
            {editingId && (
              <FluentBadge variant='warning' size='sm' rounded>
                编辑中
              </FluentBadge>
            )}
            {!editingId && (
              <FluentBadge variant='success' size='sm' rounded>
                新增
              </FluentBadge>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <FluentInput
              label='脚本名称'
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder='My Custom Script'
            />
            <FluentInput
              label='目标源 Key'
              value={form.targetSource || ''}
              onChange={(e) =>
                setForm({ ...form, targetSource: e.target.value })
              }
              placeholder='e.g. zy_01, zy_02'
            />
          </div>

          <FluentTextArea
            label='搜索脚本 (searchScript) - 可选'
            value={form.searchScript || ''}
            onChange={(e) =>
              setForm({ ...form, searchScript: e.target.value })
            }
            rows={5}
            placeholder={`(ctx) => {\n  // ctx.query: 搜索关键词\n  // ctx.headers: 请求头\n  // 返回: { results: [{id, title, poster, episodes, ...}] }\n  return { results: [] };\n}`}
            className='font-mono'
          />

          <FluentTextArea
            label='详情脚本 (detailScript) - 可选'
            value={form.detailScript || ''}
            onChange={(e) =>
              setForm({ ...form, detailScript: e.target.value })
            }
            rows={5}
            placeholder={`(ctx) => {\n  // ctx.id: 视频ID\n  // ctx.url: 详情URL\n  // 返回: {id, title, poster, episodes, episodes_titles, ...}\n  return null;\n}`}
            className='font-mono'
          />

          <FluentTextArea
            label='播放脚本 (playScript) - 可选'
            value={form.playScript || ''}
            onChange={(e) => setForm({ ...form, playScript: e.target.value })}
            rows={5}
            placeholder={`(ctx) => {\n  // ctx.url: 原始播放URL\n  // 返回: 解析后的URL或 {url, headers}对象\n  return ctx.url;\n}`}
            className='font-mono'
          />

          <label className='flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'>
            <input
              type='checkbox'
              checked={form.enabled !== false}
              onChange={(e) =>
                setForm({ ...form, enabled: e.target.checked })
              }
              className='w-4 h-4 rounded border-gray-300 text-[#f4c24d] focus:ring-[#f4c24d]'
            />
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              启用此脚本
            </span>
            <FluentBadge
              variant={form.enabled !== false ? 'success' : 'default'}
              size='sm'
              rounded
              className='ml-auto'
            >
              {form.enabled !== false ? '已启用' : '已禁用'}
            </FluentBadge>
          </label>

          <div className='flex gap-2 pt-1'>
            <FluentButton
              variant='primary'
              size='sm'
              onClick={handleSave}
              loading={isLoading('saveScript')}
            >
              {editingId ? '更新' : '创建'}
            </FluentButton>
            <FluentButton
              variant='ghost'
              size='sm'
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              取消
            </FluentButton>
          </div>
        </FluentCard>
      )}

      {/* Empty state */}
      {scripts.length === 0 && !showForm && (
        <FluentCard padding='0'>
          <FluentEmptyState
            icon={<FileCode2 className='h-6 w-6 text-[#9ca3af]' />}
            title='暂无脚本'
            description='点击“新建脚本”创建第一个脚本，可分别定义搜索、详情与播放解析逻辑，支持沙箱测试与启用/禁用'
            action={
              <FluentButton
                variant='primary'
                size='sm'
                icon={<Plus className='h-3.5 w-3.5' />}
                onClick={() => {
                  setShowForm(true);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
              >
                新建脚本
              </FluentButton>
            }
          />
        </FluentCard>
      )}

      {/* List */}
      <div className='space-y-3'>
        {scripts.map((script) => {
          const typeBadges = [
            script.searchScript && '搜索',
            script.detailScript && '详情',
            script.playScript && '播放',
          ].filter(Boolean) as string[];
          const isExpanded = expandedScriptId === script.id;
          return (
            <FluentCard
              key={script.id}
              hoverable
              padding='0'
              className='overflow-hidden transition-all duration-250 ease-out hover:-translate-y-[1px]'
            >
              <div className='flex items-center gap-3 p-3'>
                <Toggle
                  checked={script.enabled}
                  onChange={() => handleToggle(script)}
                />

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <span className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                      {script.name}
                    </span>
                    <FluentBadge
                      variant={script.enabled ? 'success' : 'default'}
                      size='sm'
                      rounded
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block ${script.enabled ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`}
                      />
                      {script.enabled ? '启用' : '禁用'}
                    </FluentBadge>
                  </div>
                  <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
                    <span className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                      目标源: {script.targetSource || '(未指定)'}
                    </span>
                    {typeBadges.length > 0 ? (
                      typeBadges.map((t) => (
                        <FluentBadge
                          key={t}
                          variant={
                            t === '搜索'
                              ? 'info'
                              : t === '详情'
                                ? 'warning'
                                : 'success'
                          }
                          size='sm'
                          rounded
                        >
                          {t}
                        </FluentBadge>
                      ))
                    ) : (
                      <FluentBadge variant='default' size='sm' rounded>
                        空脚本
                      </FluentBadge>
                    )}
                  </div>
                </div>

                <div className='flex items-center gap-1 shrink-0'>
                  <FluentButton
                    variant='ghost'
                    size='sm'
                    icon={<Pencil className='h-3.5 w-3.5' />}
                    onClick={() => startEdit(script)}
                  >
                    编辑
                  </FluentButton>
                  <FluentButton
                    variant='secondary'
                    size='sm'
                    onClick={() =>
                      setExpandedScriptId(isExpanded ? null : script.id)
                    }
                  >
                    {isExpanded ? '收起' : '展开'}
                  </FluentButton>
                  <FluentButton
                    variant='ghost'
                    size='sm'
                    icon={<Trash2 className='h-3.5 w-3.5' />}
                    loading={isLoading(`delete_${script.id}`)}
                    onClick={() => handleDelete(script.id)}
                    className='text-[#ef4444] hover:text-[#dc2626] hover:bg-red-50 dark:hover:bg-red-500/10'
                  >
                    删除
                  </FluentButton>
                </div>
              </div>

              {isExpanded && (
                <div className='border-t border-gray-200 dark:border-white/5 px-3 py-3 bg-gray-50 dark:bg-white/[0.02] space-y-3'>
                  {script.searchScript && (
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <FluentBadge variant='info' size='sm' rounded>
                          搜索脚本
                        </FluentBadge>
                        <span className='text-xs text-[#9ca3af]'>searchScript</span>
                      </div>
                      <pre className='text-xs bg-white dark:bg-[#0a0a0a] p-3 rounded-xl overflow-x-auto max-h-40 border border-gray-200 dark:border-white/5 font-mono leading-relaxed'>
                        {script.searchScript}
                      </pre>
                    </div>
                  )}
                  {script.detailScript && (
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <FluentBadge variant='warning' size='sm' rounded>
                          详情脚本
                        </FluentBadge>
                        <span className='text-xs text-[#9ca3af]'>detailScript</span>
                      </div>
                      <pre className='text-xs bg-white dark:bg-[#0a0a0a] p-3 rounded-xl overflow-x-auto max-h-40 border border-gray-200 dark:border-white/5 font-mono leading-relaxed'>
                        {script.detailScript}
                      </pre>
                    </div>
                  )}
                  {script.playScript && (
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <FluentBadge variant='success' size='sm' rounded>
                          播放脚本
                        </FluentBadge>
                        <span className='text-xs text-[#9ca3af]'>playScript</span>
                      </div>
                      <pre className='text-xs bg-white dark:bg-[#0a0a0a] p-3 rounded-xl overflow-x-auto max-h-40 border border-gray-200 dark:border-white/5 font-mono leading-relaxed'>
                        {script.playScript}
                      </pre>
                    </div>
                  )}

                  {!script.searchScript &&
                    !script.detailScript &&
                    !script.playScript && (
                      <FluentEmptyState
                        icon={<Code2 className='h-5 w-5 text-[#9ca3af]' />}
                        title='空脚本'
                        description='该脚本未配置任何类型的脚本代码'
                      />
                    )}

                  {/* Test panel */}
                  <FluentCard
                    padding='12px'
                    className='space-y-2 bg-white dark:!bg-[#1a1a1a]'
                  >
                    <div className='flex items-center gap-2'>
                      <span className='w-6 h-6 rounded-lg bg-[#22c55e]/15 flex items-center justify-center shrink-0'>
                        <Play className='w-3 h-3 text-[#22c55e]' />
                      </span>
                      <span className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
                        脚本测试
                      </span>
                      <FluentBadge variant='default' size='sm' rounded>
                        沙箱验证
                      </FluentBadge>
                    </div>
                    <div className='flex flex-col sm:flex-row gap-2'>
                      <select
                        value={testType}
                        onChange={(e) =>
                          setTestType(
                            e.target.value as 'search' | 'detail' | 'play',
                          )
                        }
                        className='px-3 py-2 text-xs border rounded-lg bg-white dark:bg-white/5 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f4c24d]/50 shrink-0'
                      >
                        <option value='search'>搜索</option>
                        <option value='detail'>详情</option>
                        <option value='play'>播放</option>
                      </select>
                      <div className='flex-1'>
                        <FluentInput
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          placeholder={
                            testType === 'search'
                              ? '搜索关键词'
                              : testType === 'detail'
                                ? '视频ID或URL'
                                : '播放URL'
                          }
                        />
                      </div>
                      <FluentButton
                        variant='primary'
                        size='sm'
                        icon={<Play className='h-3.5 w-3.5' />}
                        loading={isLoading(`test_${script.id}`)}
                        onClick={() => handleTest(script)}
                      >
                        {isLoading(`test_${script.id}`) ? '测试中...' : '执行'}
                      </FluentButton>
                    </div>
                    {testResult && (
                      <pre className='text-xs bg-gray-900 dark:bg-black text-gray-100 p-3 rounded-xl overflow-x-auto max-h-60 border border-gray-200 dark:border-white/10 font-mono leading-relaxed whitespace-pre-wrap break-all'>
                        {testResult}
                      </pre>
                    )}
                  </FluentCard>
                </div>
              )}
            </FluentCard>
          );
        })}
      </div>

      {/* keep alert reference */}
      <span className='hidden' aria-hidden>
        {_alertModal.isOpen ? 'open' : 'closed'}
      </span>
    </div>
  );
}
