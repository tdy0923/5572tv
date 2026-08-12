import 'package:flutter/material.dart';
import 'dart:io' show Platform;
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

/// Fluent 2 Theme Service
/// Manages light/dark theme switching with Fluent 2 design tokens
class ThemeService extends ChangeNotifier {
  static const String _themeModeKey = 'theme_mode';
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode {
    if (_themeMode == ThemeMode.dark) return true;
    if (_themeMode == ThemeMode.light) return false;
    return WidgetsBinding.instance.platformDispatcher.platformBrightness ==
        Brightness.dark;
  }

  ThemeService() {
    _updateMacOSWindowAppearance();
  }

  /// 从本地存储恢复用户选择的主题模式（在 runApp 前调用一次）
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_themeModeKey);
      _themeMode = switch (saved) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };
    } catch (_) {
      // 读取失败时保持 system 默认
    }
  }

  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    notifyListeners();
    _updateMacOSWindowAppearance();
    // 持久化，下次启动恢复（失败静默，不影响使用）
    SharedPreferences.getInstance().then((prefs) {
      final value = switch (mode) {
        ThemeMode.light => 'light',
        ThemeMode.dark => 'dark',
        ThemeMode.system => 'system',
      };
      prefs.setString(_themeModeKey, value);
    }).catchError((_) {});
  }

  void _updateMacOSWindowAppearance() async {
    if (!Platform.isMacOS) return;
    // macOS window appearance is handled by the system theme
  }

  void toggleTheme(BuildContext context) {
    switch (_themeMode) {
      case ThemeMode.light:
        setThemeMode(ThemeMode.dark);
        break;
      case ThemeMode.dark:
        setThemeMode(ThemeMode.light);
        break;
      case ThemeMode.system:
        final brightness = MediaQuery.of(context).platformBrightness;
        setThemeMode(
          brightness == Brightness.light ? ThemeMode.dark : ThemeMode.light,
        );
        break;
    }
  }

  ThemeData get lightTheme {
    final baseTheme = AppTheme.lightTheme;
    final fontFamily = _getFontFamily();

    return baseTheme.copyWith(
      textTheme: _applyFontFamily(baseTheme.textTheme, fontFamily),
    );
  }

  ThemeData get darkTheme {
    final baseTheme = AppTheme.darkTheme;
    final fontFamily = _getFontFamily();

    return baseTheme.copyWith(
      textTheme: _applyFontFamily(baseTheme.textTheme, fontFamily),
    );
  }

  String? _getFontFamily() {
    if (Platform.isWindows) return 'Microsoft YaHei';
    if (Platform.isLinux) return 'Noto Sans CJK SC';
    return null;
  }

  TextTheme _applyFontFamily(TextTheme textTheme, String? fontFamily) {
    if (fontFamily == null) return textTheme;
    return textTheme.apply(fontFamily: fontFamily);
  }
}
