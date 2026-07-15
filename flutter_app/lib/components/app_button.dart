import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';

enum AppButtonVariant { primary, secondary, text, outline }

enum AppButtonSize { small, medium, large }

class AppButton extends StatelessWidget {
  final AppButtonVariant variant;
  final AppButtonSize size;
  final String label;
  final bool loading;
  final bool fullWidth;
  final Widget? icon;
  final VoidCallback? onPressed;
  final Color? color;

  const AppButton({
    super.key,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.medium,
    required this.label,
    this.loading = false,
    this.fullWidth = false,
    this.icon,
    this.onPressed,
    this.color,
  });

  double get _height {
    switch (size) {
      case AppButtonSize.small:
        return 32;
      case AppButtonSize.medium:
        return 40;
      case AppButtonSize.large:
        return 48;
    }
  }

  EdgeInsets get _padding {
    switch (size) {
      case AppButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: AppTheme.space3);
      case AppButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: AppTheme.space4);
      case AppButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: AppTheme.space6);
    }
  }

  double get _fontSize {
    switch (size) {
      case AppButtonSize.small:
        return 12;
      case AppButtonSize.medium:
        return 14;
      case AppButtonSize.large:
        return 16;
    }
  }

  Widget _buildChild(Color foreground) {
    final textStyle = TextStyle(
      fontSize: _fontSize,
      fontWeight: FontWeight.w600,
      color: loading ? foreground.withValues(alpha: 0.5) : foreground,
    );

    final widgets = <Widget>[];
    if (loading) {
      widgets.add(
        SizedBox(
          width: _fontSize,
          height: _fontSize,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(
              foreground.withValues(alpha: 0.5),
            ),
          ),
        ),
      );
    } else if (icon != null) {
      widgets.add(icon!);
    }

    if (widgets.isNotEmpty) {
      widgets.add(const SizedBox(width: AppTheme.space2));
    }
    widgets.add(Text(label, style: textStyle));

    if (widgets.length > 1) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: widgets,
      );
    }
    return Text(label, style: textStyle);
  }

  @override
  Widget build(BuildContext context) {
    final effectiveOnPressed = loading ? null : onPressed;

    return Consumer<ThemeService>(
      builder: (context, themeService, child) {
        final isDark = themeService.isDarkMode;

        final bgColor = color ?? AppTheme.primary;
        final fgColor = color == null
            ? AppTheme.gray950
            : (isDark ? AppTheme.darkForeground : AppTheme.foreground);

        final effectiveColor = color ?? AppTheme.primary;

        return SizedBox(
          height: _height,
          width: fullWidth ? double.infinity : null,
          child: _buildButton(isDark, effectiveColor, fgColor, bgColor,
              effectiveOnPressed),
        );
      },
    );
  }

  Widget _buildButton(bool isDark, Color effectiveColor, Color fgColor,
      Color bgColor, VoidCallback? onPressed) {
    switch (variant) {
      case AppButtonVariant.primary:
        return ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: bgColor,
            foregroundColor: fgColor,
            elevation: 0,
            padding: _padding,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            ),
            textStyle: TextStyle(
              fontSize: _fontSize,
              fontWeight: FontWeight.w600,
            ),
          ),
          child: _buildChild(fgColor),
        );

      case AppButtonVariant.secondary:
        return ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor:
                isDark ? AppTheme.darkBackgroundSubtle : AppTheme.gray100,
            foregroundColor:
                isDark ? AppTheme.darkForeground : AppTheme.foreground,
            elevation: 0,
            padding: _padding,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            ),
            textStyle: TextStyle(
              fontSize: _fontSize,
              fontWeight: FontWeight.w600,
            ),
          ),
          child: _buildChild(
              isDark ? AppTheme.darkForeground : AppTheme.foreground),
        );

      case AppButtonVariant.text:
        return TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: effectiveColor,
            padding: _padding,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            ),
            textStyle: TextStyle(
              fontSize: _fontSize,
              fontWeight: FontWeight.w600,
            ),
          ),
          child: _buildChild(effectiveColor),
        );

      case AppButtonVariant.outline:
        return OutlinedButton(
          onPressed: onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor:
                isDark ? AppTheme.darkForeground : AppTheme.foreground,
            side: BorderSide(
              color: isDark ? AppTheme.darkStroke : AppTheme.stroke,
            ),
            padding: _padding,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            ),
            textStyle: TextStyle(
              fontSize: _fontSize,
              fontWeight: FontWeight.w600,
            ),
          ),
          child: _buildChild(
              isDark ? AppTheme.darkForeground : AppTheme.foreground),
        );
    }
  }
}
