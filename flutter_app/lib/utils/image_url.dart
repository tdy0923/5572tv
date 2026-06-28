// 通用图片地址处理工具

const _apiBaseUrl = 'https://www.5572.net';

const _proxiedDomains = ['doubanio.com', 'manmankan.com'];
const _proxiedSources = ['douban'];

bool _needsProxy(String url, String? source) {
  if (source != null && _proxiedSources.contains(source)) return true;
  for (final domain in _proxiedDomains) {
    if (url.contains(domain)) return true;
  }
  return false;
}

String _getContentId(String url) {
  final doubanMatch = RegExp(r'/public/(p\d+)\.').firstMatch(url);
  if (doubanMatch != null) {
    return doubanMatch.group(1)!;
  }
  final manmankanMatch =
      RegExp(r'/([^/]+)\.(jpg|jpeg|png|webp)', caseSensitive: false)
          .firstMatch(url);
  if (manmankanMatch != null) {
    return manmankanMatch.group(1)!;
  }
  int hash = 0;
  for (int i = 0; i < url.length; i++) {
    final char = url.codeUnitAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_${(hash.abs()).toRadixString(36)}';
}

String _getExtension(String url) {
  if (url.contains('.webp')) return '.webp';
  if (url.contains('.png')) return '.png';
  return '.jpg';
}

/// 处理图片URL
/// 豆瓣/manmankan图片通过CDN缓存的静态路径加载
String getImageUrlSync(String originalUrl, String? source) {
  if (originalUrl.isEmpty) return originalUrl;
  if (_needsProxy(originalUrl, source)) {
    final contentId = _getContentId(originalUrl);
    final ext = _getExtension(originalUrl);
    return '$_apiBaseUrl/poster-cache/$contentId$ext';
  }
  return originalUrl;
}

Future<String> getImageUrl(String originalUrl, String? source) async {
  return getImageUrlSync(originalUrl, source);
}

Map<String, String>? getImageRequestHeaders(String imageUrl, String? source) {
  return null;
}
