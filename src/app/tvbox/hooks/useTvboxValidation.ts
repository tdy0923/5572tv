'use client';

import { useCallback, useState } from 'react';

import type {
  DiagnosisResult,
  JarFixResult,
  SecurityConfig,
  SmartHealthResult,
} from '../types';

interface UseTvboxValidationProps {
  securityConfig: SecurityConfig | null;
  onDiagnoseComplete?: (result: DiagnosisResult) => void;
}

export function useTvboxValidation({
  securityConfig,
  onDiagnoseComplete,
}: UseTvboxValidationProps) {
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] =
    useState<DiagnosisResult | null>(null);
  const [refreshingJar, setRefreshingJar] = useState(false);
  const [jarRefreshMsg, setJarRefreshMsg] = useState<string | null>(null);

  const [smartHealthResult, setSmartHealthResult] =
    useState<SmartHealthResult | null>(null);
  const [smartHealthLoading, setSmartHealthLoading] = useState(false);

  const [jarFixResult, setJarFixResult] = useState<JarFixResult | null>(null);
  const [jarFixLoading, setJarFixLoading] = useState(false);

  const [deepDiagnosticResult, setDeepDiagnosticResult] = useState<any>(null);
  const [deepDiagnosticLoading, setDeepDiagnosticLoading] = useState(false);

  const [customJarUrl, setCustomJarUrl] = useState('');
  const [customJarTestResult, setCustomJarTestResult] = useState<any>(null);
  const [customJarTestLoading, setCustomJarTestLoading] = useState(false);
  const [hasCustomJarConfig, setHasCustomJarConfig] = useState(false);

  const handleDiagnose = useCallback(async () => {
    setDiagnosing(true);
    setDiagnosisResult(null);
    try {
      const params = new URLSearchParams();
      if (securityConfig?.enableAuth && securityConfig.token) {
        params.append('token', securityConfig.token);
      }
      const response = await fetch(`/api/tvbox/diagnose?${params.toString()}`);
      const data = await response.json();
      setDiagnosisResult(data);
      onDiagnoseComplete?.(data);
    } catch {
      setDiagnosisResult({ error: '诊断失败，请稍后重试' });
    } finally {
      setDiagnosing(false);
    }
  }, [securityConfig, onDiagnoseComplete]);

  const handleRefreshJar = useCallback(async () => {
    setRefreshingJar(true);
    setJarRefreshMsg(null);
    try {
      const response = await fetch('/api/tvbox/spider-status', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setJarRefreshMsg(
          `✓ JAR 缓存已刷新 (${data.jar_status.source.split('/').pop()})`,
        );
        if (diagnosisResult) {
          setTimeout(() => handleDiagnose(), 500);
        }
      } else {
        setJarRefreshMsg(`✗ 刷新失败: ${data.error}`);
      }
    } catch {
      setJarRefreshMsg('✗ 刷新失败，请稍后重试');
    } finally {
      setRefreshingJar(false);
      setTimeout(() => setJarRefreshMsg(null), 5000);
    }
  }, [diagnosisResult, handleDiagnose]);

  const handleSmartHealthCheck = useCallback(async () => {
    setSmartHealthLoading(true);
    setSmartHealthResult(null);
    try {
      const response = await fetch('/api/tvbox/smart-health');
      const data = await response.json();
      setSmartHealthResult(data);
    } catch {
      setSmartHealthResult({
        success: false,
        error: '智能健康检查失败，请稍后重试',
      } as SmartHealthResult);
    } finally {
      setSmartHealthLoading(false);
    }
  }, []);

  const handleJarFix = useCallback(async () => {
    setJarFixLoading(true);
    setJarFixResult(null);
    try {
      const response = await fetch('/api/tvbox/jar-fix');
      const data = await response.json();
      setJarFixResult(data);
    } catch {
      setJarFixResult({
        success: false,
        error: 'JAR源修复诊断失败，请稍后重试',
      } as JarFixResult);
    } finally {
      setJarFixLoading(false);
    }
  }, []);

  const handleDeepDiagnostic = useCallback(async () => {
    setDeepDiagnosticLoading(true);
    setDeepDiagnosticResult(null);
    try {
      const response = await fetch('/api/tvbox/jar-diagnostic');
      const data = await response.json();
      setDeepDiagnosticResult(data);
    } catch {
      setDeepDiagnosticResult({
        error: '深度诊断失败，请稍后重试',
      });
    } finally {
      setDeepDiagnosticLoading(false);
    }
  }, []);

  const handleTestCustomJar = useCallback(async () => {
    if (!customJarUrl.trim()) {
      alert('请输入 JAR URL');
      return;
    }

    setCustomJarTestLoading(true);
    setCustomJarTestResult(null);

    try {
      const startTime = Date.now();
      const proxyUrl = `/api/proxy/spider.jar?url=${encodeURIComponent(customJarUrl)}&refresh=1`;
      const response = await fetch(proxyUrl, { method: 'HEAD' });
      const responseTime = Date.now() - startTime;

      const result = {
        success: response.ok,
        url: customJarUrl,
        proxyUrl: proxyUrl,
        statusCode: response.status,
        responseTime: responseTime,
        size: response.headers.get('content-length'),
        source: response.headers.get('x-spider-source'),
        cached: response.headers.get('x-spider-cached'),
        spiderSuccess: response.headers.get('x-spider-success'),
        error: response.ok
          ? null
          : `HTTP ${response.status}: ${response.statusText}`,
      };

      setCustomJarTestResult(result);
    } catch (error) {
      setCustomJarTestResult({
        success: false,
        url: customJarUrl,
        error: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setCustomJarTestLoading(false);
    }
  }, [customJarUrl]);

  const fetchCustomJarConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/tvbox/custom-jar');
      if (response.ok) {
        const data = await response.json();
        if (data.enabled && data.jarUrl) {
          setCustomJarUrl(data.jarUrl);
          setHasCustomJarConfig(true);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('获取自定义 JAR 配置失败:', error);
    }
  }, []);

  return {
    diagnosing,
    diagnosisResult,
    refreshingJar,
    jarRefreshMsg,
    smartHealthResult,
    smartHealthLoading,
    jarFixResult,
    jarFixLoading,
    deepDiagnosticResult,
    deepDiagnosticLoading,
    customJarUrl,
    customJarTestResult,
    customJarTestLoading,
    hasCustomJarConfig,
    setCustomJarUrl,
    handleDiagnose,
    handleRefreshJar,
    handleSmartHealthCheck,
    handleJarFix,
    handleDeepDiagnostic,
    handleTestCustomJar,
    fetchCustomJarConfig,
  };
}
