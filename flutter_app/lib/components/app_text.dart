import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';

enum AppTextVariant { display, headline, title, body, caption, label }

class AppText extends StatelessWidget {
  final String data;
  final AppTextVariant variant;
  final Color? color;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;

  const AppText(
    this.data, {
    super.key,
    this.variant = AppTextVariant.body,
    this.color,
    this.textAlign,
    this.maxLines,
    this.overflow,
  });

  @override
  Widget build(BuildContext context) {
    final defaultStyle = DefaultTextStyle.of(context).style;
    final themeTextTheme = Theme.of(context).textTheme;

    return Consumer<ThemeService>(
      builder: (context, themeService, child) {
        final isDark = themeService.isDarkMode;
        final variantStyle = _getVariantStyle(isDark);

        final style = variantStyle.copyWith(
          color: color ??
              variantStyle.color ??
              (isDark ? AppTheme.darkForeground : AppTheme.foreground),
        );

        return Text(
          data,
          style: style,
          textAlign: textAlign,
          maxLines: maxLines,
          overflow: overflow,
        );
      },
    );
  }

  TextStyle _getVariantStyle(bool isDark) {
    switch (variant) {
      case AppTextVariant.display:
        return TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w700,
          height: 1.2,
          color: isDark ? AppTheme.darkForeground : AppTheme.foreground,
        );
      case AppTextVariant.headline:
        return TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          height: 1.3,
          color: isDark ? AppTheme.darkForeground : AppTheme.foreground,
        );
      case AppTextVariant.title:
        return TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          height: 1.4,
          color: isDark ? AppTheme.darkForeground : AppTheme.foreground,
        );
      case AppTextVariant.body:
        return TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 1.5,
          color: isDark ? AppTheme.darkForeground : AppTheme.foreground,
        );
      case AppTextVariant.caption:
        return TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          height: 1.4,
          color: isDark ? AppTheme.darkForegroundSubtle : AppTheme.foregroundSubtle,
        );
      case AppTextVariant.label:
        return TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          height: 1.4,
          letterSpacing: 0.5,
          color: isDark ? AppTheme.darkForegroundSubtle : AppTheme.foregroundSubtle,
        );
    }
  }
}
