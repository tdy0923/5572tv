import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class UserDataService {
  static const String _usernameKey = 'username';
  static const String _passwordKey = 'password';
  static const String _cookiesKey = 'cookies';
  static const String _doubanDataSourceKey = 'douban_data_source';
  static const String _doubanImageSourceKey = 'douban_image_source';
  static const String _m3u8ProxyUrlKey = 'm3u8_proxy_url';
  static const String _preferSpeedTestKey = 'prefer_speed_test';
  static const String _localSearchKey = 'local_search';

  // 敏感信息（密码、Cookie）使用 Keystore/Keychain 加密存储，不再落盘明文
  static const FlutterSecureStorage _secure = FlutterSecureStorage();

  // 旧版本把密码/Cookie 明文存在 SharedPreferences，这里做一次性迁移
  static Future<String?> _readSecure(String key) async {
    final secureValue = await _secure.read(key: key);
    if (secureValue != null) return secureValue;

    // 兼容旧版：从 SharedPreferences 读取并迁移到安全存储
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString(key);
    if (legacy != null && legacy.isNotEmpty) {
      await _secure.write(key: key, value: legacy);
      await prefs.remove(key);
      return legacy;
    }
    return null;
  }

  static Future<void> _writeSecure(String key, String value) async {
    if (value.isEmpty) {
      await _secure.delete(key: key);
      return;
    }
    await _secure.write(key: key, value: value);
  }

  static Future<void> saveUserData({
    required String username,
    required String password,
    required String cookies,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_usernameKey, username);
    await _writeSecure(_passwordKey, password);
    await _writeSecure(_cookiesKey, cookies);
  }

  static Future<String?> getUsername() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_usernameKey);
  }

  static Future<String?> getPassword() async {
    return _readSecure(_passwordKey);
  }

  static Future<String?> getCookies() async {
    return _readSecure(_cookiesKey);
  }

  static Future<bool> isLoggedIn() async {
    final cookies = await getCookies();
    return cookies != null && cookies.isNotEmpty;
  }

  static Future<void> clearUserData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_usernameKey);
    await _secure.delete(key: _passwordKey);
    await _secure.delete(key: _cookiesKey);
  }

  static Future<void> clearPasswordAndCookies() async {
    await _secure.delete(key: _passwordKey);
    await _secure.delete(key: _cookiesKey);
  }

  static Future<Map<String, String?>> getAllUserData() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'username': prefs.getString(_usernameKey),
      'password': await _readSecure(_passwordKey),
      'cookies': await _readSecure(_cookiesKey),
    };
  }

  static Future<bool> hasAutoLoginData() async {
    final username = await getUsername();
    final password = await getPassword();
    return username != null && username.isNotEmpty && password != null && password.isNotEmpty;
  }

  // 保存豆瓣数据源设置（存储key值）
  static Future<void> saveDoubanDataSource(String dataSourceDisplayName) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _getDoubanDataSourceKeyFromDisplayName(dataSourceDisplayName);
    await prefs.setString(_doubanDataSourceKey, key);
  }

  // 获取豆瓣数据源设置（返回key值）
  static Future<String> getDoubanDataSourceKey() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_doubanDataSourceKey) ?? 'direct';
  }

  // 获取豆瓣数据源显示名称
  static Future<String> getDoubanDataSourceDisplayName() async {
    final key = await getDoubanDataSourceKey();
    return _getDoubanDataSourceDisplayNameFromKey(key);
  }

  // 保存豆瓣图片源设置（存储key值）
  static Future<void> saveDoubanImageSource(String imageSourceDisplayName) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _getDoubanImageSourceKeyFromDisplayName(imageSourceDisplayName);
    await prefs.setString(_doubanImageSourceKey, key);
  }

  // 获取豆瓣图片源设置（返回key值）
  static Future<String> getDoubanImageSourceKey() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_doubanImageSourceKey) ?? 'direct';
  }

  // 获取豆瓣图片源显示名称
  static Future<String> getDoubanImageSourceDisplayName() async {
    final key = await getDoubanImageSourceKey();
    return _getDoubanImageSourceDisplayNameFromKey(key);
  }

  // 根据显示名称获取豆瓣数据源的key值（私有方法）
  static String _getDoubanDataSourceKeyFromDisplayName(String dataSource) {
    switch (dataSource) {
      case '直连':
        return 'direct';
      case 'Cors Proxy By Zwei':
        return 'cors_proxy';
      case '豆瓣 CDN By CMLiussss（腾讯云）':
        return 'cdn_tencent';
      case '豆瓣 CDN By CMLiussss（阿里云）':
        return 'cdn_aliyun';
      default:
        return 'direct';
    }
  }

  // 根据显示名称获取豆瓣图片源的key值（私有方法）
  static String _getDoubanImageSourceKeyFromDisplayName(String imageSource) {
    switch (imageSource) {
      case '直连':
        return 'direct';
      case '豆瓣官方精品 CDN':
        return 'official_cdn';
      case '豆瓣 CDN By CMLiussss（腾讯云）':
        return 'cdn_tencent';
      case '豆瓣 CDN By CMLiussss（阿里云）':
        return 'cdn_aliyun';
      default:
        return 'direct';
    }
  }

  // 根据key值获取豆瓣数据源显示名称（私有方法）
  static String _getDoubanDataSourceDisplayNameFromKey(String key) {
    switch (key) {
      case 'direct':
        return '直连';
      case 'cors_proxy':
        return 'Cors Proxy By Zwei';
      case 'cdn_tencent':
        return '豆瓣 CDN By CMLiussss（腾讯云）';
      case 'cdn_aliyun':
        return '豆瓣 CDN By CMLiussss（阿里云）';
      default:
        return '直连';
    }
  }

  // 根据key值获取豆瓣图片源显示名称（私有方法）
  static String _getDoubanImageSourceDisplayNameFromKey(String key) {
    switch (key) {
      case 'direct':
        return '直连';
      case 'official_cdn':
        return '豆瓣官方精品 CDN';
      case 'cdn_tencent':
        return '豆瓣 CDN By CMLiussss（腾讯云）';
      case 'cdn_aliyun':
        return '豆瓣 CDN By CMLiussss（阿里云）';
      default:
        return '直连';
    }
  }

  // 保存 M3U8 代理 URL
  static Future<void> saveM3u8ProxyUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_m3u8ProxyUrlKey, url);
  }

  // 获取 M3U8 代理 URL（默认使用服务器代理）
  static Future<String> getM3u8ProxyUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_m3u8ProxyUrlKey);
    // 如果用户没有配置，使用默认的服务器代理
    if (savedUrl == null || savedUrl.isEmpty) {
      return 'https://www.5572.net/api/video-proxy?url=';
    }
    // 归一化已存坏值：?url=url= 压成单层
    return savedUrl.replaceAll('?url=url=', '?url=');
  }

  // 保存优选测速设置
  static Future<void> savePreferSpeedTest(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_preferSpeedTestKey, enabled);
  }

  // 获取优选测速设置（默认为 true）
  static Future<bool> getPreferSpeedTest() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_preferSpeedTestKey) ?? true;
  }

  // 保存本地搜索设置
  static Future<void> saveLocalSearch(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_localSearchKey, enabled);
  }

  // 获取本地搜索设置（默认为 false）
  static Future<bool> getLocalSearch() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_localSearchKey) ?? false;
  }

}
