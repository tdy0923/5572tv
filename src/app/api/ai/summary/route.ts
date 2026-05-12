import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ===== 免费 AI 模型配置（从环境变量读取密钥，轮询使用避免限流）=====
function getFreeProviders() {
  const providers = [];

  // Groq - 免费 Llama 模型
  if (process.env.GROQ_API_KEY) {
    providers.push(
      {
        name: 'Groq-Llama3.1-8B',
        apiUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.1-8b-instant',
      },
      {
        name: 'Groq-Llama3.3-70B',
        apiUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
      },
    );
  }

  // NVIDIA NIM - 免费模型
  if (process.env.NVIDIA_API_KEY) {
    providers.push({
      name: 'NVIDIA-Nemotron-Mini',
      apiUrl: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
      model: 'nvidia/nemotron-mini-4b-instruct',
    });
  }

  // SiliconFlow - 免费模型
  if (process.env.SILICONFLOW_API_KEY) {
    providers.push(
      {
        name: 'SiliconFlow-Qwen2.5-7B',
        apiUrl: 'https://api.siliconflow.cn/v1',
        apiKey: process.env.SILICONFLOW_API_KEY,
        model: 'Qwen/Qwen2.5-7B-Instruct',
      },
      {
        name: 'SiliconFlow-Qwen2-7B',
        apiUrl: 'https://api.siliconflow.cn/v1',
        apiKey: process.env.SILICONFLOW_API_KEY,
        model: 'Qwen/Qwen2-7B-Instruct',
      },
    );
  }

  // OpenRouter - 免费模型
  if (process.env.OPENROUTER_API_KEY) {
    providers.push({
      name: 'OpenRouter-Free',
      apiUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: 'meta-llama/llama-3.1-8b-instruct:free',
    });
  }

  // Google AI Studio (Gemini)
  if (process.env.GOOGLE_AI_API_KEY) {
    providers.push({
      name: 'Google-Gemini-Flash',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: 'gemini-2.0-flash',
      type: 'google',
    });
  }

  return providers;
}

// 轮询索引（模块级）
let currentProviderIndex = 0;

function getNextProvider() {
  const providers = getFreeProviders();
  if (providers.length === 0) return null;
  const provider = providers[currentProviderIndex % providers.length];
  currentProviderIndex++;
  return provider;
}

// 内存缓存
const summaryCache = new Map<string, { summary: string; timestamp: number }>();
const CACHE_TTL = 3600000;

function getCachedSummary(cacheKey: string): string | null {
  const cached = summaryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.summary;
  }
  summaryCache.delete(cacheKey);
  return null;
}

function setCachedSummary(cacheKey: string, summary: string) {
  if (summaryCache.size > 500) {
    const oldestKey = summaryCache.keys().next().value;
    if (oldestKey) summaryCache.delete(oldestKey);
  }
  summaryCache.set(cacheKey, { summary, timestamp: Date.now() });
}

// 调用 Google AI Studio
async function callGoogleAI(apiKey: string, prompt: string): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
      }),
    },
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// 调用 OpenAI 兼容 API
async function callOpenAICompatible(
  apiUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string | null> {
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

export async function POST(request: Request) {
  try {
    const { title, episode, plot } = await request.json();

    if (!title) {
      return NextResponse.json({ error: '缺少标题' }, { status: 400 });
    }

    // 检查是否有可用的 provider
    const providers = getFreeProviders();
    if (providers.length === 0) {
      return NextResponse.json(
        { error: '未配置任何 AI API 密钥，请在环境变量中设置 GROQ_API_KEY 等' },
        { status: 400 },
      );
    }

    // 检查缓存
    const cacheKey = `${title}:${episode || '第1集'}`;
    const cached = getCachedSummary(cacheKey);
    if (cached) {
      return NextResponse.json({ summary: cached, cached: true });
    }

    const prompt = plot
      ? `请用中文为以下剧集生成一个简洁的剧情摘要（不超过100字）：\n剧名：${title}\n集数：${episode || '第1集'}\n剧情：${plot}`
      : `请用中文为以下剧集生成一个简洁的剧情摘要（不超过100字）：\n剧名：${title}\n集数：${episode || '第1集'}`;

    // 轮询重试
    let lastError = '';
    for (let attempt = 0; attempt < Math.min(3, providers.length); attempt++) {
      const provider = getNextProvider();
      if (!provider) break;

      console.log(`[AI Summary] 尝试 ${attempt + 1}: ${provider.name}`);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        let summary: string | null = null;

        if (provider.type === 'google') {
          summary = await callGoogleAI(provider.apiKey, prompt);
        } else {
          summary = await callOpenAICompatible(
            provider.apiUrl,
            provider.apiKey,
            provider.model,
            prompt,
          );
        }

        clearTimeout(timeout);

        if (summary && summary.length > 10) {
          setCachedSummary(cacheKey, summary);
          console.log(`[AI Summary] 成功: ${provider.name}`);
          return NextResponse.json({ summary, provider: provider.name, cached: false });
        }

        lastError = `${provider.name}: 返回内容过短`;
      } catch (err: any) {
        lastError = `${provider.name}: ${err.name === 'AbortError' ? '超时' : err.message}`;
      }
    }

    return NextResponse.json({ error: 'AI 摘要生成失败', details: lastError }, { status: 502 });
  } catch {
    return NextResponse.json({ error: '生成摘要失败' }, { status: 500 });
  }
}
