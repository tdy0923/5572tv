import 'package:flutter/material.dart';

/// Fluent 2 Design System for 5572 影视
/// Aligned with www.5572.net Fluent 2 tokens
/// Reference: https://fluent2.microsoft.design/design-tokens
class AppTheme {
  // ==================== Fluent 2 Brand Color (Golden) ====================
  static const Color primary = Color(0xFFF4C24D);
  static const Color primaryDark = Color(0xFFDBA52B);
  static const Color primaryLight = Color(0xFFFFD56F);
  static const Color primarySubtle = Color(0xFFFFF6DE);

  // ==================== Fluent 2 Neutral Gray Ramp ====================
  static const Color gray50 = Color(0xFFFAFAFA);
  static const Color gray100 = Color(0xFFF5F5F5);
  static const Color gray200 = Color(0xFFE8E8E8);
  static const Color gray300 = Color(0xFFD4D4D4);
  static const Color gray400 = Color(0xFFA3A3A3);
  static const Color gray500 = Color(0xFF767676);
  static const Color gray600 = Color(0xFF545454);
  static const Color gray700 = Color(0xFF3D3D3D);
  static const Color gray800 = Color(0xFF292929);
  static const Color gray900 = Color(0xFF1A1A1A);
  static const Color gray950 = Color(0xFF0A0A0A);

  // ==================== Fluent 2 Semantic Tokens ====================
  static const Color foreground = Color(0xFF242424);
  static const Color foregroundSubtle = Color(0xFF616161);
  static const Color foregroundMuted = Color(0xFF999999);
  static const Color background = Color(0xFFFFFFFF);
  static const Color backgroundSubtle = Color(0xFFF5F5F5);
  static const Color backgroundMuted = Color(0xFFE8E8E8);
  static const Color stroke = Color(0xFFD4D4D4);
  static const Color strokeSubtle = Color(0xFFE8E8E8);

  // Dark mode semantic
  static const Color darkForeground = Color(0xFFFFFFFF);
  static const Color darkForegroundSubtle = Color(0xFFD4D4D4);
  static const Color darkForegroundMuted = Color(0xFFA3A3A3);
  static const Color darkBackground = Color(0xFF1A1A1A);
  static const Color darkBackgroundSubtle = Color(0xFF292929);
  static const Color darkBackgroundMuted = Color(0xFF3D3D3D);
  static const Color darkStroke = Color(0xFF3D3D3D);
  static const Color darkStrokeSubtle = Color(0xFF292929);

  // ==================== Fluent 2 Status Colors ====================
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);
  static const Color success = Color(0xFF22C55E);

  // ==================== Fluent 2 Elevation (Shadows) ====================
  static List<BoxShadow> get shadow2 => [
    BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 2, offset: const Offset(0, 1)),
    BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 2),
  ];
  static List<BoxShadow> get shadow4 => [
    BoxShadow(color: Colors.black.withOpacity(0.14), blurRadius: 4, offset: const Offset(0, 2)),
    BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 2),
  ];
  static List<BoxShadow> get shadow8 => [
    BoxShadow(color: Colors.black.withOpacity(0.14), blurRadius: 8, offset: const Offset(0, 4)),
    BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 2),
  ];
  static List<BoxShadow> get shadow16 => [
    BoxShadow(color: Colors.black.withOpacity(0.14), blurRadius: 16, offset: const Offset(0, 8)),
    BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 2),
  ];

  // Dark mode shadows
  static List<BoxShadow> get darkShadow2 => [
    BoxShadow(color: Colors.black.withOpacity(0.32), blurRadius: 2, offset: const Offset(0, 1)),
  ];
  static List<BoxShadow> get darkShadow4 => [
    BoxShadow(color: Colors.black.withOpacity(0.32), blurRadius: 4, offset: const Offset(0, 2)),
  ];
  static List<BoxShadow> get darkShadow8 => [
    BoxShadow(color: Colors.black.withOpacity(0.32), blurRadius: 8, offset: const Offset(0, 4)),
  ];
  static List<BoxShadow> get darkShadow16 => [
    BoxShadow(color: Colors.black.withOpacity(0.32), blurRadius: 16, offset: const Offset(0, 8)),
  ];

  // ==================== Fluent 2 Border Radius ====================
  static const double radiusSm = 2.0;
  static const double radiusMd = 4.0;
  static const double radiusLg = 8.0;
  static const double radiusXl = 12.0;
  static const double radius2xl = 16.0;
  static const double radiusFull = 999.0;

  // ==================== Fluent 2 Spacing (base 4px) ====================
  static const double space1 = 4.0;
  static const double space2 = 8.0;
  static const double space3 = 12.0;
  static const double space4 = 16.0;
  static const double space6 = 24.0;
  static const double space8 = 32.0;
  static const double space10 = 40.0;
  static const double space12 = 48.0;

  // ==================== Fluent 2 Motion ====================
  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 250);
  static const Duration durationSlow = Duration(milliseconds: 400);
  static const Curve easeStandard = Cubic(0.33, 0.0, 0.67, 1.0);
  static const Curve easeDecelerate = Cubic(0.0, 0.0, 0.0, 1.0);
  static const Curve easeAccelerate = Curves.easeIn;

  // ==================== Touch Target ====================
  static const double minTouchTarget = 44.0;

  // ==================== Fluent 2 ThemeData ====================
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme(
      brightness: Brightness.light,
      primary: primary,
      onPrimary: gray950,
      primaryContainer: primarySubtle,
      onPrimaryContainer: gray900,
      secondary: gray600,
      onSecondary: Colors.white,
      secondaryContainer: gray100,
      onSecondaryContainer: gray900,
      surface: background,
      onSurface: foreground,
      surfaceContainerHighest: backgroundSubtle,
      onSurfaceVariant: foregroundSubtle,
      error: error,
      onError: Colors.white,
      outline: stroke,
      outlineVariant: strokeSubtle,
      shadow: Colors.black.withOpacity(0.14),
      surfaceTint: primary,
    ),
    scaffoldBackgroundColor: backgroundSubtle,
    appBarTheme: const AppBarTheme(
      backgroundColor: background,
      foregroundColor: foreground,
      elevation: 0,
      scrolledUnderElevation: 1,
      shadowColor: Colors.black12,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardTheme(
      color: background,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLg),
        side: const BorderSide(color: strokeSubtle, width: 1),
      ),
      margin: const EdgeInsets.symmetric(horizontal: space4, vertical: space2),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: gray950,
        elevation: 0,
        minimumSize: const Size(0, minTouchTarget),
        padding: const EdgeInsets.symmetric(horizontal: space6, vertical: space3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ).copyWith(
        overlayColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.pressed)) return Colors.black.withOpacity(0.05);
          if (states.contains(WidgetState.hovered)) return Colors.black.withOpacity(0.03);
          return null;
        }),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: foreground,
        side: const BorderSide(color: stroke, width: 1),
        minimumSize: const Size(0, minTouchTarget),
        padding: const EdgeInsets.symmetric(horizontal: space6, vertical: space3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        minimumSize: const Size(0, minTouchTarget),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: background,
      contentPadding: const EdgeInsets.symmetric(horizontal: space4, vertical: space3),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: stroke, width: 1),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: stroke, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: primary, width: 2),
      ),
      hintStyle: const TextStyle(color: foregroundMuted),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: backgroundSubtle,
      side: const BorderSide(color: strokeSubtle, width: 1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusFull),
      ),
      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      padding: const EdgeInsets.symmetric(horizontal: space2, vertical: space1),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: background,
      selectedItemColor: primary,
      unselectedItemColor: foregroundMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    dividerTheme: const DividerThemeData(
      color: strokeSubtle,
      thickness: 1,
      space: 0,
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme(
      brightness: Brightness.dark,
      primary: primary,
      onPrimary: gray950,
      primaryContainer: primaryDark,
      onPrimaryContainer: primarySubtle,
      secondary: gray400,
      onSecondary: gray900,
      secondaryContainer: gray800,
      onSecondaryContainer: gray100,
      surface: darkBackground,
      onSurface: darkForeground,
      surfaceContainerHighest: darkBackgroundSubtle,
      onSurfaceVariant: darkForegroundSubtle,
      error: error,
      onError: Colors.white,
      outline: darkStroke,
      outlineVariant: darkStrokeSubtle,
      shadow: Colors.black.withOpacity(0.32),
      surfaceTint: primary,
    ),
    scaffoldBackgroundColor: darkBackground,
    appBarTheme: const AppBarTheme(
      backgroundColor: darkBackground,
      foregroundColor: darkForeground,
      elevation: 0,
      scrolledUnderElevation: 1,
      shadowColor: Colors.black26,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardTheme(
      color: darkBackgroundSubtle,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusLg),
        side: const BorderSide(color: darkStroke, width: 1),
      ),
      margin: const EdgeInsets.symmetric(horizontal: space4, vertical: space2),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: gray950,
        elevation: 0,
        minimumSize: const Size(0, minTouchTarget),
        padding: const EdgeInsets.symmetric(horizontal: space6, vertical: space3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ).copyWith(
        overlayColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.pressed)) return Colors.black.withOpacity(0.1);
          if (states.contains(WidgetState.hovered)) return Colors.white.withOpacity(0.05);
          return null;
        }),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: darkForeground,
        side: const BorderSide(color: darkStroke, width: 1),
        minimumSize: const Size(0, minTouchTarget),
        padding: const EdgeInsets.symmetric(horizontal: space6, vertical: space3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        minimumSize: const Size(0, minTouchTarget),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: darkBackgroundSubtle,
      contentPadding: const EdgeInsets.symmetric(horizontal: space4, vertical: space3),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: darkStroke, width: 1),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: darkStroke, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(radiusMd),
        borderSide: const BorderSide(color: primary, width: 2),
      ),
      hintStyle: const TextStyle(color: darkForegroundMuted),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: darkBackgroundSubtle,
      side: const BorderSide(color: darkStroke, width: 1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radiusFull),
      ),
      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      padding: const EdgeInsets.symmetric(horizontal: space2, vertical: space1),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: darkBackgroundSubtle,
      selectedItemColor: primary,
      unselectedItemColor: darkForegroundMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    dividerTheme: const DividerThemeData(
      color: darkStroke,
      thickness: 1,
      space: 0,
    ),
  );
}
