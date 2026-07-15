import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';

class AppTextField extends StatelessWidget {
  final String? label;
  final String? hint;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final TextEditingController? controller;

  const AppTextField({
    super.key,
    this.label,
    this.hint,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.validator,
    this.onChanged,
    this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeService>(
      builder: (context, themeService, child) {
        final isDark = themeService.isDarkMode;
        final fillColor =
            isDark ? AppTheme.darkBackgroundSubtle : AppTheme.background;
        final borderColor = isDark ? AppTheme.darkStroke : AppTheme.stroke;
        final focusedBorderColor = AppTheme.primary;
        final textColor =
            isDark ? AppTheme.darkForeground : AppTheme.foreground;
        final hintColor =
            isDark ? AppTheme.darkForegroundMuted : AppTheme.foregroundMuted;
        final labelColor =
            isDark ? AppTheme.darkForegroundSubtle : AppTheme.foregroundSubtle;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (label != null)
              Padding(
                padding: const EdgeInsets.only(bottom: AppTheme.space2),
                child: Text(
                  label!,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: labelColor,
                  ),
                ),
              ),
            TextFormField(
              controller: controller,
              obscureText: obscureText,
              validator: validator,
              onChanged: onChanged,
              style: TextStyle(
                fontSize: 14,
                color: textColor,
              ),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(
                  fontSize: 14,
                  color: hintColor,
                ),
                prefixIcon: prefixIcon,
                suffixIcon: suffixIcon,
                filled: true,
                fillColor: fillColor,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.space4,
                  vertical: AppTheme.space3,
                ),
                border: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusLg),
                  borderSide: BorderSide(color: borderColor),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusLg),
                  borderSide: BorderSide(color: borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusLg),
                  borderSide:
                      BorderSide(color: focusedBorderColor, width: 2),
                ),
                errorBorder: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusLg),
                  borderSide:
                      const BorderSide(color: AppTheme.error, width: 1),
                ),
                focusedErrorBorder: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusLg),
                  borderSide:
                      const BorderSide(color: AppTheme.error, width: 2),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
