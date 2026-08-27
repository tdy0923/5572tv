import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum AppToastType {
  info,
  success,
  warning,
  error,
}

class AppToast {
  final BuildContext context;

  AppToast._(this.context);

  static AppToast of(BuildContext context) => AppToast._(context);

  Color _getColor(AppToastType type) {
    switch (type) {
      case AppToastType.info:
        return Colors.blue;
      case AppToastType.success:
        return Colors.green;
      case AppToastType.warning:
        return AppTheme.warning;
      case AppToastType.error:
        return Colors.red;
    }
  }

  IconData _getIcon(AppToastType type) {
    switch (type) {
      case AppToastType.info:
        return Icons.info_outline;
      case AppToastType.success:
        return Icons.check_circle_outline;
      case AppToastType.warning:
        return Icons.warning_amber_rounded;
      case AppToastType.error:
        return Icons.error_outline;
    }
  }

  void show({
    required AppToastType type,
    required String message,
    String? title,
    Duration duration = const Duration(seconds: 3),
  }) {
    final color = _getColor(type);
    final icon = _getIcon(type);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: AppTheme.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (title != null)
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: AppTheme.space1),
                  Text(message, style: const TextStyle(fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: Colors.grey.shade900,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          side: BorderSide(color: color.withValues(alpha: 0.3), width: 1),
        ),
        behavior: SnackBarBehavior.floating,
        duration: duration,
        padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.space4,
          vertical: AppTheme.space3,
        ),
        showCloseIcon: true,
        closeIconColor: Colors.grey,
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}
