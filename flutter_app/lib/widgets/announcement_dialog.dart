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
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: Colors.transparent,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 380),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF333) : const Color(0xFFF5F5F5),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  child: Column(children: [
                    const Icon(Icons.campaign_rounded, size: 36, color: Color(0xFFF59E0B)),
                    const SizedBox(height: 8),
                    Text(info.title, style: FontUtils.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
                  ]),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(info.content, style: FontUtils.poppins(fontSize: 14, height: 1.6, color: isDark ? const Color(0xFFCCC) : const Color(0xFF666))),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: SizedBox(
                    width: double.infinity, height: 40,
                    child: ElevatedButton(
                      onPressed: () { AnnouncementService.dismiss(info.content); Navigator.pop(context); },
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF27AE60), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      child: Text('我知道了', style: FontUtils.poppins(fontWeight: FontWeight.w600)),
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
    return showDialog(context: context, barrierDismissible: false, builder: (_) => AnnouncementDialog(info: info));
  }
}
