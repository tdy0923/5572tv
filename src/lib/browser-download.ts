/**
 * 浏览器兼容下载工具
 * 解决三星、华为、小米等浏览器的下载问题
 */

export function browserDownload(url: string, filename: string): void {
  // 加时间戳防缓存
  const sep = url.includes('?') ? '&' : '?';
  const bustUrl = `${url}${sep}_t=${Date.now()}`;

  const link = document.createElement('a');
  link.href = bustUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function isSamsungBrowser(): boolean {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
