import 'package:flutter/material.dart';
import 'dart:io' show Platform;
import '../theme/app_theme.dart';

/// Fluent 2 Theme Service
/// Manages light/dark theme switching with Fluent 2 design tokens
class ThemeService extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode {
    if (_themeMode == ThemeMode.dark) return true;
    if (_themeMode == ThemeMode.light) return false;
    return WidgetsBinding.instance.platformDispatcher.platformBrightness ==
        Brightness.dark;
  }

  ThemeService() {
    _themeMode = ThemeMode.system;
    _updateMacOSWindowAppearance();
  }

  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    notifyListeners();
    _updateMacOSWindowAppearance();
  }

  void _updateMacOSWindowAppearance() async {
    if (!Platform.isMacOS) return;
    try {
      await WindowManipulator.overrideMacOSBrightness(dark: isDarkMode);
    } catch (_) {}
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
