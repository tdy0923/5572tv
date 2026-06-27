// 通用图片地址处理工具

const _apiBaseUrl = 'https://www.5572.net';
const _posterCachePath = '/api/poster-cache?url=';

const _proxiedDomains = ['doubanio.com', 'manmankan.com'];
const _proxiedSources = ['douban'];

bool _needsProxy(String url, String? source) {
  if (source != null && _proxiedSources.contains(source)) return true;
  for (final domain in _proxiedDomains) {
    if (url.contains(domain)) return true;
  }
  return false;
}

/// 处理图片URL，豆瓣/manmankan图片通过API代理加载
String getImageUrlSync(String originalUrl, String? source) {
  if (originalUrl.isEmpty) return originalUrl;
  if (_needsProxy(originalUrl, source)) {
    return '$_apiBaseUrl$_posterCachePath${Uri.encodeComponent(originalUrl)}';
  }
  return originalUrl;
}

/// 异步版本（保持向后兼容）
Future<String> getImageUrl(String originalUrl, String? source) async {
  return getImageUrlSync(originalUrl, source);
}

/// API代理URL不需要额外HTTP头
Map<String, String>? getImageRequestHeaders(String imageUrl, String? source) {
  return null;
}
