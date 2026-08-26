import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class VersionService {
  static String get apiUrl => '${ApiService.baseUrl}/api/version-check';
  static const String _lastCheckKey = 'last_version_check';
  static const String _dismissedVersionKey = 'dismissed_version';
  
  /// 检查是否有新版本
  static Future<VersionInfo?> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;
      
      final response = await http.get(
        Uri.parse(apiUrl),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final latestVersion = data['version'] as String? ?? '';
        final releaseNotes = data['releaseNotes'] as String? ?? '';
        
        // 比较版本号
        if (_isNewerVersion(currentVersion, latestVersion)) {
          return VersionInfo(
            currentVersion: currentVersion,
            latestVersion: latestVersion,
            releaseNotes: releaseNotes,
          );
        }
      }
      
      return null;
    } catch (e) {
      debugPrint('检查版本更新失败: $e');
      return null;
    }
  }
  
  /// 获取 GitHub Release 页面 URL
  /// 比较版本号，判断是否有新版本
  /// 对非纯数字段做容错（如 1.12.0-beta 视为 1.12.0），避免解析异常导致升级判断失效
  static bool _isNewerVersion(String current, String latest) {
    final currentParts = current
        .split('.')
        .map((p) => int.tryParse(p.trim()))
        .map((n) => n ?? 0)
        .toList();
    final latestParts = latest
        .split('.')
        .map((p) => int.tryParse(p.trim()))
        .map((n) => n ?? 0)
        .toList();

    final maxLen = currentParts.length > latestParts.length
        ? currentParts.length
        : latestParts.length;

    for (int i = 0; i < maxLen; i++) {
      final currentPart = i < currentParts.length ? currentParts[i] : 0;
      final latestPart = i < latestParts.length ? latestParts[i] : 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false;
  }
  
  /// 检查是否应该显示更新提示（避免频繁提示）
  static Future<bool> shouldShowUpdatePrompt(String version) async {
    final prefs = await SharedPreferences.getInstance();
    
    // 检查用户是否已忽略此版本
    final dismissedVersion = prefs.getString(_dismissedVersionKey);
    if (dismissedVersion == version) {
      return false;
    }
    
    // 检查上次检查时间（每天最多提示一次）
    final lastCheck = prefs.getInt(_lastCheckKey) ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (now - lastCheck < dayInMs) {
      return false;
    }
    
    // 更新最后检查时间
    await prefs.setInt(_lastCheckKey, now);
    return true;
  }
  
  /// 标记用户已忽略某个版本
  static Future<void> dismissVersion(String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_dismissedVersionKey, version);
  }
  
  /// 清除忽略记录（用于测试或重置）
  static Future<void> clearDismissedVersion() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_dismissedVersionKey);
  }
}

class VersionInfo {
  final String currentVersion;
  final String latestVersion;
  final String releaseNotes;
  
  VersionInfo({
    required this.currentVersion,
    required this.latestVersion,
    required this.releaseNotes,
  });
}
