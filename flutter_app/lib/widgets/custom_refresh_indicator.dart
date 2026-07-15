import 'package:flutter/material.dart';
import 'package:media_5572/theme/app_theme.dart';
import 'package:provider/provider.dart';
import '../services/theme_service.dart';

class AppRefreshIndicator extends StatelessWidget {
  final Widget child;
  final Future<void> Function() onRefresh;

  const AppRefreshIndicator({
    super.key,
    required this.child,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeService>(
      builder: (context, themeService, child) {
        return RefreshIndicator(
          onRefresh: onRefresh,
          color: AppTheme.success,
          backgroundColor: themeService.isDarkMode
              ? AppTheme.darkBackground
              : Colors.white,
          strokeWidth: 2.5,
          displacement: 40,
          child: this.child,
        );
      },
    );
  }
}
