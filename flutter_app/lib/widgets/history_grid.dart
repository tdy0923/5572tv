import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../models/play_record.dart';
import '../models/video_info.dart';
import '../widgets/video_card.dart';
import '../services/page_cache_service.dart';
import '../utils/device_utils.dart';
import '../components/grid_helpers.dart';
import 'custom_refresh_indicator.dart';
import 'video_menu_bottom_sheet.dart';

class HistoryGrid extends StatefulWidget {
  final Function(PlayRecord) onVideoTap;
  final Function(PlayRecord, VideoMenuAction)? onGlobalMenuAction;

  const HistoryGrid({
    super.key,
    required this.onVideoTap,
    this.onGlobalMenuAction,
  });

  @override
  State<HistoryGrid> createState() => _HistoryGridState();

  /// 静态方法：刷新播放历史数据
  static Future<void> refreshHistory() async {
    await _HistoryGridState._currentInstance?._refreshDataInBackground();
  }

  /// 静态方法：从UI中移除指定的播放记录
  static void removeHistoryFromUI(String source, String id) {
    _HistoryGridState._currentInstance?.removeHistoryFromUI(source, id);
  }
}

class _HistoryGridState extends State<HistoryGrid>
    with TickerProviderStateMixin {
  List<PlayRecord> _playRecords = [];
  bool _isLoading = true;
  String? _errorMessage;
  final PageCacheService _cacheService = PageCacheService();

  // 静态变量存储当前实例
  static _HistoryGridState? _currentInstance;

  @override
  void initState() {
    super.initState();

    // 设置当前实例
    _currentInstance = this;

    _loadData();
  }

  @override
  void dispose() {
    // 清除当前实例引用
    if (_currentInstance == this) {
      _currentInstance = null;
    }
    super.dispose();
  }

  Future<void> _loadData() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await _loadPlayRecords();
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  /// 后台刷新数据
  Future<void> _refreshDataInBackground() async {
    try {
      await _refreshPlayRecords();
    } catch (e) {
      // 后台刷新失败，静默处理，保持原有数据
    }
  }

  /// 刷新播放记录数据
  Future<void> _refreshPlayRecords() async {
    try {
      if (!mounted) return;
      final cachedRecordsResult =
          await _cacheService.getPlayRecordsDirect(context);
      if (!mounted) return;
      if (cachedRecordsResult.success && cachedRecordsResult.data != null) {
        final cachedRecords = cachedRecordsResult.data!;
        setState(() {
          _playRecords = cachedRecords;
        });
      }
    } catch (e) {
      // 静默处理错误，保持原有数据
    }
  }

  /// 从UI中移除指定的播放记录（供外部调用）
  void removeHistoryFromUI(String source, String id) {
    if (!mounted) return;

    setState(() {
      _playRecords
          .removeWhere((record) => record.source == source && record.id == id);
    });
  }

  Future<void> _loadPlayRecords() async {
    try {
      if (!mounted) return;
      // 使用缓存服务获取数据
      final result = await _cacheService.getPlayRecords(context);
      if (!mounted) return;

      if (result.success && result.data != null) {
        setState(() {
          _playRecords = result.data!;
        });
      } else {
        throw Exception(result.errorMessage ?? '获取播放记录失败');
      }
    } catch (e) {
      throw Exception('获取播放记录失败: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return _buildLoadingState();
    }

    if (_errorMessage != null) {
      return _buildErrorState();
    }

    if (_playRecords.isEmpty) {
      return _buildEmptyState();
    }

    return _buildHistoryGrid();
  }

  Widget _buildLoadingState() {
    return GridLoadingState(onRefresh: _loadData);
  }

  Widget _buildErrorState() {
    return GridErrorState(message: _errorMessage, onRetry: _loadPlayRecords);
  }

  Widget _buildEmptyState() {
    return GridEmptyState(
      icon: Icons.history,
      message: '暂无播放历史',
      subtitle: '您观看过的视频将显示在这里',
    );
  }

  Widget _buildHistoryGrid() {
    return AppRefreshIndicator(
      onRefresh: _loadPlayRecords,
      child: LayoutBuilder(
        builder: (context, constraints) {
          // 平板模式根据宽度动态展示6～9列，手机模式3列
          final int crossAxisCount = DeviceUtils.getTabletColumnCount(context);
          final isTablet = DeviceUtils.isTablet(context);

          // 计算每列的宽度
          final double screenWidth = constraints.maxWidth;
          const double padding = 16.0;
          const double spacing = 12.0;
          final double availableWidth =
              screenWidth - (padding * 2) - (spacing * (crossAxisCount - 1));
          const double minItemWidth = 80.0;
          final double calculatedItemWidth = availableWidth / crossAxisCount;
          final double itemWidth = math.max(calculatedItemWidth, minItemWidth);
          final double itemHeight = itemWidth * 2.0;

          return FocusTraversalGroup(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                childAspectRatio: itemWidth / itemHeight,
                crossAxisSpacing: spacing,
                mainAxisSpacing: isTablet ? 0 : 16,
              ),
              itemCount: _playRecords.length,
              itemBuilder: (context, index) {
                final playRecord = _playRecords[index];

                return VideoCard(
                  videoInfo: VideoInfo.fromPlayRecord(playRecord),
                  onTap: () => widget.onVideoTap(playRecord),
                  from: 'playrecord',
                  cardWidth: itemWidth,
                  onGlobalMenuAction: widget.onGlobalMenuAction != null
                      ? (action) =>
                          widget.onGlobalMenuAction!(playRecord, action)
                      : null,
                  isFavorited: _cacheService.isFavoritedSync(
                      playRecord.source, playRecord.id),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
