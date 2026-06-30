import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// 后台消息处理（必须是顶层函数）
@pragma('vm:entry-point')
Future<void> _handleBackgroundMessage(RemoteMessage message) async {
  print('后台收到消息: ${message.messageId}');
}

/// 推送通知服务
class NotificationService {
  static const String _tokenKey = 'fcm_token';
  static const String _tokenSentKey = 'fcm_token_sent';

  /// 初始化推送通知
  static Future<void> initialize() async {
    final messaging = FirebaseMessaging.instance;

    // 请求权限
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // 获取 FCM Token
      final token = await messaging.getToken();
      if (token != null) {
        await _saveToken(token);
        await _sendTokenToServer(token);
      }

      // 监听 Token 刷新
      messaging.onTokenRefresh.listen((newToken) {
        _saveToken(newToken);
        _sendTokenToServer(newToken);
      });

      // 前台消息处理
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // 后台消息处理
      FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
    }
  }

  /// 保存 Token 到本地
  static Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  /// 发送 Token 到服务器
  static Future<void> _sendTokenToServer(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final serverUrl = prefs.getString('server_url') ?? 'https://www.5572.net';

      await http.post(
        Uri.parse('$serverUrl/api/fcm/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'token': token,
          'platform': 'android',
          'appVersion': '1.8.0',
        }),
      ).timeout(const Duration(seconds: 10));

      await prefs.setBool(_tokenSentKey, true);
    } catch (e) {
      print('发送 FCM Token 失败: $e');
    }
  }

  /// 前台消息处理
  static void _handleForegroundMessage(RemoteMessage message) {
    final data = message.data;
    if (data['type'] == 'update') {
      // 版本更新通知 - 由 UpdateDialog 处理
      print('收到更新通知: ${data['version']}');
    }
  }
}
