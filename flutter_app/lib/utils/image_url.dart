// 通用图片地址处理工具

/// 根据来源处理图片 URL（使用本地缓存绕过防盗链）。
/// - [originalUrl]: 原始图片地址
/// - [source]: 数据来源（如 'douban'、'bangumi' 等）
/// 返回可直接用于加载的图片地址。
Future<String> getImageUrl(String originalUrl, String? source) async {
  if (originalUrl.isEmpty) return originalUrl;

  // 豆瓣/manmankan图片通过本地缓存代理加载
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
  // 代理URL不需要额外头
  if (imageUrl.contains('/api/poster-cache') || imageUrl.contains('/api/image-proxy')) {
    return null;
  }
  return null;
}


