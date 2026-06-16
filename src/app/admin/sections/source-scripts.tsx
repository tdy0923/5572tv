'use client';

import { useEffect, useState } from 'react';

import {
  buttonStyles,
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
  const { alertModal, showAlert, hideAlert } = useAlertModal();
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

  const inpCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm';
  const lblCls =
    'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const taCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs font-mono resize-y';

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold'>源脚本管理</h3>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm(EMPTY_FORM);
          }}
          className={buttonStyles.successSmall}
        >
          新建脚本
        </button>
      </div>

      <p className='text-xs text-gray-500 dark:text-gray-400'>
        自定义 JavaScript 脚本用于拦截和替换视频源的搜索、详情、播放解析逻辑。
        脚本以沙箱方式执行，不可访问系统对象。
      </p>

      {showForm && (
        <div className='p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className={lblCls}>脚本名称</label>
              <input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inpCls}
                placeholder='My Custom Script'
              />
            </div>
            <div>
              <label className={lblCls}>目标源 Key</label>
              <input
                value={form.targetSource || ''}
                onChange={(e) =>
                  setForm({ ...form, targetSource: e.target.value })
                }
                className={inpCls}
                placeholder='e.g. zy_01, zy_02'
              />
            </div>
          </div>

          <div>
            <label className={lblCls}>搜索脚本 (searchScript) - 可选</label>
            <textarea
              value={form.searchScript || ''}
              onChange={(e) =>
                setForm({ ...form, searchScript: e.target.value })
              }
              className={taCls}
              rows={5}
              placeholder={`(ctx) => {\n  // ctx.query: 搜索关键词\n  // ctx.headers: 请求头\n  // 返回: { results: [{id, title, poster, episodes, ...}] }\n  return { results: [] };\n}`}
            />
          </div>

          <div>
            <label className={lblCls}>详情脚本 (detailScript) - 可选</label>
            <textarea
              value={form.detailScript || ''}
              onChange={(e) =>
                setForm({ ...form, detailScript: e.target.value })
              }
              className={taCls}
              rows={5}
              placeholder={`(ctx) => {\n  // ctx.id: 视频ID\n  // ctx.url: 详情URL\n  // 返回: {id, title, poster, episodes, episodes_titles, ...}\n  return null;\n}`}
            />
          </div>

          <div>
            <label className={lblCls}>播放脚本 (playScript) - 可选</label>
            <textarea
              value={form.playScript || ''}
              onChange={(e) => setForm({ ...form, playScript: e.target.value })}
              className={taCls}
              rows={5}
              placeholder={`(ctx) => {\n  // ctx.url: 原始播放URL\n  // 返回: 解析后的URL或 {url, headers}对象\n  return ctx.url;\n}`}
            />
          </div>

          <div className='flex items-center gap-3'>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={form.enabled !== false}
                onChange={(e) =>
                  setForm({ ...form, enabled: e.target.checked })
                }
                className='w-4 h-4'
              />
              启用
            </label>
          </div>

          <div className='flex gap-2'>
            <button onClick={handleSave} className={buttonStyles.primarySmall}>
              {editingId ? '更新' : '创建'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className={buttonStyles.secondarySmall}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {scripts.length === 0 && !showForm && (
        <div className='text-center py-8 text-gray-400 dark:text-gray-500 text-sm'>
          暂无脚本，点击"新建脚本"开始
        </div>
      )}

      <div className='space-y-3'>
        {scripts.map((script) => (
          <div
            key={script.id}
            className='border rounded-lg bg-white dark:bg-gray-800 overflow-hidden'
          >
            <div className='flex items-center gap-3 p-3'>
              {/* Toggle */}
              <button
                onClick={() => handleToggle(script)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  script.enabled
                    ? buttonStyles.toggleOn
                    : buttonStyles.toggleOff
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${buttonStyles.toggleThumb} ${
                    script.enabled
                      ? buttonStyles.toggleThumbOn
                      : buttonStyles.toggleThumbOff
                  }`}
                />
              </button>

              <div className='flex-1 min-w-0'>
                <div className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                  {script.name}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  目标源: {script.targetSource || '(未指定)'}
                  <span className='ml-2'>
                    类型:{' '}
                    {[
                      script.searchScript && '搜索',
                      script.detailScript && '详情',
                      script.playScript && '播放',
                    ]
                      .filter(Boolean)
                      .join('+') || '(空)'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => startEdit(script)}
                className='p-1 text-blue-600 hover:text-blue-800 text-sm'
              >
                编辑
              </button>
              <button
                onClick={() =>
                  setExpandedScriptId(
                    expandedScriptId === script.id ? null : script.id,
                  )
                }
                className='p-1 text-gray-500 hover:text-gray-700 text-sm'
              >
                {expandedScriptId === script.id ? '收起' : '展开'}
              </button>
              <button
                onClick={() => handleDelete(script.id)}
                disabled={isLoading(`delete_${script.id}`)}
                className='p-1 text-red-600 hover:text-red-800 text-sm'
              >
                删除
              </button>
            </div>

            {expandedScriptId === script.id && (
              <div className='border-t px-3 py-2 bg-gray-50 dark:bg-gray-850 space-y-2'>
                {script.searchScript && (
                  <div>
                    <div className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1'>
                      搜索脚本
                    </div>
                    <pre className='text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-40'>
                      {script.searchScript}
                    </pre>
                  </div>
                )}
                {script.detailScript && (
                  <div>
                    <div className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1'>
                      详情脚本
                    </div>
                    <pre className='text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-40'>
                      {script.detailScript}
                    </pre>
                  </div>
                )}
                {script.playScript && (
                  <div>
                    <div className='text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1'>
                      播放脚本
                    </div>
                    <pre className='text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-40'>
                      {script.playScript}
                    </pre>
                  </div>
                )}

                {/* Test panel */}
                <div className='pt-2 border-t dark:border-gray-700 space-y-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-gray-600 dark:text-gray-300'>
                      测试
                    </span>
                    <select
                      value={testType}
                      onChange={(e) =>
                        setTestType(
                          e.target.value as 'search' | 'detail' | 'play',
                        )
                      }
                      className='px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700 dark:border-gray-600'
                    >
                      <option value='search'>搜索</option>
                      <option value='detail'>详情</option>
                      <option value='play'>播放</option>
                    </select>
                    <input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      className='flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700 dark:border-gray-600'
                      placeholder={
                        testType === 'search'
                          ? '搜索关键词'
                          : testType === 'detail'
                            ? '视频ID或URL'
                            : '播放URL'
                      }
                    />
                    <button
                      onClick={() => handleTest(script)}
                      disabled={isLoading(`test_${script.id}`)}
                      className={buttonStyles.primarySmall}
                    >
                      {isLoading(`test_${script.id}`) ? '测试中...' : '执行'}
                    </button>
                  </div>
                  {testResult && (
                    <pre className='text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-60'>
                      {testResult}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
