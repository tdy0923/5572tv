// 通用图片地址处理工具

/// 从豆瓣URL提取内容ID
String _getContentId(String url) {
  // 豆瓣: /view/photo/s_ratio_poster/public/p2929038414.jpg → p2929038414
  final doubanMatch = RegExp(r'/public/(p\d+)\.').firstMatch(url);
  if (doubanMatch != null) {
    return doubanMatch.group(1)!;
  }
  
  // manmankan格式
  final manmankanMatch = RegExp(r'/([^/]+)\.(jpg|jpeg|png|webp)').firstMatch(url);
  if (manmankanMatch != null) {
    return manmankanMatch.group(1)!;
  }
  
  // 通用hash
  int hash = 0;
  for (int i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash) + url.codeUnitAt(i);
    hash = hash & hash;
  }
  return 'hash_${(hash.abs()).toRadixString(36)}';
}

/// 根据来源处理图片 URL。
/// 策略：直接访问本地化静态文件，无需走API
Future<String> getImageUrl(String originalUrl, String? source) async {
  if (originalUrl.isEmpty) return originalUrl;

  // 豆瓣/manmankan图片使用本地化静态文件
  if (source == 'douban' || 
      originalUrl.contains('doubanio.com') || 
      originalUrl.contains('manmankan.com')) {
    final contentId = _getContentId(originalUrl);
    
    // 确定文件扩展名
    String ext = '.jpg';
    if (originalUrl.contains('.webp')) ext = '.webp';
    else if (originalUrl.contains('.png')) ext = '.png';
    
    // 直接访问本地化静态文件（Cloudflare CDN缓存）
    return 'https://www.5572.net/poster-cache/$contentId$ext';
  }

  return originalUrl;
}

/// 返回加载网络图片所需的 HTTP 头。
Map<String, String>? getImageRequestHeaders(String imageUrl, String? source) {
  // 本地化文件和代理URL不需要额外头
  return null;
}


