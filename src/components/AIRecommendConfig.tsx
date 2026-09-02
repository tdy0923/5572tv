/* eslint-disable unused-imports/no-unused-vars */

'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Flame,
  Lightbulb,
  Save,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AdminConfig } from '@/lib/admin.types';
import { useConfigMessage } from '@/hooks/useConfigMessage';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentInput,
  FluentSpinner,
} from '@/components/FluentUI';
import Toggle from '@/components/Toggle';

interface AIRecommendConfigProps {
  config: AdminConfig | null;
  refreshConfig: () => Promise<void>;
}

const AIRecommendConfig = ({
  config,
  refreshConfig,
}: AIRecommendConfigProps) => {
  const { message, isLoading, setIsLoading, showMessage } = useConfigMessage();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [aiSettings, setAiSettings] = useState({
    enabled: false,
    apiUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 3000,
    enableOrchestrator: false,
    enableWebSearch: false,
    tavilyApiKeys: [] as string[],
  });

  const [tavilyKeysInput, setTavilyKeysInput] = useState('');

  const [tavilyUsage, setTavilyUsage] = useState<{
    loading: boolean;
    data: Array<{
      key: string;
      fullKey: string;
      index: number;
      keyUsage: number;
      keyLimit: number;
      planUsage: number;
      planLimit: number;
      currentPlan: string;
      error?: string;
    }> | null;
    lastUpdated: string | null;
  }>({
    loading: false,
    data: null,
    lastUpdated: null,
  });

  const MODEL_EXAMPLES = [
    'gpt-5 (OpenAI)',
    'o3-mini (OpenAI)',
    'claude-4-opus (Anthropic)',
    'claude-4-sonnet (Anthropic)',
    'gemini-2.5-flash (Google)',
    'gemini-2.5-pro (Google)',
    'deepseek-reasoner (DeepSeek)',
    'deepseek-chat (DeepSeek)',
    'deepseek-coder (DeepSeek)',
    'qwen3-max (阿里云)',
    'glm-4-plus (智谱AI)',
    'llama-4 (Meta)',
    'grok-4 (xAI)',
  ];

  useEffect(() => {
    if (config?.AIRecommendConfig) {
      const keys = config.AIRecommendConfig.tavilyApiKeys || [];
      setAiSettings({
        enabled: config.AIRecommendConfig.enabled ?? false,
        apiUrl: config.AIRecommendConfig.apiUrl || '',
        apiKey: config.AIRecommendConfig.apiKey || '',
        model: config.AIRecommendConfig.model || '',
        temperature: config.AIRecommendConfig.temperature ?? 0.7,
        maxTokens: config.AIRecommendConfig.maxTokens ?? 3000,
        enableOrchestrator:
          config.AIRecommendConfig.enableOrchestrator ?? false,
        enableWebSearch: config.AIRecommendConfig.enableWebSearch ?? false,
        tavilyApiKeys: keys,
      });
      setTavilyKeysInput(keys.join(', '));
    }
  }, [config]);

  const handleSave = async () => {
    const keys = tavilyKeysInput
      .split(/[,\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const settingsToSave = {
      ...aiSettings,
      tavilyApiKeys: keys,
    };

    if (settingsToSave.enabled) {
      const hasAIModel = !!(
        settingsToSave.apiUrl.trim() &&
        settingsToSave.apiKey.trim() &&
        settingsToSave.model.trim()
      );
      const hasTavilySearch = !!(
        settingsToSave.enableOrchestrator &&
        settingsToSave.enableWebSearch &&
        keys.length > 0
      );

      if (!hasAIModel && !hasTavilySearch) {
        showMessage(
          'error',
          '请至少配置一种模式：\n1. AI模型（API地址+密钥+模型）\n2. Tavily搜索（启用智能协调器+联网搜索+Tavily Key）',
        );
        return;
      }

      if (hasAIModel) {
        if (settingsToSave.temperature < 0 || settingsToSave.temperature > 2) {
          showMessage('error', '温度参数应在0-2之间');
          return;
        }
        if (settingsToSave.maxTokens < 1 || settingsToSave.maxTokens > 150000) {
          showMessage(
            'error',
            '最大Token数应在1-150000之间（GPT-5支持128k，推理模型建议2000+）',
          );
          return;
        }
      }

      if (
        settingsToSave.enableOrchestrator &&
        settingsToSave.enableWebSearch &&
        keys.length === 0
      ) {
        showMessage('error', '启用联网搜索需要至少配置一个Tavily API Key');
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/ai-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }

      showMessage('success', 'AI推荐配置保存成功');
      setHasUnsavedChanges(false);
      await refreshConfig();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!aiSettings.apiUrl.trim() || !aiSettings.apiKey.trim()) {
      showMessage('error', '请先填写API地址和密钥');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/ai-recommend/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: aiSettings.apiUrl,
          apiKey: aiSettings.apiKey,
          model: aiSettings.model,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'API连接测试失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      showMessage('success', 'API连接测试成功！');
    } catch (err) {
      let errorMessage = 'API连接测试失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        if ('message' in err) {
          errorMessage = String((err as any).message);
        } else {
          errorMessage = 'API连接失败，请检查网络或API配置';
        }
      }
      showMessage('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTavilyUsage = async (singleKeyIndex?: number) => {
    const keys = tavilyKeysInput
      .split(/[,\n]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    setAiSettings((prev) => ({ ...prev, tavilyApiKeys: keys }));

    let keysToCheck: string[];

    if (singleKeyIndex !== undefined) {
      keysToCheck = [keys[singleKeyIndex]];
    } else {
      keysToCheck = keys.filter((k) => k.trim().length > 0);
    }

    if (keysToCheck.length === 0) {
      showMessage('error', '没有可用的 Tavily API Key');
      return;
    }

    setTavilyUsage((prev) => ({ ...prev, loading: true }));

    try {
      const results = await Promise.all(
        keysToCheck.map(async (key, idx) => {
          try {
            const response = await fetch('https://api.tavily.com/usage', {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return {
              key: key.substring(0, 12) + '...',
              fullKey: key,
              index: singleKeyIndex !== undefined ? singleKeyIndex : idx,
              keyUsage: data.key?.usage || 0,
              keyLimit: data.key?.limit || 1000,
              planUsage: data.account?.plan_usage || 0,
              planLimit: data.account?.plan_limit || 1000,
              currentPlan: data.account?.current_plan || 'Free',
            };
          } catch (err) {
            return {
              key: key.substring(0, 12) + '...',
              fullKey: key,
              index: singleKeyIndex !== undefined ? singleKeyIndex : idx,
              keyUsage: 0,
              keyLimit: 0,
              planUsage: 0,
              planLimit: 0,
              currentPlan: 'Error',
              error: err instanceof Error ? err.message : '获取失败',
            };
          }
        }),
      );

      if (singleKeyIndex !== undefined) {
        setTavilyUsage((prev) => {
          const existingData = prev.data || [];
          const newData = [...existingData];
          const existingIndex = newData.findIndex(
            (d) => d.index === singleKeyIndex,
          );

          if (existingIndex >= 0) {
            newData[existingIndex] = results[0];
          } else {
            newData.push(results[0]);
          }

          return {
            loading: false,
            data: newData.sort((a, b) => a.index - b.index),
            lastUpdated: new Date().toLocaleString('zh-CN'),
          };
        });
        showMessage(
          'success',
          '✅ 统计数据已更新！请点击下方"保存配置"按钮保存Key到配置文件',
        );
      } else {
        setTavilyUsage({
          loading: false,
          data: results,
          lastUpdated: new Date().toLocaleString('zh-CN'),
        });
        showMessage(
          'success',
          '✅ 统计数据已更新！请点击下方"保存配置"按钮保存Key到配置文件',
        );
      }
    } catch (err) {
      showMessage('error', '获取用量失败，请稍后重试');
      setTavilyUsage((prev) => ({ ...prev, loading: false }));
    }
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
            <Flame className='w-4 h-4 text-[#f59e0b]' />
            AI 推荐配置
          </h3>
          <p className='text-xs mt-0.5' style={{ color: 'var(--color-foreground-muted)' }}>
            OpenAI 兼容 API · 支持智能协调器与联网搜索
          </p>
        </div>
        <FluentBadge variant={aiSettings.enabled ? 'success' : 'default'} size='sm' rounded>
          {aiSettings.enabled ? '已启用' : '已禁用'}
        </FluentBadge>
      </div>

      {message && (
        <FluentCard
          padding='12px'
          className={`flex items-center gap-2 border text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'}`}
        >
          {message.type === 'success' ? <CheckCircle className='h-4 w-4 shrink-0' /> : <AlertCircle className='h-4 w-4 shrink-0' />}
          <span className='whitespace-pre-wrap'>{message.text}</span>
        </FluentCard>
      )}

      {/* Basic settings */}
      <FluentCard padding='16px' className='space-y-4'>
        <div className='flex items-center gap-2'>
          <span className='w-7 h-7 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center'>
            <Lightbulb className='w-3.5 h-3.5 text-[#3b82f6]' />
          </span>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>基础设置</h4>
          <FluentBadge variant='info' size='sm' rounded>
            AI 推荐
          </FluentBadge>
        </div>

        <div className='space-y-2'>
          <FluentCard padding='10px' className='flex gap-2 bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30'>
            <span className='text-xs text-[#3b82f6] leading-relaxed'>🤖 支持 OpenAI 兼容 API，包括 ChatGPT、Claude、Gemini 等模型</span>
          </FluentCard>
          <FluentCard padding='10px' className='flex gap-2 bg-green-50/60 dark:bg-green-900/10 border-green-200/60 dark:border-green-800/30'>
            <span className='text-xs text-[#22c55e] leading-relaxed'>🆓 <strong>新功能</strong>：可仅配置 Tavily 搜索（免费），无需 AI 模型</span>
          </FluentCard>
        </div>

        <Toggle
          checked={aiSettings.enabled}
          onChange={(v) => setAiSettings((prev) => ({ ...prev, enabled: v }))}
          label='启用AI推荐功能'
          description='开启后主页将显示 AI 推荐按钮并可对话获取影视推荐'
        />

        {aiSettings.enabled && (
          <div className='space-y-4 pt-2'>
            <FluentCard padding='10px' className='bg-gradient-to-r from-blue-50/60 to-purple-50/60 dark:from-blue-900/10 dark:to-purple-900/10 border-blue-200/60 dark:border-blue-800/30'>
              <h4 className='text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1.5'>
                <Lightbulb className='w-3.5 h-3.5 text-[#3b82f6]' /> 配置模式选择
              </h4>
              <div className='text-xs text-[#6b7280] dark:text-gray-400 space-y-1 leading-relaxed'>
                <p><strong>模式一：AI模型 + Tavily搜索（推荐）</strong> - 配置所有选项，获得最佳体验</p>
                <p><strong>模式二：仅AI模型</strong> - 配置 API 地址/密钥/模型</p>
                <p><strong>模式三：仅Tavily搜索（免费）</strong> - 跳过 API 配置，直接配置智能协调器和 Tavily Keys</p>
              </div>
            </FluentCard>

            <div className='space-y-3'>
              <div className='space-y-2'>
                <div className='flex gap-2 items-end'>
                  <div className='flex-1'>
                    <FluentInput
                      label='API地址 (Tavily纯搜索模式可留空)'
                      value={aiSettings.apiUrl}
                      onChange={(e) =>
                        setAiSettings((prev) => ({
                          ...prev,
                          apiUrl: e.target.value,
                        }))
                      }
                      placeholder='https://api.openai.com/v1'
                      fullWidth
                    />
                  </div>
                  <FluentButton
                    variant='secondary'
                    size='md'
                    onClick={() => {
                      const url = aiSettings.apiUrl.trim();
                      if (
                        url &&
                        !url.endsWith('/v1') &&
                        !url.includes('/chat/completions')
                      ) {
                        const newUrl = url.endsWith('/') ? url + 'v1' : url + '/v1';
                        setAiSettings((prev) => ({ ...prev, apiUrl: newUrl }));
                        showMessage('success', '已自动添加 /v1 后缀');
                      }
                    }}
                    className='shrink-0'
                  >
                    +/v1
                  </FluentButton>
                </div>
                <details className='text-xs text-[#9ca3af]'>
                  <summary className='cursor-pointer hover:text-gray-700 dark:hover:text-gray-300'>📝 常见API地址示例 (点击展开)</summary>
                  <div className='mt-2 grid gap-1'>
                    {[
                      { name: 'OpenAI', url: 'https://api.openai.com/v1' },
                      { name: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
                      { name: '硅基流动', url: 'https://api.siliconflow.cn/v1' },
                      { name: '月之暗面', url: 'https://api.moonshot.cn/v1' },
                      { name: '智谱AI', url: 'https://open.bigmodel.cn/api/paas/v4' },
                      { name: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
                    ].map((p) => (
                      <div key={p.name} className='flex items-center justify-between'>
                        <span>• {p.name}: <code className='px-1 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-[11px]'>{p.url}</code></span>
                        <FluentButton
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            setAiSettings((prev) => ({ ...prev, apiUrl: p.url }));
                            showMessage('success', `已设置为 ${p.name} API地址`);
                          }}
                          className='!px-2 !py-0.5 !min-h-0'
                        >
                          使用
                        </FluentButton>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <FluentInput
                label='API密钥 (Tavily纯搜索模式可留空)'
                type='password'
                value={aiSettings.apiKey}
                onChange={(e) =>
                  setAiSettings((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder='sk-...'
                fullWidth
              />

              <div className='space-y-2'>
                <FluentInput
                  label='模型名称 (Tavily纯搜索模式可留空)'
                  value={aiSettings.model}
                  onChange={(e) =>
                    setAiSettings((prev) => ({ ...prev, model: e.target.value }))
                  }
                  placeholder='请填入正确的官方模型名称，如：gpt-5'
                  fullWidth
                />
                <div className='flex flex-wrap gap-1.5'>
                  {MODEL_EXAMPLES.map((example) => (
                    <FluentBadge
                      key={example}
                      variant='default'
                      size='sm'
                      rounded
                      className='cursor-pointer hover:!bg-gray-200 dark:hover:!bg-white/10'
                      onClick={() => {
                        const modelName = example.split(' (')[0];
                        setAiSettings((prev) => ({
                          ...prev,
                          model: modelName,
                        }));
                      }}
                    >
                      {example}
                    </FluentBadge>
                  ))}
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-[#9ca3af]'>温度参数: {aiSettings.temperature}</label>
                  <input
                    type='range'
                    min='0'
                    max='2'
                    step='0.1'
                    value={aiSettings.temperature}
                    onChange={(e) =>
                      setAiSettings((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    className='w-full accent-[#3b82f6]'
                  />
                  <p className='text-xs text-[#9ca3af]'>控制随机性，0=确定性，2=最随机</p>
                </div>
                <FluentInput
                  label='最大Token数'
                  type='number'
                  min={1}
                  max={150000}
                  value={String(aiSettings.maxTokens)}
                  onChange={(e) =>
                    setAiSettings((prev) => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value) || 3000,
                    }))
                  }
                  fullWidth
                />
              </div>
              <p className='text-xs text-[#9ca3af] flex items-center gap-1'>
                <AlertTriangle className='w-3.5 h-3.5 text-[#f59e0b]' /> 推理模型建议 2000+，过低可能导致空回复
              </p>
            </div>
          </div>
        )}
      </FluentCard>

      {/* Orchestrator */}
      {aiSettings.enabled && (
        <FluentCard padding='16px' className='space-y-4'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center'>
              <Flame className='w-3.5 h-3.5 text-[#8b5cf6]' />
            </span>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>智能协调器设置（高级）</h4>
            <FluentBadge variant='info' size='sm' rounded>
              可选
            </FluentBadge>
          </div>
          <p className='text-xs text-[#9ca3af] leading-relaxed'>开启后 AI 可自动判断是否需要联网搜索获取最新信息（如最新上映、演员动态）</p>

          <Toggle
            checked={aiSettings.enableOrchestrator}
            onChange={(v) =>
              setAiSettings((prev) => ({ ...prev, enableOrchestrator: v }))
            }
            label='启用智能协调器（意图分析）'
            description='自动分析用户问题，判断是否需要联网搜索'
          />

          {aiSettings.enableOrchestrator && (
            <div className='space-y-4 pl-4 border-l-2 border-purple-200 dark:border-purple-800/50'>
              <Toggle
                checked={aiSettings.enableWebSearch}
                onChange={(v) =>
                  setAiSettings((prev) => ({ ...prev, enableWebSearch: v }))
                }
                label='启用联网搜索（Tavily）'
                description='使用 Tavily 获取最新影视资讯'
              />

              {aiSettings.enableWebSearch && (
                <div className='space-y-3'>
                  <FluentInput
                    label='Tavily API Keys（每个账号1000次/月免费）'
                    value={tavilyKeysInput}
                    onChange={(e) => {
                      setTavilyKeysInput(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    onBlur={() => {
                      const keys = tavilyKeysInput
                        .split(/[,\n]+/)
                        .map((k) => k.trim())
                        .filter((k) => k.length > 0);
                      setAiSettings((prev) => ({
                        ...prev,
                        tavilyApiKeys: keys,
                      }));
                    }}
                    placeholder='tvly-xxxxxxxxxxxxxx, tvly-yyyyyyyyyyyyyy'
                    fullWidth
                  />
                  <FluentCard padding='10px' className='bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30 space-y-1'>
                    <p className='text-xs font-semibold text-[#3b82f6]'>📊 免费额度说明</p>
                    <ul className='text-xs text-[#6b7280] dark:text-gray-400 list-disc list-inside space-y-0.5'>
                      <li>每个账号 1000 次/月，多 Key 轮询</li>
                      <li>例如 5 个 Key = 5000 次/月</li>
                      <li>注册地址：<a href='https://tavily.com' target='_blank' rel='noopener noreferrer' className='underline text-[#3b82f6]'>https://tavily.com</a></li>
                    </ul>
                  </FluentCard>
                  {aiSettings.tavilyApiKeys.length > 0 && (
                    <p className='text-xs text-[#22c55e] flex items-center gap-1'>
                      <CheckCircle className='w-3.5 h-3.5' /> 已配置 {aiSettings.tavilyApiKeys.length} 个 Key（预计 {aiSettings.tavilyApiKeys.length * 1000} 次/月）
                    </p>
                  )}

                  {aiSettings.tavilyApiKeys.length > 0 && (
                    <div className='space-y-3 pt-2'>
                      <div className='flex items-center justify-between'>
                        <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>📊 API 用量统计</h4>
                        <FluentButton variant='secondary' size='sm' loading={tavilyUsage.loading} onClick={() => fetchTavilyUsage()} disabled={tavilyUsage.loading}>
                          {tavilyUsage.loading ? '查询中...' : '查询全部'}
                        </FluentButton>
                      </div>
                      {tavilyUsage.loading && (
                        <div className='flex items-center gap-2 py-2'>
                          <FluentSpinner size='small' />
                          <span className='text-xs text-[#9ca3af]'>正在查询用量...</span>
                        </div>
                      )}
                      {tavilyUsage.lastUpdated && (
                        <p className='text-xs text-[#9ca3af]'>最后更新: {tavilyUsage.lastUpdated}</p>
                      )}
                      <div className='space-y-2'>
                        {aiSettings.tavilyApiKeys.map((key, index) => {
                          const usage = tavilyUsage.data?.find((d) => d.index === index);
                          return (
                            <FluentCard key={key} padding='12px' className='bg-gradient-to-r from-purple-50/60 to-blue-50/60 dark:from-purple-900/10 dark:to-blue-900/10'>
                              <div className='flex items-center justify-between mb-2'>
                                <span className='text-xs font-mono text-[#6b7280] dark:text-gray-400'>Key #{index + 1}: {key.substring(0, 12)}...</span>
                                <div className='flex items-center gap-2'>
                                  {usage && <FluentBadge variant='info' size='sm' rounded>{usage.currentPlan}</FluentBadge>}
                                  <FluentButton variant='secondary' size='sm' loading={tavilyUsage.loading} onClick={() => fetchTavilyUsage(index)} className='!px-2 !py-1 !min-h-[26px]'>
                                    {usage ? '刷新' : '查询'}
                                  </FluentButton>
                                </div>
                              </div>
                              {!usage ? (
                                <p className='text-xs text-[#9ca3af] py-1'>点击查询获取用量信息</p>
                              ) : usage.error ? (
                                <p className='text-xs text-[#ef4444]'>{usage.error}</p>
                              ) : (
                                <div className='space-y-2'>
                                  <div>
                                    <div className='flex justify-between text-xs mb-1'>
                                      <span className='text-[#9ca3af]'>Key 用量</span>
                                      <span className='font-semibold text-gray-900 dark:text-white'>{usage.keyUsage} / {usage.keyLimit} <span className='text-[#9ca3af]'>({((usage.keyUsage / usage.keyLimit) * 100).toFixed(1)}%)</span></span>
                                    </div>
                                    <div className='h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden'>
                                      <div className={`h-full rounded-full transition-all ${usage.keyUsage / usage.keyLimit > 0.9 ? 'bg-[#ef4444]' : usage.keyUsage / usage.keyLimit > 0.7 ? 'bg-[#f59e0b]' : 'bg-[#22c55e]'}`} style={{ width: `${Math.min((usage.keyUsage / usage.keyLimit) * 100, 100)}%` }} />
                                    </div>
                                  </div>
                                  <div>
                                    <div className='flex justify-between text-xs mb-1'>
                                      <span className='text-[#9ca3af]'>Plan 用量</span>
                                      <span className='font-semibold text-gray-900 dark:text-white'>{usage.planUsage} / {usage.planLimit} <span className='text-[#9ca3af]'>({((usage.planUsage / usage.planLimit) * 100).toFixed(1)}%)</span></span>
                                    </div>
                                    <div className='h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden'>
                                      <div className={`h-full rounded-full transition-all ${usage.planUsage / usage.planLimit > 0.9 ? 'bg-[#ef4444]' : usage.planUsage / usage.planLimit > 0.7 ? 'bg-[#f59e0b]' : 'bg-[#8b5cf6]'}`} style={{ width: `${Math.min((usage.planUsage / usage.planLimit) * 100, 100)}%` }} />
                                    </div>
                                  </div>
                                  <div className='text-xs text-[#9ca3af]'>剩余: {usage.keyLimit - usage.keyUsage} 次</div>
                                </div>
                              )}
                            </FluentCard>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </FluentCard>
      )}

      <div className='flex flex-wrap gap-2 pt-1'>
        {aiSettings.enabled && (
          <FluentButton variant='secondary' size='md' loading={isLoading} onClick={handleTest}>
            {isLoading ? '测试中...' : '测试连接'}
          </FluentButton>
        )}
        <FluentButton
          variant={hasUnsavedChanges ? 'primary' : 'primary'}
          size='md'
          icon={<Save className='h-4 w-4' />}
          loading={isLoading}
          onClick={handleSave}
          className={hasUnsavedChanges ? 'animate-pulse' : ''}
        >
          {isLoading ? '保存中...' : hasUnsavedChanges ? '保存配置（有未保存更改）' : '保存配置'}
        </FluentButton>
      </div>
      {isLoading && (
        <div className='flex items-center gap-2'>
          <FluentSpinner size='small' />
          <span className='text-xs text-[#9ca3af]'>处理中...</span>
        </div>
      )}
    </div>
  );
};

export default AIRecommendConfig;
