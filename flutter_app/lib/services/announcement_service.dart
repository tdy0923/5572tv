import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AnnouncementService {
  static const String _lastShownKey = 'announcement_last_shown';
  static const String _dismissedContentKey = 'announcement_dismissed';

  /// 从服务器获取公告
  static Future<AnnouncementInfo?> fetchAnnouncement(String serverUrl) async {
    try {
      final response = await http.get(
        Uri.parse('$serverUrl/api/server-config'),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final title = data['AnnouncementTitle'] as String? ?? '公告';
        final content = data['Announcement'] as String? ?? '';

        if (content.isNotEmpty) {
          return AnnouncementInfo(title: title, content: content);
        }
      }
    } catch (_) {}
    return null;
  }

  /// 检查是否应该显示公告（每天最多一次，内容变化时重新展示）
  static Future<bool> shouldShow(AnnouncementInfo info) async {
    final prefs = await SharedPreferences.getInstance();
    final dismissedContent = prefs.getString(_dismissedContentKey);
    if (dismissedContent == info.content) return false;

    final lastShown = prefs.getInt(_lastShownKey) ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - lastShown < 24 * 60 * 60 * 1000) return false;

    await prefs.setInt(_lastShownKey, now);
    return true;
  }

  /// 标记已读
  static Future<void> dismiss(String content) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_dismissedContentKey, content);
    await prefs.setInt(
      _lastShownKey,
      DateTime.now().millisecondsSinceEpoch,
    );
  }
}

class AnnouncementInfo {
  final String title;
  final String content;
  AnnouncementInfo({required this.title, required this.content});
}
