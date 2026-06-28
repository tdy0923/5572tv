'use client';
import { useEffect, useRef, useState } from 'react';

export function useAdFilter(currentSourceRef: React.RefObject<string | null>) {
  const [blockAdEnabled, setBlockAdEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('enable_blockad') !== 'false';
  });
  const blockAdEnabledRef = useRef(blockAdEnabled);

  const [customAdFilterCode, setCustomAdFilterCode] = useState<string>('');
  const customAdFilterCodeRef = useRef(customAdFilterCode);

  useEffect(() => {
    const fetchAdFilterCode = async () => {
      try {
        const cachedCode = localStorage.getItem('customAdFilterCode');
        const cachedVersion = localStorage.getItem('customAdFilterVersion');

        if (cachedCode && cachedVersion) {
          setCustomAdFilterCode(cachedCode);
        }

        const version =
          (window as any).RUNTIME_CONFIG?.CUSTOM_AD_FILTER_VERSION || 0;

        if (version === 0) {
          localStorage.removeItem('customAdFilterCode');
          localStorage.removeItem('customAdFilterVersion');
          setCustomAdFilterCode('');
          return;
        }

        if (!cachedVersion || parseInt(cachedVersion) !== version) {
          const fullResponse = await fetch('/api/ad-filter?full=true');
          if (!fullResponse.ok) {
            console.warn('获取完整去广告代码失败，使用缓存');
            return;
          }

          const { code, version: newVersion } = await fullResponse.json();

          localStorage.setItem('customAdFilterCode', code || '');
          localStorage.setItem(
            'customAdFilterVersion',
            String(newVersion || 0),
          );
          setCustomAdFilterCode(code || '');
        }
      } catch (error) {
        console.error('获取自定义去广告代码失败:', error);
      }
    };

    fetchAdFilterCode();
  }, []);

  // Sync refs on state changes
  useEffect(() => {
    blockAdEnabledRef.current = blockAdEnabled;
    customAdFilterCodeRef.current = customAdFilterCode;
  }, [blockAdEnabled, customAdFilterCode]);

  function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';

    const customCode = customAdFilterCodeRef.current;
    if (customCode && customCode.trim()) {
      try {
        const jsCode = customCode
          .replace(
            /(\w+)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*([,)])/g,
            '$1$3',
          )
          .replace(
            /\)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*\{/g,
            ') {',
          )
          .replace(
            /(const|let|var)\s+(\w+)\s*:\s*(string|number|boolean|any|void|never|unknown|object)\s*=/g,
            '$1 $2 =',
          );

        const MAX_CODE_SIZE = 51200;
        if (jsCode.length > MAX_CODE_SIZE) {
          console.warn('自定义去广告代码超过 50KB 限制，跳过');
          return m3u8Content;
        }
        const dangerousPatterns = [
          /\beval\b/,
          /\bnew\s+Function\b/,
          /\brequire\b/,
          /\bprocess\b/,
          /\bchild_process\b/,
          /\bfs\b/,
          /\bhttp\b/,
          /\bhttps\b/,
          /\bfetch\b/,
          /\bXMLHttpRequest\b/,
        ];
        for (const pattern of dangerousPatterns) {
          if (pattern.test(jsCode)) {
            console.warn('自定义去广告代码包含危险模式，跳过');
            return m3u8Content;
          }
        }
        const customFunction = new Function(
          'type',
          'm3u8Content',
          jsCode + '\nreturn filterAdsFromM3U8(type, m3u8Content);',
        );
        const result = customFunction(currentSourceRef.current, m3u8Content);
        return result;
      } catch (err) {
        console.error('执行自定义去广告代码失败,降级使用默认规则:', err);
      }
    }

    if (!m3u8Content) return '';

    const adKeywords = [
      'sponsor',
      '/ad/',
      '/ads/',
      'advert',
      'advertisement',
      '/adjump',
      'redtraffic',
    ];

    const lines = m3u8Content.split('\n');
    const filteredLines = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.includes('#EXT-X-DISCONTINUITY')) {
        i++;
        continue;
      }

      if (line.includes('#EXTINF:')) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const containsAdKeyword = adKeywords.some((keyword) =>
            nextLine.toLowerCase().includes(keyword.toLowerCase()),
          );

          if (containsAdKeyword) {
            i += 2;
            continue;
          }
        }
      }

      filteredLines.push(line);
      i++;
    }

    return filteredLines.join('\n');
  }

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (hours === 0) {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  return {
    blockAdEnabled,
    setBlockAdEnabled,
    blockAdEnabledRef,
    customAdFilterCodeRef,
    filterAdsFromM3U8,
    formatTime,
  };
}
