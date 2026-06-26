import 'package:flutter/material.dart';

/// 5572 影视 品牌主题色
/// 与主站 www.5572.net 保持一致
/// 主站配色: 金黄色主色 + 深色背景
class AppTheme {
  // ==================== 品牌主色（金黄色）====================
  /// 主品牌色 - #f4c24d (与主站一致)
  static const Color primary = Color(0xFFF4C24D);
  /// 主品牌色深 - #dba52b
  static const Color primaryDark = Color(0xFFDBA52B);
  /// 主品牌色浅 - #ffd56f
  static const Color primaryLight = Color(0xFFFFD56F);
  /// 主品牌色最浅 - #fff6de
  static const Color primarySubtle = Color(0xFFFFF6DE);

  // ==================== 功能色 ====================
  /// 错误/危险 - #ef4444
  static const Color error = Color(0xFFEF4444);
  /// 警告 - #f59e0b
  static const Color warning = Color(0xFFF59E0B);
  /// 信息 - #3b82f6
  static const Color info = Color(0xFF3B82F6);
  /// 成功 - #22c55e
  static const Color success = Color(0xFF22C55E);

  // ==================== 深色背景 ====================
  /// 主背景 - #111827 (gray-900)
  static const Color darkBg = Color(0xFF111827);
  /// 表面色 - #1f2937 (gray-800)
  static const Color darkSurface = Color(0xFF1F2937);
  /// 卡片色 - #374151 (gray-700)
  static const Color darkCard = Color(0xFF374151);
  /// 边框色 - #4b5563 (gray-600)
  static const Color darkBorder = Color(0xFF4B5563);

  // ==================== 浅色背景 ====================
  /// 主背景 - #f9fafb (gray-50)
  static const Color lightBg = Color(0xFFF9FAFB);
  /// 表面色 - #ffffff
  static const Color lightSurface = Colors.white;
  /// 卡片色 - #f3f4f6 (gray-100)
  static const Color lightCard = Color(0xFFF3F4F6);

  // ==================== 文字色 ====================
  /// 深色模式主要文字
  static const Color textPrimaryDark = Colors.white;
  /// 深色模式次要文字
  static const Color textSecondaryDark = Color(0xFF9CA3AF);
  /// 浅色模式主要文字
  static const Color textPrimaryLight = Color(0xFF111827);
  /// 浅色模式次要文字
  static const Color textSecondaryLight = Color(0xFF6B7280);

  // ==================== 渐变 ====================
  /// 主品牌渐变（金黄）
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFF4C24D), Color(0xFFF0B938), Color(0xFFD89C18)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// 深色背景渐变
  static const LinearGradient darkGradient = LinearGradient(
    colors: [Color(0xFF111827), Color(0xFF1F2937)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ==================== 阴影 ====================
  static List<BoxShadow> get primaryShadow => [
    BoxShadow(
      color: primary.withOpacity(0.28),
      blurRadius: 24,
      offset: const Offset(0, 10),
    ),
  ];

  // ==================== 圆角 ====================
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 24.0;

  // ==================== 间距 ====================
  static const double spacingXs = 4.0;
  static const double spacingSm = 8.0;
  static const double spacingMd = 16.0;
  static const double spacingLg = 24.0;
  static const double spacingXl = 32.0;

  // ==================== 触摸目标 ====================
  static const double minTouchTarget = 44.0;

  // ==================== ThemeData ====================
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
    ),
    scaffoldBackgroundColor: lightBg,
    appBarTheme: AppBarTheme(
      backgroundColor: lightSurface,
      foregroundColor: textPrimaryLight,
      elevation: 0,
    ),
    cardTheme: CardTheme(
      color: lightSurface,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusMd),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: const Color(0xFF171717),
        minimumSize: const Size(0, minTouchTarget),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
      ),
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.dark,
    ),
    scaffoldBackgroundColor: darkBg,
    appBarTheme: AppBarTheme(
      backgroundColor: darkBg,
      foregroundColor: textPrimaryDark,
      elevation: 0,
    ),
    cardTheme: CardTheme(
      color: darkSurface,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusMd),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: const Color(0xFF171717),
        minimumSize: const Size(0, minTouchTarget),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
      ),
    ),
  );
}
