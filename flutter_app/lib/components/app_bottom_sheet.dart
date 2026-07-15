import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';

class AppBottomSheet {
  static Future<T?> show<T>({
    required BuildContext context,
    required Widget Function(BuildContext) builder,
    bool isScrollControlled = true,
    bool useSafeArea = true,
  }) {
    final themeService = Provider.of<ThemeService>(context, listen: false);
    final isDark = themeService.isDarkMode;

    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      useSafeArea: useSafeArea,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(AppTheme.radius2xl),
          topRight: Radius.circular(AppTheme.radius2xl),
        ),
      ),
      backgroundColor:
          isDark ? AppTheme.darkBackground : AppTheme.background,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: AppTheme.space3),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark
                      ? AppTheme.darkForegroundMuted
                      : AppTheme.gray400,
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusFull),
                ),
              ),
              const SizedBox(height: AppTheme.space3),
              Flexible(
                child: builder(context),
              ),
            ],
          ),
        );
      },
    );
  }
}
