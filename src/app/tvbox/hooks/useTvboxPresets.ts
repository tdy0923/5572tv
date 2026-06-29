'use client';

import { useCallback, useState } from 'react';

import type { ConfigMode, SecurityConfig, TvboxPreset } from '../types';

const PRESETS_STORAGE_KEY = 'tvbox-presets';

interface UseTvboxPresetsProps {
  securityConfig: SecurityConfig | null;
  userToken: string;
}

export function useTvboxPresets({
  securityConfig,
  userToken,
}: UseTvboxPresetsProps) {
  const [format, setFormat] = useState<'json' | 'base64'>('json');
  const [configMode, setConfigMode] = useState<ConfigMode>('standard');
  const [enableAdultFilter, setEnableAdultFilter] = useState(true);
  const [enableSmartProxy, setEnableSmartProxy] = useState(true);
  const [enableStrictMode, setEnableStrictMode] = useState(false);

  const getConfigUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();

    params.append('format', format);

    if (userToken) {
      params.append('token', userToken);
    } else if (securityConfig?.enableAuth && securityConfig.token) {
      params.append('token', securityConfig.token);
    }

    if (configMode !== 'standard') {
      params.append('mode', configMode);
    }

    if (!enableAdultFilter) {
      params.append('filter', 'off');
    }
    if (!enableSmartProxy) {
      params.append('proxy', 'off');
    }
    if (enableStrictMode) {
      params.append('strict', '1');
    }

    return `${baseUrl}/api/tvbox?${params.toString()}`;
  }, [
    format,
    configMode,
    securityConfig,
    userToken,
    enableAdultFilter,
    enableSmartProxy,
    enableStrictMode,
  ]);

  const savePreset = useCallback(
    (name: string) => {
      const presets = getPresetList();
      const newPreset: TvboxPreset = {
        id: Date.now().toString(),
        name,
        configMode,
        format,
        enableAdultFilter,
        enableSmartProxy,
        enableStrictMode,
        createdAt: Date.now(),
      };
      presets.push(newPreset);
      if (typeof window !== 'undefined') {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
      }
      return newPreset;
    },
    [configMode, format, enableAdultFilter, enableSmartProxy, enableStrictMode],
  );

  const loadPreset = useCallback((preset: TvboxPreset) => {
    setConfigMode(preset.configMode);
    setFormat(preset.format);
    setEnableAdultFilter(preset.enableAdultFilter);
    setEnableSmartProxy(preset.enableSmartProxy);
    setEnableStrictMode(preset.enableStrictMode);
  }, []);

  const deletePreset = useCallback((id: string) => {
    const presets = getPresetList().filter((p) => p.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    }
    return presets;
  }, []);

  return {
    format,
    setFormat,
    configMode,
    setConfigMode,
    enableAdultFilter,
    setEnableAdultFilter,
    enableSmartProxy,
    setEnableSmartProxy,
    enableStrictMode,
    setEnableStrictMode,
    getConfigUrl,
    savePreset,
    loadPreset,
    deletePreset,
    getPresetList,
  };
}

function getPresetList(): TvboxPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
