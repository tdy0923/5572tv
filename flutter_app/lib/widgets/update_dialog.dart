import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import '../services/device_service.dart';
import '../services/version_service.dart';
import '../services/theme_service.dart';
import '../utils/font_utils.dart';

class UpdateDialog extends StatefulWidget {
  final VersionInfo versionInfo;

  const UpdateDialog({
    super.key,
    required this.versionInfo,
  });

  @override
  State<UpdateDialog> createState() => _UpdateDialogState();

  static Future<void> show(
      BuildContext context, VersionInfo versionInfo) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => UpdateDialog(versionInfo: versionInfo),
    );
  }
}

class _UpdateDialogState extends State<UpdateDialog> {
  bool _downloading = false;
  double _progress = 0;
  String _status = '';
  CancelToken? _cancelToken;

  @override
  void dispose() {
    _cancelToken?.cancel('dialog dismissed');
    super.dispose();
  }

  void _cancelDownload() {
    _cancelToken?.cancel('user cancelled');
    setState(() {
      _cancelToken = null;
      _downloading = false;
      _progress = 0;
      _status = '';
    });
  }

  Future<void> _startDownload() async {
    setState(() {
      _downloading = true;
      _progress = 0;
      _status = '检测设备架构...';
    });

    try {
      final abi = await DeviceService.getCpuAbi();
      const baseUrl = 'https://www.5572.net/download';
      final url = DeviceService.getDownloadUrl(baseUrl, abi);

      if (!mounted) return;
      setState(() => _status = '准备下载...');

      final dir = await getTemporaryDirectory();
      final filePath = '${dir.path}/5572tv-${widget.versionInfo.latestVersion}.apk';

      final dio = Dio();
      _cancelToken = CancelToken();
      await dio.download(
        url,
        filePath,
        cancelToken: _cancelToken,
        onReceiveProgress: (received, total) {
          if (total > 0) {
            final p = received / total;
            final mb = received / 1024 / 1024;
            final totalMb = total / 1024 / 1024;
            setState(() {
              _progress = p;
              _status = '${mb.toStringAsFixed(1)}MB / ${totalMb.toStringAsFixed(1)}MB';
            });
          }
        },
      );

      if (_cancelToken?.isCancelled ?? false) return;
      if (!mounted) return;

      setState(() => _status = '正在安装...');
      await OpenFilex.open(filePath);

      if (mounted) Navigator.of(context).pop();
    } on DioException catch (e) {
      if (e.type == DioExceptionType.cancel) return;
      if (!mounted) return;
      setState(() {
        _downloading = false;
        _progress = 0;
        _status = '下载失败: ${e.message}';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _downloading = false;
        _progress = 0;
        _status = '下载失败: $e';
      });
    }
  }

  String _formatProgress() {
    return '${(_progress * 100).toStringAsFixed(0)}%';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeService>(
      builder: (context, themeService, child) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radius2xl),
          ),
          elevation: 0,
          backgroundColor: Colors.transparent,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            decoration: BoxDecoration(
              color: themeService.isDarkMode
                  ? AppTheme.darkBackground
                  : Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radius2xl),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: themeService.isDarkMode
                        ? AppTheme.foreground
                        : AppTheme.gray100,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(AppTheme.radius2xl),
                      topRight: Radius.circular(AppTheme.radius2xl),
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _downloading
                              ? AppTheme.primary.withValues(alpha: 0.1)
                              : AppTheme.success.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: _downloading
                            ? SizedBox(
                                width: 40,
                                height: 40,
                                child: CircularProgressIndicator(
                                  value: _progress > 0 ? _progress : null,
                                  strokeWidth: 3,
                                  valueColor:
                                      const AlwaysStoppedAnimation<Color>(
                                          AppTheme.primary),
                                ),
                              )
                            : const Icon(
                                Icons.rocket_launch_rounded,
                                size: 40,
                                color: AppTheme.success,
                              ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _downloading ? '正在更新' : '发现新版本',
                        style: FontUtils.systemFont(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: themeService.isDarkMode
                              ? AppTheme.background
                              : AppTheme.darkBackground,
                        ),
                      ),
                    ],
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: themeService.isDarkMode
                              ? AppTheme.foreground
                              : AppTheme.gray100,
                          borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildVersionChip(
                              themeService,
                              '当前版本',
                              widget.versionInfo.currentVersion,
                              Icons.info_outline_rounded,
                              themeService.isDarkMode
                                  ? AppTheme.foregroundMuted
                                  : AppTheme.foregroundSubtle,
                            ),
                            Container(
                              width: 1,
                              height: 40,
                              color: themeService.isDarkMode
                                  ? AppTheme.gray700
                                  : AppTheme.gray300,
                            ),
                            _buildVersionChip(
                              themeService,
                              '最新版本',
                              widget.versionInfo.latestVersion,
                              Icons.new_releases_rounded,
                              AppTheme.success,
                            ),
                          ],
                        ),
                      ),

                      if (_downloading) ...[
                        const SizedBox(height: 20),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          child: LinearProgressIndicator(
                            value: _progress,
                            minHeight: 8,
                            backgroundColor: themeService.isDarkMode
                                ? AppTheme.gray700
                                : AppTheme.gray200,
                            valueColor:
                                const AlwaysStoppedAnimation<Color>(
                                    AppTheme.primary),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _status,
                              style: FontUtils.systemFont(
                                fontSize: 13,
                                color: themeService.isDarkMode
                                    ? AppTheme.gray400
                                    : AppTheme.foregroundSubtle,
                              ),
                            ),
                            Text(
                              _formatProgress(),
                              style: FontUtils.systemFont(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primary,
                              ),
                            ),
                          ],
                        ),
                      ],

                      if (!_downloading &&
                          widget.versionInfo.releaseNotes.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            const Icon(
                              Icons.article_outlined,
                              size: 18,
                              color: AppTheme.success,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '更新内容',
                              style: FontUtils.systemFont(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: themeService.isDarkMode
                                    ? AppTheme.background
                                    : AppTheme.darkBackground,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          constraints: const BoxConstraints(maxHeight: 200),
                          decoration: BoxDecoration(
                            color: themeService.isDarkMode
                                ? AppTheme.foreground
                                : AppTheme.gray100,
                            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                          ),
                          child: SingleChildScrollView(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(
                                widget.versionInfo.releaseNotes,
                                style: FontUtils.systemFont(
                                  fontSize: 14,
                                  height: 1.6,
                                  color: themeService.isDarkMode
                                      ? AppTheme.gray300
                                      : AppTheme.foregroundSubtle,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton.icon(
                          onPressed:
                              _downloading ? null : _startDownload,
                          icon: _downloading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.download_rounded,
                                  size: 18),
                          label: Text(
                            _downloading ? '下载中...' : '立即更新',
                            style: FontUtils.systemFont(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _downloading
                                ? AppTheme.primary.withValues(alpha: 0.7)
                                : AppTheme.success,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                            ),
                          ),
                        ),
                      ),
                      if (_downloading) ...[
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          height: 36,
                          child: TextButton(
                            onPressed: _cancelDownload,
                            style: TextButton.styleFrom(
                              foregroundColor: themeService.isDarkMode
                                  ? AppTheme.foregroundMuted
                                  : AppTheme.foregroundSubtle,
                            ),
                            child: Text(
                              '取消下载',
                              style: FontUtils.systemFont(fontSize: 14),
                            ),
                          ),
                        ),
                      ],
                      if (!_downloading) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextButton(
                                onPressed: () async {
                                  await VersionService.dismissVersion(
                                      widget.versionInfo.latestVersion);
                                  if (mounted) Navigator.of(context).pop();
                                },
                                style: TextButton.styleFrom(
                                  foregroundColor: themeService.isDarkMode
                                      ? AppTheme.foregroundMuted
                                      : AppTheme.foregroundSubtle,
                                ),
                                child: Text(
                                  '忽略',
                                  style:
                                      FontUtils.systemFont(fontSize: 14),
                                ),
                              ),
                            ),
                            Expanded(
                              child: TextButton(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                },
                                style: TextButton.styleFrom(
                                  foregroundColor: AppTheme.success,
                                ),
                                child: Text(
                                  '稍后',
                                  style:
                                      FontUtils.systemFont(fontSize: 14),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildVersionChip(
    ThemeService themeService,
    String label,
    String version,
    IconData icon,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(height: 4),
        Text(
          label,
          style: FontUtils.systemFont(
            fontSize: 12,
            color: themeService.isDarkMode
                ? AppTheme.foregroundMuted
                : AppTheme.foregroundSubtle,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          version,
          style: FontUtils.systemFont(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
