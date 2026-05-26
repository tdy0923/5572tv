/**
 * 全局 Fetch 拦截器
 * 自动监控所有外部 API 请求的流量
 */

import { recordExternalTraffic } from './external-traffic-monitor';

// 保存原始的 fetch 函数
const originalFetch = global.fetch;

/**
 * 初始化全局 fetch 拦截器
 */
export function initFetchInterceptor() {
  // 只在服务端拦截
  if (typeof window !== 'undefined') {
    return;
  }

  // 替换全局 fetch
  global.fetch = async (
    url: RequestInfo | URL,
    options?: RequestInit,
  ): Promise<Response> => {
    const startTime = Date.now();
    const urlString = url.toString();

    // 计算请求大小
    let requestSize = 0;
    if (options?.body) {
      if (typeof options.body === 'string') {
        requestSize = Buffer.byteLength(options.body, 'utf8');
      } else if (options.body instanceof Buffer) {
        requestSize = options.body.length;
      }
    }

    try {
      // 执行原始 fetch
      const response = await originalFetch(url, options);

      // 克隆响应以读取内容
      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();
      const responseSize = Buffer.byteLength(responseText, 'utf8');

      // 记录外部流量
      recordExternalTraffic({
        timestamp: startTime,
        url: urlString,
        method: options?.method || 'GET',
        requestSize,
        responseSize,
        duration: Date.now() - startTime,
        statusCode: response.status,
      });

      //       console.log(`🌐 [External] ${options?.method || 'GET'} ${urlString} - ${response.status} - ${(responseSize / 1024).toFixed(2)} KB`);

      return response;
    } catch (error) {
      // 即使失败也记录
      recordExternalTraffic({
        timestamp: startTime,
        url: urlString,
        method: options?.method || 'GET',
        requestSize,
        responseSize: 0,
        duration: Date.now() - startTime,
        statusCode: 0,
      });

      throw error;
    }
  };

  //   console.log('✅ 全局 Fetch 拦截器已启动，开始监控外部流量');
}
