import 'package:media_5572/theme/app_theme.dart';
import 'dart:math' as math;
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/video_player_surface.dart';
import '../widgets/video_player_widget.dart';
import '../widgets/video_card.dart';
import '../models/search_result.dart';
import '../models/douban_movie.dart';
import '../widgets/switch_loading_overlay.dart';
import '../utils/device_utils.dart';
import '../components/app_button.dart';
import '../widgets/player_details_panel.dart';
import '../components/app_dialog.dart';
import '../widgets/player_episodes_panel.dart';
import '../widgets/player_sources_panel.dart';
import '../widgets/windows_title_bar.dart';
import '../components/app_hover_button.dart';
import 'player_state.dart';

class PlayerScreen extends StatefulWidget {
  final String? source;
  final String? id;
  final String title;
  final String? year;
  final String? stitle;
  final String? stype;
  final String? prefer;
  final String? sourceApi;

  const PlayerScreen({
    super.key,
    this.source,
    this.id,
    required this.title,
    this.year,
    this.stitle,
    this.stype,
    this.prefer,
    this.sourceApi,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  late final PlayerState _state;

  void Function()? _progressListener;

  @override
  void initState() {
    super.initState();
    _state = PlayerState(
      source: widget.source,
      id: widget.id,
      title: widget.title,
      year: widget.year,
      stitle: widget.stitle,
      stype: widget.stype,
      prefer: widget.prefer,
      sourceApi: widget.sourceApi,
    );
    _state.setup(this);
    _state.markMounted();
    _state.addListener(() {
      if (mounted) setState(() {});
    });
    _progressListener = () {
      _state.saveProgress(scene: '定时保存', context: context);
    };
    WidgetsBinding.instance.addObserver(this);
  }

  void _setPortraitOrientation() {
    _state.setPortraitOrientation();
  }

  void _restoreOrientation() {
    _state.restoreOrientation();
  }

  void _toggleOrientationLock() {
    _state.toggleOrientationLock();
  }

  void initParam() {
    _state.initParam();
  }

  void initVideoData() async {
    await _state.initVideoData(context);
  }

  void startPlay(int targetIndex, int playTime) {
    _state.startPlay(targetIndex, playTime, context: context);
  }

  void setInfosByDetail(SearchResult detail) {
    _state.setInfosByDetail(detail, context);
  }

  void _onBackPressed() async {
    if (_state.isCasting && _state.dlnaDevice != null) {
      try {
        final shouldStop = await AppDialog.show<bool>(
          context: context,
          title: '停止投屏',
          content: const Text('DLNA 设备可继续保持播放，是否需要停止？\n\n（保持播放时无法同步进度和播放记录）'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('保持'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('停止'),
            ),
          ],
        );
        if (!mounted) return;

        if (shouldStop == true) {
          try {
            _state.dlnaDevice.stop();
            debugPrint('用户选择停止投屏');
          } catch (e) {
            debugPrint('停止投屏失败: $e');
          }
        } else {
          debugPrint('用户选择保持播放');
        }
      } catch (e) {
        debugPrint('停止投屏失败: $e');
      }
    }

    if (!mounted) return;
    _state.saveProgress(force: true, scene: '返回按钮', context: context);
    Navigator.of(context).pop();
  }

  void _exitWebFullscreen() {
    if (!DeviceUtils.isPC()) {
      return;
    }
    if (_state.videoPlayerController != null) {
      _state.videoPlayerController!.exitWebFullscreen();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        if (DeviceUtils.isPC()) {
          break;
        }
        _state.saveProgress(force: true, scene: '应用进入后台', context: context);
        break;
      case AppLifecycleState.resumed:
        if (DeviceUtils.isPC()) {
          break;
        }
        _state.lastSaveTime = null;
        _state.lastSavePosition = null;
        break;
      case AppLifecycleState.hidden:
        break;
    }
  }

  void showError(String message) {
    _state.setError(message);
  }

  void hideError() {
    _state.hideError();
  }


  Future<void> updateVideoUrl(String newUrl, {Duration? startAt}) async {
    await _state.updateVideoUrl(newUrl, startAt: startAt);
  }

  Future<void> seekToProgress(Duration position) async {
    await _state.seekToProgress(position);
  }

  Future<void> seekToSeconds(double seconds) async {
    await _state.seekToSeconds(seconds);
  }

  Duration? get currentPosition => _state.currentPosition;

  void _onVideoPlayerReady() {
    _state.onVideoPlayerReady();
    _addVideoProgressListener();
  }

  void _addVideoProgressListener() {
    if (_state.videoPlayerController != null) {
      _state.videoPlayerController!.addProgressListener(_progressListener!);
    }
  }

  void _removeVideoProgressListener() {
    if (_state.videoPlayerController != null) {
      _state.videoPlayerController!.removeProgressListener(_progressListener!);
    }
  }

  void _onNextEpisode() {
    if (_state.currentDetail == null) return;

    if (_state.currentEpisodeIndex >= _state.currentDetail!.episodes.length - 1) {
      _showToast('已经是最后一集了');
      return;
    }

    _state.showSwitchLoadingOverlay = true;
    _state.switchLoadingMessage = '切换选集...';

    _state.saveProgress(force: true, scene: '下一集按钮', context: context);

    final nextIndex = _state.currentEpisodeIndex + 1;
    _state.startPlay(nextIndex, 0, context: context);
  }

  void _onVideoCompleted() {
    if (_state.currentDetail == null) return;
    if (_state.isAutoSwitching) return;

    if (_state.currentEpisodeIndex >= _state.currentDetail!.episodes.length - 1) {
      _showToast('播放完成');
      return;
    }

    _state.isAutoSwitching = true;

    _state.showSwitchLoadingOverlay = true;
    _state.switchLoadingMessage = '自动播放下一集...';

    _state.saveProgress(force: true, scene: '自动播放下一集', context: context);

    final nextIndex = _state.currentEpisodeIndex + 1;
    _state.startPlay(nextIndex, 0, context: context);

    Future.delayed(const Duration(seconds: 2), () {
      _state.isAutoSwitching = false;
    });
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
      ),
    );
  }


  void _toggleFavorite() async {
    await _state.toggleFavorite(context);
  }

  void _toggleEpisodesOrder() {
    _state.toggleEpisodesOrder();
    _scrollToCurrentEpisode();
  }

  void _scrollToCurrentSource() {
    _state.performScrollToCurrentSource(context);
  }

  void _scrollToCurrentEpisode() {
    _state.performScrollToCurrentEpisode(context);
  }

  Future<void> _switchSource(SearchResult newSource) async {
    final currentProgress = _state.currentPosition?.inSeconds ?? 0;
    final currentEpisode = _state.currentEpisodeIndex;
    await _state.switchSource(newSource, currentEpisode, currentProgress, context);
  }

  Future<void> _refreshSourcesSpeed([StateSetter? stateSetter]) async {
    if (stateSetter != null) {
      await _state.refreshSourcesSpeed(onUpdate: () => stateSetter(() {}));
    } else {
      await _state.refreshSourcesSpeed();
    }
  }

  void _showEpisodesPanel() {
    final theme = Theme.of(context);
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final statusBarHeight = MediaQuery.of(context).padding.top;

    final crossAxisCount = _state.isPortraitTablet ? 4 : (_state.isTablet ? 3 : 2);

    if (_state.isTablet) {
      final panelWidth = _state.isPortraitTablet ? screenWidth : screenWidth * 0.35;
      final panelHeight = _state.isPortraitTablet
          ? (screenHeight - statusBarHeight) * 0.5
          : screenHeight;
      final alignment =
          _state.isPortraitTablet ? Alignment.bottomCenter : Alignment.centerRight;
      final slideBegin =
          _state.isPortraitTablet ? const Offset(0, 1) : const Offset(1, 0);

      showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: '',
        barrierColor: Colors.transparent,
        transitionDuration: const Duration(milliseconds: 300),
        pageBuilder: (context, animation, secondaryAnimation) {
          return Align(
            alignment: alignment,
            child: Material(
              color: Colors.transparent,
              child: SizedBox(
                width: panelWidth,
                height: panelHeight,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: slideBegin,
                    end: Offset.zero,
                  ).animate(CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeInOut,
                  )),
                  child: StatefulBuilder(
                    builder: (BuildContext context, StateSetter setState) {
                      return PlayerEpisodesPanel(
                        theme: theme,
                        episodes: _state.currentDetail!.episodes,
                        episodesTitles: _state.currentDetail!.episodesTitles,
                        currentEpisodeIndex: _state.currentEpisodeIndex,
                        isReversed: _state.isEpisodesReversed,
                        crossAxisCount: crossAxisCount,
                        onEpisodeTap: (index) {
                          Navigator.pop(context);
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            _state.showSwitchLoadingOverlay = true;
                            _state.switchLoadingMessage = '切换选集...';
                          });
                          _state.saveProgress(force: true, scene: '选集面板点击', context: context);
                          _state.startPlay(index, 0, context: context);
                        },
                        onToggleOrder: () {
                          _state.isEpisodesReversed = !_state.isEpisodesReversed;
                          setState(() {});
                        },
                      );
                    },
                  ),
                ),
              ),
            ),
          );
        },
      );
      return;
    }

    final playerHeight = screenWidth / (16 / 9);
    final panelHeight = screenHeight - statusBarHeight - playerHeight;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.transparent,
      enableDrag: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setState) {
            return Container(
              height: panelHeight,
              width: double.infinity,
              child: PlayerEpisodesPanel(
                theme: theme,
                episodes: _state.currentDetail!.episodes,
                episodesTitles: _state.currentDetail!.episodesTitles,
                currentEpisodeIndex: _state.currentEpisodeIndex,
                isReversed: _state.isEpisodesReversed,
                crossAxisCount: crossAxisCount,
                onEpisodeTap: (index) {
                  Navigator.pop(context);
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    _state.showSwitchLoadingOverlay = true;
                    _state.switchLoadingMessage = '切换选集...';
                  });
                  _state.saveProgress(force: true, scene: '选集面板点击', context: context);
                  _state.startPlay(index, 0, context: context);
                },
                onToggleOrder: () {
                  _state.isEpisodesReversed = !_state.isEpisodesReversed;
                  setState(() {});
                },
              ),
            );
          },
        );
      },
    );
  }

  void _showDetailsPanel() {
    final theme = Theme.of(context);
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final statusBarHeight = MediaQuery.of(context).padding.top;

    if (_state.isTablet) {
      final panelWidth = _state.isPortraitTablet ? screenWidth : screenWidth * 0.35;
      final panelHeight = _state.isPortraitTablet
          ? (screenHeight - statusBarHeight) * 0.5
          : screenHeight;
      final alignment =
          _state.isPortraitTablet ? Alignment.bottomCenter : Alignment.centerRight;
      final slideBegin =
          _state.isPortraitTablet ? const Offset(0, 1) : const Offset(1, 0);

      showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: '',
        barrierColor: Colors.transparent,
        transitionDuration: const Duration(milliseconds: 300),
        pageBuilder: (context, animation, secondaryAnimation) {
          return Align(
            alignment: alignment,
            child: Material(
              color: Colors.transparent,
              child: SizedBox(
                width: panelWidth,
                height: panelHeight,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: slideBegin,
                    end: Offset.zero,
                  ).animate(CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeInOut,
                  )),
                  child: PlayerDetailsPanel(
                    theme: theme,
                    doubanDetails: _state.doubanDetails,
                    currentDetail: _state.currentDetail,
                  ),
                ),
              ),
            ),
          );
        },
      );
      return;
    }

    final playerHeight = screenWidth / (16 / 9);
    final panelHeight = screenHeight - statusBarHeight - playerHeight;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.transparent,
      enableDrag: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setState) {
            return Container(
              height: panelHeight,
              width: double.infinity,
              child: PlayerDetailsPanel(
                theme: theme,
                doubanDetails: _state.doubanDetails,
                currentDetail: _state.currentDetail,
              ),
            );
          },
        );
      },
    );
  }

  void _showSourcesPanel() {
    final theme = Theme.of(context);
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final statusBarHeight = MediaQuery.of(context).padding.top;

    if (_state.isTablet) {
      final panelWidth = _state.isPortraitTablet ? screenWidth : screenWidth * 0.35;
      final panelHeight = _state.isPortraitTablet
          ? (screenHeight - statusBarHeight) * 0.5
          : screenHeight;
      final alignment =
          _state.isPortraitTablet ? Alignment.bottomCenter : Alignment.centerRight;
      final slideBegin =
          _state.isPortraitTablet ? const Offset(0, 1) : const Offset(1, 0);

      showGeneralDialog(
        context: context,
        barrierDismissible: true,
        barrierLabel: '',
        barrierColor: Colors.transparent,
        transitionDuration: const Duration(milliseconds: 300),
        pageBuilder: (context, animation, secondaryAnimation) {
          return Align(
            alignment: alignment,
            child: Material(
              color: Colors.transparent,
              child: SizedBox(
                width: panelWidth,
                height: panelHeight,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: slideBegin,
                    end: Offset.zero,
                  ).animate(CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeInOut,
                  )),
                  child: StatefulBuilder(
                    builder: (BuildContext context, StateSetter setState) {
                      return PlayerSourcesPanel(
                        theme: theme,
                        sources: _state.allSources,
                        currentSource: _state.currentSource,
                        currentId: _state.currentID,
                        sourcesSpeed: _state.allSourcesSpeed,
                        onSourceTap: (source) {
                          _switchSource(source);
                          Navigator.pop(context);
                        },
                        onRefresh: () async {
                          await _refreshSourcesSpeed(setState);
                        },
                        videoCover: _state.videoCover,
                        videoTitle: _state.videoTitle,
                      );
                    },
                  ),
                ),
              ),
            ),
          );
        },
      ).then((_) {
        if (mounted) {
          setState(() {});
        }
      });
      return;
    }

    final playerHeight = screenWidth / (16 / 9);
    final panelHeight = screenHeight - statusBarHeight - playerHeight;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.transparent,
      enableDrag: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setState) {
            return Container(
              height: panelHeight,
              width: double.infinity,
              child: PlayerSourcesPanel(
                theme: theme,
                sources: _state.allSources,
                currentSource: _state.currentSource,
                currentId: _state.currentID,
                sourcesSpeed: _state.allSourcesSpeed,
                onSourceTap: (source) {
                  _switchSource(source);
                  Navigator.pop(context);
                },
                onRefresh: () async {
                  await _refreshSourcesSpeed(setState);
                },
                videoCover: _state.videoCover,
                videoTitle: _state.videoTitle,
              ),
            );
          },
        );
      },
    ).then((_) {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_state.isInitialized) {
      _state.isTablet = DeviceUtils.isTablet(context);
      _state.isPortraitTablet = DeviceUtils.isPortraitTablet(context);

      if (!_state.isTablet) {
        _setPortraitOrientation();
      }
      final theme = Theme.of(context);
      final isDarkMode = theme.brightness == Brightness.dark;
      _state.originalStyle = SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness:
            isDarkMode ? Brightness.light : Brightness.dark,
        statusBarBrightness: isDarkMode ? Brightness.dark : Brightness.light,
        systemNavigationBarColor: theme.scaffoldBackgroundColor,
        systemNavigationBarIconBrightness:
            isDarkMode ? Brightness.light : Brightness.dark,
      );
      _state.isInitialized = true;

      initVideoData();
    }
  }

  @override
  void dispose() {
    _state.saveProgress(force: true, scene: '页面销毁', context: context);
    _removeVideoProgressListener();
    WidgetsBinding.instance.removeObserver(this);
    _restoreOrientation();
    SystemChrome.setSystemUIOverlayStyle(_state.originalStyle);
    _state.videoPlayerController?.dispose();
    _state.markUnmounted();
    _state.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDarkMode = theme.brightness == Brightness.dark;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle(
        statusBarColor: Colors.black,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
        systemNavigationBarColor:
            isDarkMode ? Colors.black : theme.scaffoldBackgroundColor,
        systemNavigationBarIconBrightness:
            isDarkMode ? Brightness.light : Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Container(
          decoration: BoxDecoration(
            gradient: isDarkMode
                ? null
                : const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppTheme.gray100,
                      AppTheme.gray100,
                      AppTheme.backgroundSubtle,
                      AppTheme.gray200,
                      AppTheme.gray200,
                      AppTheme.gray300,
                    ],
                    stops: [0.0, 0.18, 0.38, 0.60, 0.80, 1.0],
                  ),
            color: isDarkMode ? theme.scaffoldBackgroundColor : null,
          ),
          child: Column(
            children: [
              if (Platform.isWindows)
                const WindowsTitleBar(
                  customBackgroundColor: AppTheme.gray950,
                ),
              Expanded(
                child: Stack(
                  children: [
                    if (!_state.isWebFullscreen)
                      if (_state.isTablet && !_state.isPortraitTablet)
                        _buildTabletLandscapeLayout(theme)
                      else if (_state.isPortraitTablet)
                        _buildPortraitTabletLayout(theme)
                      else
                        _buildPhoneLayout(theme),
                    _buildPlayerLayer(theme),
                    if (_state.showError && _state.errorMessage != null)
                      _buildErrorOverlay(theme),
                    if (_state.isLoading) _buildLoadingOverlay(theme),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlayerWidget() {
    final isPC = DeviceUtils.isPC();

    return Stack(
      children: [
        if (!_state.isCasting)
          VideoPlayerWidget(
            surface:
                isPC ? VideoPlayerSurface.desktop : VideoPlayerSurface.mobile,
            url: null,
            onBackPressed: _onBackPressed,
            onControllerCreated: (controller) {
              _state.videoPlayerController = controller;
            },
            onReady: _onVideoPlayerReady,
            onNextEpisode: _onNextEpisode,
            onVideoCompleted: _onVideoCompleted,
            onPause: () {
              _state.saveProgress(force: true, scene: '暂停', context: context);
            },
            isLastEpisode: _state.currentDetail != null &&
                _state.currentEpisodeIndex >= _state.currentDetail!.episodes.length - 1,
            videoTitle: _state.videoTitle,
            currentEpisodeIndex: _state.currentEpisodeIndex,
            totalEpisodes: _state.totalEpisodes,
            sourceName: _state.currentDetail?.sourceName ?? _state.currentSource,
            onWebFullscreenChanged: (isWebFullscreen) {
              _state.isWebFullscreen = isWebFullscreen;
            },
            onRotate: _toggleOrientationLock,
          ),
        if (_state.isCasting && _state.dlnaDevice != null)
          Container(
            color: Colors.black,
            child: const Center(
              child: Text('投屏中...', style: TextStyle(color: Colors.white, fontSize: 16)),
            ),
          ),
        SwitchLoadingOverlay(
          isVisible: _state.showSwitchLoadingOverlay,
          message: _state.switchLoadingMessage,
          animationController: _state.switchLoadingAnimationController,
          onBackPressed: _state.isWebFullscreen ? _exitWebFullscreen : _onBackPressed,
        ),
      ],
    );
  }

  Widget _buildVideoDetailSection(ThemeData theme) {
    final isDarkMode = theme.brightness == Brightness.dark;

    if (_state.currentDetail == null) {
      return Container(
        color: Colors.transparent,
        child: const Center(
          child: Text('加载中...'),
        ),
      );
    }

    return Container(
      color: Colors.transparent,
      child: SingleChildScrollView(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(
                  left: 16, right: 16, top: 16, bottom: 0),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _state.videoTitle,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color:
                            isDarkMode ? Colors.white : AppTheme.foreground,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: _toggleFavorite,
                    child: Icon(
                      _state.isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: _state.isFavorite
                          ? AppTheme.error
                          : (isDarkMode ? Colors.grey[400] : Colors.grey[600]),
                      size: 28,
                    ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.only(
                  left: 16, right: 16, top: 12, bottom: 16),
              child: Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color:
                            isDarkMode ? Colors.grey[600]! : Colors.grey[400]!,
                        width: 1,
                      ),
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                    child: Text(
                      _state.currentDetail!.sourceName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isDarkMode ? Colors.grey[300] : Colors.black87,
                      ),
                    ),
                  ),

                  const SizedBox(width: 12),

                  if (_state.videoYear.isNotEmpty && _state.videoYear != 'unknown')
                    Text(
                      _state.videoYear,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: isDarkMode ? Colors.grey[300] : Colors.black87,
                        fontWeight: FontWeight.w500,
                      ),
                    ),

                  if (_state.videoYear.isNotEmpty && _state.videoYear != 'unknown')
                    const SizedBox(width: 12),

                  if (_state.currentDetail!.class_ != null &&
                      _state.currentDetail!.class_!.isNotEmpty)
                    Expanded(
                      child: Text(
                        _state.currentDetail!.class_!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppTheme.success,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),

                  if (_state.currentDetail!.class_ == null ||
                      _state.currentDetail!.class_!.isEmpty)
                    const Spacer(),

                  const SizedBox(width: 12),

                  if (!(_state.isTablet && !_state.isPortraitTablet))
                    GestureDetector(
                      onTap: () {
                        _showDetailsPanel();
                      },
                      child: Stack(
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '详情',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: isDarkMode
                                      ? Colors.grey[400]
                                      : Colors.grey[600],
                                  fontWeight: FontWeight.w300,
                                ),
                              ),
                              const SizedBox(width: 18),
                            ],
                          ),
                          Positioned(
                            right: 0,
                            top: 4,
                            child: Icon(
                              Icons.arrow_forward_ios,
                              size: 14,
                              color: isDarkMode
                                  ? Colors.grey[400]
                                  : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            if (_state.videoDesc.isNotEmpty ||
                (_state.doubanDetails?.summary != null &&
                    _state.doubanDetails!.summary!.isNotEmpty))
              Padding(
                padding: const EdgeInsets.only(
                    left: 16, right: 16, top: 0, bottom: 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    (_state.videoDesc.isNotEmpty && _state.videoDesc != '暂无简介')
                        ? _state.videoDesc
                        : (_state.doubanDetails?.summary ?? '暂无简介'),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),

            _buildEpisodesSection(theme),

            const SizedBox(height: 16),

            _buildSourcesSection(theme),

            const SizedBox(height: 16),

            _buildRecommendsSection(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendsSection(ThemeData theme) {
    if (_state.doubanDetails == null || _state.doubanDetails!.recommends.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        Padding(
          padding:
              const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '相关推荐',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        _buildRecommendsGrid(theme)
      ],
    );
  }

  Widget _buildRecommendsGrid(ThemeData theme) {
    final recommends = _state.doubanDetails!.recommends;

    return LayoutBuilder(
      builder: (context, constraints) {
        final double screenWidth = constraints.maxWidth;
        final double padding = 16.0;
        final double spacing = 12.0;
        final crossAxisCount = _state.isTablet ? 6 : 3;
        final double availableWidth =
            screenWidth - (padding * 2) - (spacing * (crossAxisCount - 1));
        final double minItemWidth = 80.0;
        final double calculatedItemWidth = availableWidth / crossAxisCount;
        final double itemWidth = math.max(calculatedItemWidth, minItemWidth);
        final double itemHeight = itemWidth * 2.0;

        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: GridView.builder(
            padding: EdgeInsets.zero,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              childAspectRatio: itemWidth / itemHeight,
              crossAxisSpacing: spacing,
              mainAxisSpacing: 4,
            ),
            itemCount: recommends.length,
            itemBuilder: (context, index) {
              final recommend = recommends[index];
              final videoInfo = recommend.toVideoInfo();

              return VideoCard(
                videoInfo: videoInfo,
                from: 'douban',
                cardWidth: itemWidth,
                onTap: () => _onRecommendTap(recommend),
              );
            },
          ),
        );
      },
    );
  }

  void _onRecommendTap(DoubanRecommendItem recommend) {
    if (_state.isCasting) {
      AppDialog.show(
        context: context,
        title: '提示',
        content: const Text('请先关闭投屏后再切换视频'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('确定'),
          ),
        ],
      );
      return;
    }

    if (_state.videoPlayerController?.isPlaying == true) {
      _state.videoPlayerController?.pause();
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlayerScreen(
          title: recommend.title,
        ),
      ),
    );
  }

  Widget _buildEpisodesSection(ThemeData theme) {
    final isDarkMode = theme.brightness == Brightness.dark;

    if (_state.totalEpisodes <= 1) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '选集',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 16),

              AppHoverButton(
                onTap: _toggleEpisodesOrder,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      _state.isEpisodesReversed ? '倒序' : '正序',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 3),
                    Transform.translate(
                      offset: const Offset(0, 3),
                      child: Icon(
                        _state.isEpisodesReversed
                            ? Icons.arrow_upward
                            : Icons.arrow_downward,
                        size: 16,
                        color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              Transform.translate(
                offset: const Offset(0, 3.5),
                child: AppHoverButton(
                  onTap: _scrollToCurrentEpisode,
                  child: Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color:
                            isDarkMode ? Colors.grey[400]! : Colors.grey[600]!,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color:
                              isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 20),

              AppHoverButton(
                onTap: _showEpisodesPanel,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Transform.translate(
                      offset: const Offset(0, -1.2),
                      child: Text(
                        '展开',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color:
                              isDarkMode ? Colors.grey[400] : Colors.grey[600],
                          fontWeight: FontWeight.w300,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 14,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 2),

        LayoutBuilder(
          builder: (context, constraints) {
            final screenWidth = constraints.maxWidth;
            final horizontalPadding = 32.0;
            final availableWidth = screenWidth - horizontalPadding;
            final cardsPerView = _state.isTablet ? 6.2 : 3.2;
            final buttonWidth = (availableWidth / cardsPerView) - 6;
            final buttonHeight = buttonWidth * 1.8 / 3;

            return SizedBox(
              height: buttonHeight,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ListView.builder(
                  controller: _state.episodesScrollController,
                  scrollDirection: Axis.horizontal,
                  itemCount: _state.currentDetail!.episodes.length,
                  itemBuilder: (context, index) {
                    final episodeIndex = _state.isEpisodesReversed
                        ? _state.currentDetail!.episodes.length - 1 - index
                        : index;
                    final isCurrentEpisode =
                        episodeIndex == _state.currentEpisodeIndex;

                    String episodeTitle = '';
                    if (_state.currentDetail!.episodesTitles.isNotEmpty &&
                        episodeIndex < _state.currentDetail!.episodesTitles.length) {
                      episodeTitle =
                          _state.currentDetail!.episodesTitles[episodeIndex];
                    } else {
                      episodeTitle = '第${episodeIndex + 1}集';
                    }

                    return Container(
                      width: buttonWidth,
                      margin: const EdgeInsets.only(right: 6),
                      child: AspectRatio(
                        aspectRatio: 3 / 2,
                        child: _EpisodeCardWithHover(
                          isCurrentEpisode: isCurrentEpisode,
                          isDarkMode: isDarkMode,
                          episodeIndex: episodeIndex,
                          episodeTitle: episodeTitle,
                          onTap: isCurrentEpisode
                              ? null
                              : () {
                                  _state.showSwitchLoadingOverlay = true;
                                  _state.switchLoadingMessage = '切换选集...';

                                  _state.saveProgress(force: true, scene: '选集列表点击', context: context);

                                  _state.startPlay(episodeIndex, 0, context: context);
                                },
                        ),
                      ),
                    );
                  },
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildSourcesSection(ThemeData theme) {
    final isDarkMode = theme.brightness == Brightness.dark;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '换源',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),

              const Spacer(),

              Transform.translate(
                offset: const Offset(0, 2.6),
                child: AppHoverButton(
                  onTap: _state.isRefreshing ? null : _refreshSourcesSpeed,
                  enabled: !_state.isRefreshing,
                  child: RotationTransition(
                    turns: _state.refreshAnimationController,
                    child: Icon(
                      Icons.refresh,
                      size: 20,
                      color: _state.isRefreshing
                          ? Colors.green
                          : (isDarkMode ? Colors.grey[400] : Colors.grey[600]),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 20),

              Transform.translate(
                offset: const Offset(0, 3.5),
                child: AppHoverButton(
                  onTap: _scrollToCurrentSource,
                  child: Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color:
                            isDarkMode ? Colors.grey[400]! : Colors.grey[600]!,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color:
                              isDarkMode ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 20),

              AppHoverButton(
                onTap: _showSourcesPanel,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Transform.translate(
                      offset: const Offset(0, -1.2),
                      child: Text(
                        '展开',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color:
                              isDarkMode ? Colors.grey[400] : Colors.grey[600],
                          fontWeight: FontWeight.w300,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 14,
                      color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 2),

        _buildSourcesHorizontalScroll(theme),
      ],
    );
  }

  Widget _buildSourcesHorizontalScroll(ThemeData theme) {
    final isDarkMode = theme.brightness == Brightness.dark;

    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = constraints.maxWidth;
        final horizontalPadding = 32.0;
        final availableWidth = screenWidth - horizontalPadding;
        final cardsPerView = _state.isTablet ? 6.2 : 3.2;
        final cardWidth = (availableWidth / cardsPerView) - 6;
        final cardHeight = cardWidth * 1.8 / 3;

        return SizedBox(
          height: cardHeight,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ListView.builder(
              controller: _state.sourcesScrollController,
              scrollDirection: Axis.horizontal,
              itemCount: _state.allSources.length,
              itemBuilder: (context, index) {
                final source = _state.allSources[index];
                final isCurrentSource =
                    source.source == _state.currentSource && source.id == _state.currentID;
                final sourceKey = '${source.source}_${source.id}';
                final speedInfo = _state.allSourcesSpeed[sourceKey];

                return Container(
                  width: cardWidth,
                  margin: const EdgeInsets.only(right: 6),
                  child: AspectRatio(
                    aspectRatio: 3 / 2,
                    child: _SourceCardWithHover(
                      isCurrentSource: isCurrentSource,
                      isDarkMode: isDarkMode,
                      source: source,
                      speedInfo: speedInfo,
                      onTap:
                          isCurrentSource ? null : () => _switchSource(source),
                    ),
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildErrorOverlay(ThemeData theme) {
    final isDarkMode = theme.brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: isDarkMode
            ? null
            : const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppTheme.gray100,
                  AppTheme.gray100,
                  AppTheme.backgroundSubtle,
                  AppTheme.gray200,
                  AppTheme.gray200,
                  AppTheme.gray300,
                ],
                stops: [0.0, 0.18, 0.38, 0.60, 0.80, 1.0],
              ),
        color: isDarkMode ? Colors.black : null,
      ),
      child: Stack(
        children: [
          const Positioned(
            top: 100,
            left: 40,
            child: SizedBox(
              width: 12,
              height: 12,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          const Positioned(
            top: 140,
            left: 60,
            child: SizedBox(
              width: 8,
              height: 8,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.orange,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          const Positioned(
            top: 120,
            right: 50,
            child: SizedBox(
              width: 10,
              height: 10,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.amber,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),

          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [AppTheme.primaryDark, AppTheme.error],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.orange.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Text(
                      '😵',
                      style: TextStyle(fontSize: 60),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                Text(
                  '哎呀, 出现了一些问题',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.foreground,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),

                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 40),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.darkBackgroundMuted,
                    borderRadius: BorderRadius.circular(AppTheme.radiusXl),
                    border: Border.all(
                      color: AppTheme.foreground.withValues(alpha: 0.1),
                      width: 0.5,
                    ),
                  ),
                  child: Text(
                    _state.errorMessage!,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.foregroundMuted,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 16),

                Text(
                  '请检查网络连接或尝试刷新页面',
                  style: TextStyle(
                    fontSize: 14,
                    color: isDarkMode ? Colors.grey[400] : Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),

                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Column(
                    children: [
                      AppButton(
                        label: '返回上页',
                        onPressed: () {
                          hideError();
                          _onBackPressed();
                        },
                        color: Colors.green,
                        fullWidth: true,
                        size: AppButtonSize.large,
                      ),
                      const SizedBox(height: 12),

                      AppButton(
                        label: '重新尝试',
                        onPressed: () {
                          hideError();
                          if (_state.currentDetail != null &&
                              _state.currentEpisodeIndex <
                                  _state.currentDetail!.episodes.length) {
                            _state.updateVideoUrl(
                                _state.currentDetail!.episodes[_state.currentEpisodeIndex]);
                          }
                        },
                        variant: AppButtonVariant.secondary,
                        fullWidth: true,
                        size: AppButtonSize.large,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerLayer(ThemeData theme) {
    final statusBarHeight = MediaQuery.maybeOf(context)?.padding.top ?? 0;
    final macOSPadding = DeviceUtils.isMacOS() ? 32.0 : 0.0;
    final topOffset = statusBarHeight + macOSPadding;

    if (_state.isWebFullscreen) {
      return Positioned(
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        child: Column(
          children: [
            Container(
              height: topOffset,
              color: Colors.black,
            ),
            Expanded(
              child: Container(
                key: _state.playerKey,
                color: Colors.black,
                child: _buildPlayerWidget(),
              ),
            ),
          ],
        ),
      );
    } else {
      if (_state.isTablet && !_state.isPortraitTablet) {
        final screenWidth = MediaQuery.of(context).size.width;
        final leftWidth = screenWidth * 0.65;
        final playerHeight = leftWidth / (16 / 9);

        return Positioned(
          top: topOffset,
          left: 0,
          width: leftWidth,
          height: playerHeight,
          child: Container(
            key: _state.playerKey,
            color: Colors.black,
            child: _buildPlayerWidget(),
          ),
        );
      } else if (_state.isPortraitTablet) {
        final screenHeight = MediaQuery.of(context).size.height;
        final playerHeight = (screenHeight - topOffset) * 0.5;

        return Positioned(
          top: topOffset,
          left: 0,
          right: 0,
          height: playerHeight,
          child: Container(
            key: _state.playerKey,
            color: Colors.black,
            child: _buildPlayerWidget(),
          ),
        );
      } else {
        final screenWidth = MediaQuery.of(context).size.width;
        final playerHeight = screenWidth / (16 / 9);

        return Positioned(
          top: topOffset,
          left: 0,
          right: 0,
          height: playerHeight,
          child: Container(
            key: _state.playerKey,
            color: Colors.black,
            child: _buildPlayerWidget(),
          ),
        );
      }
    }
  }

  Widget _buildPhoneLayout(ThemeData theme) {
    final statusBarHeight = MediaQuery.maybeOf(context)?.padding.top ?? 0;
    final macOSPadding = DeviceUtils.isMacOS() ? 32.0 : 0.0;
    final screenWidth = MediaQuery.of(context).size.width;
    final playerHeight = screenWidth / (16 / 9);

    return Column(
      children: [
        Container(
          height: statusBarHeight + macOSPadding,
          color: Colors.black,
        ),
        SizedBox(height: playerHeight),
        Expanded(
          child: _buildVideoDetailSection(theme),
        ),
      ],
    );
  }

  Widget _buildPortraitTabletLayout(ThemeData theme) {
    final screenHeight = MediaQuery.of(context).size.height;
    final statusBarHeight = MediaQuery.of(context).padding.top;
    final macOSPadding = DeviceUtils.isMacOS() ? 32.0 : 0.0;
    final playerHeight = (screenHeight - statusBarHeight - macOSPadding) * 0.5;

    return Column(
      children: [
        Container(
          height: statusBarHeight + macOSPadding,
          color: Colors.black,
        ),
        SizedBox(height: playerHeight),
        Expanded(
          child: _buildVideoDetailSection(theme),
        ),
      ],
    );
  }

  Widget _buildTabletLandscapeLayout(ThemeData theme) {
    final statusBarHeight = MediaQuery.maybeOf(context)?.padding.top ?? 0;
    final macOSPadding = DeviceUtils.isMacOS() ? 32.0 : 0.0;
    final screenWidth = MediaQuery.of(context).size.width;
    final leftWidth = screenWidth * 0.65;
    final playerHeight = leftWidth / (16 / 9);

    return Column(
      children: [
        Container(
          height: statusBarHeight + macOSPadding,
          color: Colors.black,
        ),
        Expanded(
          child: Row(
            children: [
              Expanded(
                flex: 65,
                child: Column(
                  children: [
                    SizedBox(height: playerHeight),
                    Expanded(
                      child: _buildVideoDetailSection(theme),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 35,
                child: Container(
                  color: Colors.transparent,
                  child: PlayerDetailsPanel(
                    theme: theme,
                    doubanDetails: _state.doubanDetails,
                    currentDetail: _state.currentDetail,
                    showCloseButton: false,
                    showTitle: false,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingOverlay(ThemeData theme) {
    final isDarkMode = theme.brightness == Brightness.dark;

    final topPadding = DeviceUtils.isMacOS()
        ? MediaQuery.of(context).padding.top + 32
        : MediaQuery.of(context).padding.top + 8;

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: isDarkMode
            ? null
            : const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppTheme.gray100,
                  AppTheme.gray100,
                  AppTheme.backgroundSubtle,
                  AppTheme.gray200,
                  AppTheme.gray200,
                  AppTheme.gray300,
                ],
                stops: [0.0, 0.18, 0.38, 0.60, 0.80, 1.0],
              ),
        color: isDarkMode ? Colors.black : null,
      ),
      child: Stack(
        children: [
          if (DeviceUtils.isPC())
            Positioned(
              top: topPadding + 4,
              left: 16,
              child: _HoverBackButton(
                onTap: _onBackPressed,
                iconColor: isDarkMode
                    ? AppTheme.background
                    : AppTheme.foreground,
              ),
            ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    RotationTransition(
                      turns: _state.loadingAnimationController,
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: AppTheme.success.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    ),
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [AppTheme.success, AppTheme.success],
                        ),
                        borderRadius: BorderRadius.circular(AppTheme.radius2xl),
                      ),
                      child: Center(
                        child: Text(
                          _state.loadingEmoji,
                          style: const TextStyle(fontSize: 24),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                Container(
                  width: 200,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDarkMode ? Colors.grey[700] : Colors.grey[300],
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: _state.loadingProgress,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.success,
                        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                AnimatedBuilder(
                  animation: _state.textAnimationController,
                  builder: (context, child) {
                    return Text(
                      _state.loadingMessage,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: (isDarkMode ? Colors.white70 : Colors.black54)
                            .withValues(alpha: 
                          0.3 + (_state.textAnimationController.value * 0.7),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

}

class _HoverBackButton extends StatefulWidget {
  final VoidCallback onTap;
  final Color iconColor;

  const _HoverBackButton({
    required this.onTap,
    required this.iconColor,
  });

  @override
  State<_HoverBackButton> createState() => _HoverBackButtonState();
}

class _HoverBackButtonState extends State<_HoverBackButton> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: _isHovering
              ? BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.grey.withValues(alpha: 0.5),
                )
              : null,
          child: Icon(
            Icons.arrow_back,
            color: widget.iconColor,
            size: 24,
          ),
        ),
      ),
    );
  }
}

class _EpisodeCardWithHover extends StatefulWidget {
  final bool isCurrentEpisode;
  final bool isDarkMode;
  final int episodeIndex;
  final String episodeTitle;
  final VoidCallback? onTap;

  const _EpisodeCardWithHover({
    required this.isCurrentEpisode,
    required this.isDarkMode,
    required this.episodeIndex,
    required this.episodeTitle,
    this.onTap,
  });

  @override
  State<_EpisodeCardWithHover> createState() => _EpisodeCardWithHoverState();
}

class _EpisodeCardWithHoverState extends State<_EpisodeCardWithHover> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: (DeviceUtils.isPC() && !widget.isCurrentEpisode)
          ? SystemMouseCursors.click
          : MouseCursor.defer,
      onEnter: (_) {
        if (DeviceUtils.isPC() && !widget.isCurrentEpisode) {
          setState(() => _isHovering = true);
        }
      },
      onExit: (_) {
        if (DeviceUtils.isPC()) {
          setState(() => _isHovering = false);
        }
      },
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          decoration: BoxDecoration(
            color: widget.isCurrentEpisode
                ? Colors.green.withValues(alpha: 0.2)
                : (_isHovering && DeviceUtils.isPC()
                    ? (widget.isDarkMode
                        ? AppTheme.darkBackground
                        : AppTheme.gray100)
                    : (widget.isDarkMode
                        ? Colors.grey[700]
                        : Colors.grey[300])),
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            border: widget.isCurrentEpisode
                ? Border.all(color: Colors.green, width: 2)
                : null,
          ),
          child: Stack(
            children: [
              Positioned(
                top: 4,
                left: 6,
                child: Text(
                  '${widget.episodeIndex + 1}',
                  style: TextStyle(
                    color: widget.isCurrentEpisode
                        ? Colors.green
                        : (widget.isDarkMode ? Colors.white : Colors.black),
                    fontSize: 10,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
              Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 6, left: 4, right: 4),
                  child: Text(
                    widget.episodeTitle,
                    style: TextStyle(
                      color: widget.isCurrentEpisode
                          ? Colors.green
                          : (widget.isDarkMode ? Colors.white : Colors.black),
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SourceCardWithHover extends StatefulWidget {
  final bool isCurrentSource;
  final bool isDarkMode;
  final SearchResult source;
  final SourceSpeed? speedInfo;
  final VoidCallback? onTap;

  const _SourceCardWithHover({
    required this.isCurrentSource,
    required this.isDarkMode,
    required this.source,
    this.speedInfo,
    this.onTap,
  });

  @override
  State<_SourceCardWithHover> createState() => _SourceCardWithHoverState();
}

class _SourceCardWithHoverState extends State<_SourceCardWithHover> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: (DeviceUtils.isPC() && !widget.isCurrentSource)
          ? SystemMouseCursors.click
          : MouseCursor.defer,
      onEnter: (_) {
        if (DeviceUtils.isPC() && !widget.isCurrentSource) {
          setState(() => _isHovering = true);
        }
      },
      onExit: (_) {
        if (DeviceUtils.isPC()) {
          setState(() => _isHovering = false);
        }
      },
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          decoration: BoxDecoration(
            color: widget.isCurrentSource
                ? Colors.green.withValues(alpha: 0.2)
                : (_isHovering && DeviceUtils.isPC()
                    ? (widget.isDarkMode
                        ? AppTheme.darkBackground
                        : AppTheme.gray100)
                    : (widget.isDarkMode
                        ? Colors.grey[700]
                        : Colors.grey[300])),
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            border: widget.isCurrentSource
                ? Border.all(color: Colors.green, width: 2)
                : null,
          ),
          child: Stack(
            children: [
              if (widget.source.episodes.length > 1)
                Positioned(
                  top: 4,
                  right: 6,
                  child: Text(
                    '${widget.source.episodes.length}集',
                    style: TextStyle(
                      color: widget.isCurrentSource
                          ? Colors.green
                          : (widget.isDarkMode
                              ? Colors.grey[400]
                              : Colors.grey[600]),
                      fontSize: 10,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),

              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Text(
                    widget.source.sourceName,
                    style: TextStyle(
                      color: widget.isCurrentSource
                          ? Colors.green
                          : (widget.isDarkMode ? Colors.white : Colors.black),
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),

              if (widget.speedInfo != null &&
                  widget.speedInfo!.quality.toLowerCase() != '未知')
                Positioned(
                  bottom: 4,
                  left: 6,
                  child: Text(
                    widget.speedInfo!.quality,
                    style: TextStyle(
                      color: widget.isCurrentSource
                          ? Colors.green
                          : (widget.isDarkMode
                              ? Colors.grey[400]
                              : Colors.grey[600]),
                      fontSize: 10,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),

              if (widget.speedInfo != null &&
                  widget.speedInfo!.loadSpeed.isNotEmpty &&
                  !widget.speedInfo!.loadSpeed.toLowerCase().contains('超时'))
                Positioned(
                  bottom: 4,
                  right: 6,
                  child: Text(
                    widget.speedInfo!.loadSpeed,
                    style: TextStyle(
                      color: widget.isCurrentSource
                          ? Colors.green
                          : (widget.isDarkMode
                              ? Colors.grey[400]
                              : Colors.grey[600]),
                      fontSize: 10,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
