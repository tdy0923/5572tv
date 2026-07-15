import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/announcement_service.dart';
import '../services/theme_service.dart';
import '../utils/font_utils.dart';

class AnnouncementDialog extends StatelessWidget {
  final AnnouncementInfo info;
  const AnnouncementDialog({super.key, required this.info});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeService>(
      builder: (context, themeService, _) {
        final isDark = themeService.isDarkMode;
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius2xl)),
          backgroundColor: Colors.transparent,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 380),
            decoration: BoxDecoration(
              color: isDark ? AppTheme.darkBackground : Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radius2xl),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.gray800 : AppTheme.gray100,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(AppTheme.radius2xl)),
                  ),
                  child: Column(children: [
                    const Icon(Icons.campaign_rounded, size: 36, color: AppTheme.warning),
                    const SizedBox(height: 8),
                    Text(info.title, style: FontUtils.systemFont(fontSize: 18, fontWeight: FontWeight.bold)),
                  ]),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(info.content, style: FontUtils.systemFont(fontSize: 14, height: 1.6, color: isDark ? AppTheme.gray300 : AppTheme.gray500)),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: SizedBox(
                    width: double.infinity, height: 40,
                    child: ElevatedButton(
                      onPressed: () { AnnouncementService.dismiss(info.content); Navigator.pop(context); },
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLg))),
                      child: Text('我知道了', style: FontUtils.systemFont(fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  static Future<void> show(BuildContext context, AnnouncementInfo info) {
    return showDialog(context: context, barrierDismissible: true, builder: (_) => AnnouncementDialog(info: info));
  }
}
