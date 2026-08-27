import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';

class AppDivider extends StatelessWidget {
  final Axis axis;
  final double? thickness;
  final double indent;
  final double? endIndent;
  final double? height;

  const AppDivider({
    super.key,
    this.axis = Axis.horizontal,
    this.thickness,
    this.indent = 0,
    this.endIndent,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeService>(
      builder: (context, themeService, child) {
        final isDark = themeService.isDarkMode;
        final color = isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.black.withValues(alpha: 0.08);

        if (axis == Axis.horizontal) {
          return Divider(
            color: color,
            thickness: thickness ?? 1.0,
            indent: indent,
            endIndent: endIndent ?? indent,
            height: height ?? AppTheme.space4,
          );
        }

        return VerticalDivider(
          color: color,
          thickness: thickness ?? 1.0,
          width: AppTheme.space4 * 2,
        );
      },
    );
  }
}
