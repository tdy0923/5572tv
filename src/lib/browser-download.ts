/**
 * 浏览器兼容下载工具
 * 解决三星、华为、小米等浏览器的下载问题
 */

export function browserDownload(url: string, filename: string): void {
  // 方案1: 使用download属性
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 方案2: Samsung浏览器兼容 - 使用Blob
  setTimeout(() => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        // 如果失败，尝试直接打开
        window.open(url, '_blank');
      });
  }, 100);
}

export function isSamsungBrowser(): boolean {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
