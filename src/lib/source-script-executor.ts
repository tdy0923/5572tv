/* eslint-disable no-console */

import { NodeVM } from 'vm2';

import { db } from '@/lib/db';
import { SearchResult } from '@/lib/types';

const SCRIPTS_KEY = 'source_scripts';

export interface SourceScript {
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

let cachedScripts: SourceScript[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10_000; // 10s in-memory cache

async function loadScripts(): Promise<SourceScript[]> {
  const now = Date.now();
  if (cachedScripts && now - cacheTimestamp < CACHE_TTL) {
    return cachedScripts;
  }
  try {
    const data = await db.getCache(SCRIPTS_KEY);
    cachedScripts = Array.isArray(data) ? data : [];
    cacheTimestamp = now;
    return cachedScripts;
  } catch {
    cachedScripts = [];
    cacheTimestamp = now;
    return cachedScripts;
  }
}

function executeScript(
  scriptCode: string,
  context: Record<string, any>,
  timeoutMs = 5000,
): Promise<any> {
  // Code size limit: 100KB
  const MAX_CODE_SIZE = 100 * 1024;
  if (scriptCode.length > MAX_CODE_SIZE) {
    return Promise.reject(new Error('脚本代码超过大小限制'));
  }

  try {
    const vm = new NodeVM({
      timeout: timeoutMs,
      sandbox: context,
      eval: false,
      wasm: false,
      console: 'redirect',
      require: {
        external: false,
        builtin: [],
        root: './',
        mock: null,
      },
    });

    return vm.run(
      `module.exports = async (__ctx__) => { ${scriptCode} };`,
      __dirname,
    );
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Get active script for a given source key
 */
export async function getSourceScript(
  sourceKey: string,
): Promise<SourceScript | null> {
  const scripts = await loadScripts();
  return scripts.find((s) => s.enabled && s.targetSource === sourceKey) || null;
}

/**
 * Execute search script for a source
 */
export async function executeSearchScript(
  sourceKey: string,
  query: string,
  headers: Record<string, string>,
): Promise<{ results: any[]; custom?: boolean } | null> {
  const script = await getSourceScript(sourceKey);
  if (!script?.searchScript) return null;

  try {
    const ctx = { query, headers, targetSource: sourceKey };
    const result = await executeScript(script.searchScript, ctx);
    if (result && typeof result === 'object' && Array.isArray(result.results)) {
      return { results: result.results, custom: true };
    }
    return null;
  } catch (err) {
    console.warn(
      `[SourceScript] Search script failed for ${sourceKey}:`,
      (err as Error).message,
    );
    return null;
  }
}

/**
 * Execute detail script for a source
 */
export async function executeDetailScript(
  sourceKey: string,
  id: string,
  headers: Record<string, string>,
): Promise<SearchResult | null> {
  const script = await getSourceScript(sourceKey);
  if (!script?.detailScript) return null;

  try {
    const ctx = { id, url: '', headers, targetSource: sourceKey };
    const result = await executeScript(script.detailScript, ctx);
    if (result && typeof result === 'object' && result.id && result.title) {
      return result as SearchResult;
    }
    return null;
  } catch (err) {
    console.warn(
      `[SourceScript] Detail script failed for ${sourceKey}:`,
      (err as Error).message,
    );
    return null;
  }
}

/**
 * Execute play URL script for a source
 */
export async function executePlayScript(
  sourceKey: string,
  url: string,
  headers: Record<string, string>,
): Promise<string | { url: string; headers?: Record<string, string> } | null> {
  const script = await getSourceScript(sourceKey);
  if (!script?.playScript) return null;

  try {
    const ctx = { url, headers, targetSource: sourceKey };
    const result = await executeScript(script.playScript, ctx);
    if (
      result &&
      (typeof result === 'string' || typeof result.url === 'string')
    ) {
      return result;
    }
    return null;
  } catch (err) {
    console.warn(
      `[SourceScript] Play script failed for ${sourceKey}:`,
      (err as Error).message,
    );
    return null;
  }
}
