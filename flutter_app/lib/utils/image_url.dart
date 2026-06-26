// 通用图片地址处理工具

/// 根据来源处理图片 URL。
/// 策略：通过API代理加载（Cloudflare缓存）
Future<String> getImageUrl(String originalUrl, String? source) async {
  if (originalUrl.isEmpty) return originalUrl;

  // 豆瓣/manmankan图片通过API代理加载
  if (source == 'douban' || 
      originalUrl.contains('doubanio.com') || 
      originalUrl.contains('manmankan.com')) {
    const baseUrl = 'https://www.5572.net';
    return '$baseUrl/api/poster-cache?url=${Uri.encodeComponent(originalUrl)}';
  }

  return originalUrl;
}

/// 返回加载网络图片所需的 HTTP 头。
Map<String, String>? getImageRequestHeaders(String imageUrl, String? source) {
  // API代理URL不需要额外头
  return null;
}


