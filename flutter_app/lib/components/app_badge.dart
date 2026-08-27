import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';
import '../theme/app_theme.dart';

enum AppBadgeVariant {
  defaultVariant,
  primary,
  success,
  warning,
  error,
  info,
}

enum AppBadgeSize { small, medium, large }

class AppBadge extends StatelessWidget {
  final String label;
  final AppBadgeVariant variant;
  final AppBadgeSize size;
  final bool rounded;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? textColor;
  final double? fontSize;

  const AppBadge({
    super.key,
    required this.label,
    this.variant = AppBadgeVariant.defaultVariant,
    this.size = AppBadgeSize.medium,
    this.rounded = false,
    this.onTap,
    this.backgroundColor,
    this.textColor,
    this.fontSize,
  });

  double get _radius {
    switch (size) {
      case AppBadgeSize.small:
        return 2.0;
      case AppBadgeSize.medium:
        return 4.0;
      case AppBadgeSize.large:
        return 6.0;
    }
  }

  EdgeInsets get _padding {
    switch (size) {
      case AppBadgeSize.small:
        return const EdgeInsets.symmetric(horizontal: 4, vertical: 1);
      case AppBadgeSize.medium:
        return const EdgeInsets.symmetric(horizontal: 6, vertical: 2);
      case AppBadgeSize.large:
        return const EdgeInsets.symmetric(horizontal: 8, vertical: 3);
    }
  }

  Color _getBackgroundColor(BuildContext context) {
    if (backgroundColor != null) return backgroundColor!;
    final isDark = context.read<ThemeService>().isDarkMode;

    switch (variant) {
      case AppBadgeVariant.defaultVariant:
        return isDark
            ? Colors.white.withValues(alpha: 0.08)
            : Colors.black.withValues(alpha: 0.05);
      case AppBadgeVariant.primary:
        return AppTheme.primary;
      case AppBadgeVariant.success:
        return Colors.green.withValues(alpha: isDark ? 0.2 : 0.1);
      case AppBadgeVariant.warning:
        return AppTheme.warning.withValues(alpha: isDark ? 0.2 : 0.1);
      case AppBadgeVariant.error:
        return Colors.red.withValues(alpha: isDark ? 0.2 : 0.1);
      case AppBadgeVariant.info:
        return Colors.blue.withValues(alpha: isDark ? 0.2 : 0.1);
    }
  }

  Color _getTextColor(BuildContext context) {
    if (textColor != null) return textColor!;
    final isDark = context.read<ThemeService>().isDarkMode;

    switch (variant) {
      case AppBadgeVariant.defaultVariant:
        return isDark ? Colors.grey : Colors.grey.shade600;
      case AppBadgeVariant.primary:
        return Colors.black;
      case AppBadgeVariant.success:
        return Colors.green;
      case AppBadgeVariant.warning:
        return AppTheme.warning;
      case AppBadgeVariant.error:
        return Colors.red;
      case AppBadgeVariant.info:
        return Colors.blue;
    }
  }

  double _getFontSize() {
    if (fontSize != null) return fontSize!;
    switch (size) {
      case AppBadgeSize.small:
        return 10.0;
      case AppBadgeSize.medium:
        return 11.0;
      case AppBadgeSize.large:
        return 12.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: _padding,
        decoration: BoxDecoration(
          color: _getBackgroundColor(context),
          borderRadius: rounded
              ? BorderRadius.circular(AppTheme.radiusFull)
              : BorderRadius.circular(_radius),
          border: Border.all(
            color: _getBackgroundColor(context).withValues(alpha: 0.3),
            width: 0.5,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: _getFontSize(),
            color: _getTextColor(context),
            fontWeight: FontWeight.w500,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}
