import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final double? elevation;
  final VoidCallback? onTap;
  final Color? color;

  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppTheme.space4),
    this.borderRadius = AppTheme.radiusLg,
    this.elevation,
    this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeService>(
      builder: (context, themeService, child) {
        final isDark = themeService.isDarkMode;
        final bgColor = color ??
            (isDark ? AppTheme.darkBackgroundSubtle : AppTheme.background);
        final borderColor =
            isDark ? AppTheme.darkStroke : AppTheme.strokeSubtle;

        final card = Container(
          padding: padding,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(color: borderColor, width: 1),
            boxShadow: elevation != null
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(
                          isDark ? 0.32 : 0.08),
                      blurRadius: elevation!,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: this.child,
        );

        if (onTap != null) {
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(borderRadius),
              child: card,
            ),
          );
        }

        return card;
      },
    );
  }
}
