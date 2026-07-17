import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/video_player_widget.dart';
import '../services/api_service.dart';
import '../services/m3u8_service.dart';
import '../services/douban_service.dart';
import '../services/user_data_service.dart';
import '../services/search_service.dart';
import '../models/search_result.dart';
import '../models/douban_movie.dart';
import '../models/play_record.dart';
import '../services/page_cache_service.dart';
import '../widgets/player_sources_panel.dart';

class PlayerState extends ChangeNotifier {
  final String? source;
  final String? id;
  final String title;
  final String? year;
  final String? stitle;
  final String? stype;
  final String? prefer;
  final String? sourceApi;

  PlayerState({
    this.source,
    this.id,
    required this.title,
    this.year,
    this.stitle,
    this.stype,
    this.prefer,
    this.sourceApi,
  });

  bool _mounted = false;
  bool get mounted => _mounted;
  void markMounted() => _mounted = true;
  void markUnmounted() => _mounted = false;

  SystemUiOverlayStyle _originalStyle = const SystemUiOverlayStyle();
  SystemUiOverlayStyle get originalStyle => _originalStyle;
  set originalStyle(SystemUiOverlayStyle value) {
    _originalStyle = value;
  }

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;
  set isInitialized(bool value) {
    _isInitialized = value;
    notifyListeners();
  }

  String? _errorMessage;
  String? get errorMessage => _errorMessage;
  set errorMessage(String? value) {
    _errorMessage = value;
    notifyListeners();
  }

  bool _showError = false;
  bool get showError => _showError;
  set showError(bool value) {
    _showError = value;
    notifyListeners();
  }

  late bool _isTablet;
  bool get isTablet => _isTablet;
  set isTablet(bool value) {
    _isTablet = value;
  }

  late bool _isPortraitTablet;
  bool get isPortraitTablet => _isPortraitTablet;
  set isPortraitTablet(bool value) {
    _isPortraitTablet = value;
  }

  bool _isLoading = true;
  bool get isLoading => _isLoading;
  set isLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  String _loadingMessage = '正在搜索播放源...';
  String get loadingMessage => _loadingMessage;
  set loadingMessage(String value) {
    _loadingMessage = value;
    notifyListeners();
  }

  String _loadingEmoji = '🔍';
  String get loadingEmoji => _loadingEmoji;
  set loadingEmoji(String value) {
    _loadingEmoji = value;
    notifyListeners();
  }

  double _loadingProgress = 0.0;
  double get loadingProgress => _loadingProgress;
  set loadingProgress(double value) {
    _loadingProgress = value.clamp(0.0, 1.0);
    notifyListeners();
  }

  late AnimationController _loadingAnimationController;
  AnimationController get loadingAnimationController =>
      _loadingAnimationController;

  late AnimationController _textAnimationController;
  AnimationController get textAnimationController => _textAnimationController;

  SearchResult? _currentDetail;
  SearchResult? get currentDetail => _currentDetail;
  set currentDetail(SearchResult? value) {
    _currentDetail = value;
    notifyListeners();
  }

  String _searchTitle = '';
  String get searchTitle => _searchTitle;
  set searchTitle(String value) {
    _searchTitle = value;
    notifyListeners();
  }

  String _videoTitle = '';
  String get videoTitle => _videoTitle;
  set videoTitle(String value) {
    _videoTitle = value;
    notifyListeners();
  }

  String _videoDesc = '';
  String get videoDesc => _videoDesc;
  set videoDesc(String value) {
    _videoDesc = value;
    notifyListeners();
  }

  String _videoYear = '';
  String get videoYear => _videoYear;
  set videoYear(String value) {
    _videoYear = value;
    notifyListeners();
  }

  String _videoCover = '';
  String get videoCover => _videoCover;
  set videoCover(String value) {
    _videoCover = value;
    notifyListeners();
  }

  int _videoDoubanID = 0;
  int get videoDoubanID => _videoDoubanID;
  set videoDoubanID(int value) {
    _videoDoubanID = value;
    notifyListeners();
  }

  String _currentSource = '';
  String get currentSource => _currentSource;
  set currentSource(String value) {
    _currentSource = value;
    notifyListeners();
  }

  String _currentID = '';
  String get currentID => _currentID;
  set currentID(String value) {
    _currentID = value;
    notifyListeners();
  }

  bool _needPrefer = false;
  bool get needPrefer => _needPrefer;
  set needPrefer(bool value) {
    _needPrefer = value;
    notifyListeners();
  }

  int _totalEpisodes = 0;
  int get totalEpisodes => _totalEpisodes;
  set totalEpisodes(int value) {
    _totalEpisodes = value;
    notifyListeners();
  }

  int _currentEpisodeIndex = 0;
  int get currentEpisodeIndex => _currentEpisodeIndex;
  set currentEpisodeIndex(int value) {
    _currentEpisodeIndex = value;
    notifyListeners();
  }

  DoubanMovieDetails? _doubanDetails;
  DoubanMovieDetails? get doubanDetails => _doubanDetails;
  set doubanDetails(DoubanMovieDetails? value) {
    _doubanDetails = value;
    notifyListeners();
  }

  List<SearchResult> _allSources = [];
  List<SearchResult> get allSources => _allSources;
  set allSources(List<SearchResult> value) {
    _allSources = value;
    notifyListeners();
  }

  Map<String, SourceSpeed> _allSourcesSpeed = {};
  Map<String, SourceSpeed> get allSourcesSpeed => _allSourcesSpeed;

  VideoPlayerWidgetController? _videoPlayerController;
  VideoPlayerWidgetController? get videoPlayerController =>
      _videoPlayerController;
  set videoPlayerController(VideoPlayerWidgetController? value) {
    _videoPlayerController = value;
  }

  bool _isFavorite = false;
  bool get isFavorite => _isFavorite;
  set isFavorite(bool value) {
    _isFavorite = value;
    notifyListeners();
  }

  bool _showSwitchLoadingOverlay = false;
  bool get showSwitchLoadingOverlay => _showSwitchLoadingOverlay;
  set showSwitchLoadingOverlay(bool value) {
    _showSwitchLoadingOverlay = value;
    notifyListeners();
  }

  String _switchLoadingMessage = '切换播放源...';
  String get switchLoadingMessage => _switchLoadingMessage;
  set switchLoadingMessage(String value) {
    _switchLoadingMessage = value;
    notifyListeners();
  }

  late AnimationController _switchLoadingAnimationController;
  AnimationController get switchLoadingAnimationController =>
      _switchLoadingAnimationController;

  bool _isAutoSwitching = false;
  bool get isAutoSwitching => _isAutoSwitching;
  set isAutoSwitching(bool value) {
    _isAutoSwitching = value;
  }

  bool _isCasting = false;
  bool get isCasting => _isCasting;
  set isCasting(bool value) {
    _isCasting = value;
    notifyListeners();
  }

  dynamic _dlnaDevice;
  dynamic get dlnaDevice => _dlnaDevice;
  set dlnaDevice(dynamic value) {
    _dlnaDevice = value;
  }

  Duration? _castStartPosition;
  Duration? get castStartPosition => _castStartPosition;
  set castStartPosition(Duration? value) {
    _castStartPosition = value;
  }

  Duration? _dlnaCurrentPosition;
  Duration? get dlnaCurrentPosition => _dlnaCurrentPosition;
  set dlnaCurrentPosition(Duration? value) {
    _dlnaCurrentPosition = value;
    notifyListeners();
  }

  Duration? _dlnaCurrentDuration;
  Duration? get dlnaCurrentDuration => _dlnaCurrentDuration;
  set dlnaCurrentDuration(Duration? value) {
    _dlnaCurrentDuration = value;
    notifyListeners();
  }

  bool _isEpisodesReversed = false;
  bool get isEpisodesReversed => _isEpisodesReversed;
  set isEpisodesReversed(bool value) {
    _isEpisodesReversed = value;
    notifyListeners();
  }

  final ScrollController _episodesScrollController = ScrollController();
  ScrollController get episodesScrollController => _episodesScrollController;

  final ScrollController _sourcesScrollController = ScrollController();
  ScrollController get sourcesScrollController => _sourcesScrollController;

  bool _isRefreshing = false;
  bool get isRefreshing => _isRefreshing;
  set isRefreshing(bool value) {
    _isRefreshing = value;
    notifyListeners();
  }

  late AnimationController _refreshAnimationController;
  AnimationController get refreshAnimationController =>
      _refreshAnimationController;

  DateTime? _lastSaveTime;
  DateTime? get lastSaveTime => _lastSaveTime;
  set lastSaveTime(DateTime? value) {
    _lastSaveTime = value;
  }

  int? _lastSavePosition;
  int? get lastSavePosition => _lastSavePosition;
  set lastSavePosition(int? value) {
    _lastSavePosition = value;
  }

  static const Duration _saveProgressInterval = Duration(seconds: 10);

  Duration? _resumeStartAt;
  Duration? get resumeStartAt => _resumeStartAt;
  set resumeStartAt(Duration? value) {
    _resumeStartAt = value;
  }

  bool _isWebFullscreen = false;
  bool get isWebFullscreen => _isWebFullscreen;
  set isWebFullscreen(bool value) {
    _isWebFullscreen = value;
    notifyListeners();
  }

  bool _isLandscapeLocked = false;
  bool get isLandscapeLocked => _isLandscapeLocked;
  set isLandscapeLocked(bool value) {
    _isLandscapeLocked = value;
  }

  final GlobalKey _playerKey = GlobalKey();
  GlobalKey get playerKey => _playerKey;

  int _loadGeneration = 0;
  int get loadGeneration => _loadGeneration;

  bool isActiveLoad(int generation) =>
      mounted && generation == _loadGeneration;

  Duration? get currentPosition {
    if (_isCasting) {
      return _dlnaCurrentPosition;
    } else {
      return _videoPlayerController?.currentPosition;
    }
  }

  void setup(TickerProvider vsync) {
    _refreshAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: vsync,
    );
    _loadingAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: vsync,
    )..repeat();
    _textAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: vsync,
    )..repeat(reverse: true);
    _switchLoadingAnimationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: vsync,
    )..repeat();
  }

  @override
  void dispose() {
    _refreshAnimationController.dispose();
    _loadingAnimationController.dispose();
    _textAnimationController.dispose();
    _switchLoadingAnimationController.dispose();
    _episodesScrollController.dispose();
    _sourcesScrollController.dispose();
    super.dispose();
  }

  void setPortraitOrientation() {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  }

  void restoreOrientation() {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
  }

  void toggleOrientationLock() {
    if (_isLandscapeLocked) {
      restoreOrientation();
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    }
    _isLandscapeLocked = !_isLandscapeLocked;
    notifyListeners();
  }

  void initParam() {
    _currentSource = source ?? '';
    _currentID = id ?? '';
    _videoTitle = title;
    _videoYear = year ?? '';
    _needPrefer = prefer != null && prefer == 'true';
    _searchTitle = stitle ?? '';
  }

  Future<void> initVideoData(BuildContext context) async {
    final loadGeneration = ++_loadGeneration;

    if (source == null && id == null && title.isEmpty && stitle == null) {
      setError('缺少必要参数');
      return;
    }

    final preferSpeedTest = await UserDataService.getPreferSpeedTest();
    if (!isActiveLoad(loadGeneration)) return;

    if (!preferSpeedTest ||
        (source != null && id != null && (prefer == null || prefer != 'true'))) {
      updateLoadingState(message: '正在获取播放源详情...', progress: 0.5, emoji: '🔍');
    } else {
      updateLoadingState(message: '正在搜索播放源...', progress: 0.33, emoji: '🔍');
    }

    initParam();

    if (source == 'shortdrama' && id != null) {
      updateLoadingState(message: '正在获取短剧详情...', progress: 0.5, emoji: '🎬');
      final detail = await ApiService.getShortDramaDetail(id!, sourceApi: sourceApi);
      if (!isActiveLoad(loadGeneration)) return;
      if (detail == null) {
        setError('未找到短剧详情');
        return;
      }
      _currentDetail = detail;
      _allSources = [detail];
      setInfosByDetail(detail, context);

      checkFavoriteStatus();

      int playEpisodeIndex = 0;
      int playTime = 0;
      if (mounted) {
        final allPlayRecords = await PageCacheService().getPlayRecords(context);
        if (!isActiveLoad(loadGeneration)) return;
        if (allPlayRecords.success && allPlayRecords.data != null) {
          final matchingRecords = allPlayRecords.data!.where(
              (r) => r.id == id && r.source == 'shortdrama');
          if (matchingRecords.isNotEmpty) {
            final record = matchingRecords.first;
            playEpisodeIndex = record.index - 1;
            playTime = record.playTime;
          }
        }
      }

      startPlay(playEpisodeIndex, playTime);
      Future.delayed(const Duration(seconds: 1), () {
        if (isActiveLoad(loadGeneration) && mounted) {
          _isLoading = false;
          notifyListeners();
        }
      });
      return;
    }

    _allSources = await fetchSourcesData(
        (_searchTitle.isNotEmpty) ? _searchTitle : _videoTitle);
    if (!isActiveLoad(loadGeneration)) return;

    if (_currentSource.isNotEmpty &&
        _currentID.isNotEmpty &&
        !_allSources.any((s) =>
            s.source == _currentSource && s.id == _currentID)) {
      _allSources = await fetchSourceDetail(_currentSource, _currentID);
      if (!isActiveLoad(loadGeneration)) return;
    }
    if (_allSources.isEmpty) {
      setError('未找到匹配结果');
      return;
    }
    _currentDetail = _allSources.first;
    if (_currentSource.isNotEmpty && _currentID.isNotEmpty && !_needPrefer) {
      final target = _allSources.where(
          (s) => s.source == _currentSource && s.id == _currentID);
      _currentDetail = target.isNotEmpty ? target.first : null;
    }
    if (_currentDetail == null) {
      setError('未找到匹配结果');
      return;
    }

    if ((_currentSource.isEmpty || _currentID.isEmpty || _needPrefer) &&
        preferSpeedTest) {
      updateLoadingState(message: '正在优选最佳播放源...', progress: 0.66, emoji: '⚡');
      _currentDetail = await preferBestSource();
      if (!isActiveLoad(loadGeneration)) return;
      if (_currentDetail == null) {
        setError('优选后未找到可用源');
        return;
      }
    }
    setInfosByDetail(_currentDetail!, context);

    checkFavoriteStatus();

    int playEpisodeIndex = 0;
    int playTime = 0;
    if (mounted) {
      final allPlayRecords = await PageCacheService().getPlayRecords(context);
      if (!isActiveLoad(loadGeneration)) return;
      if (allPlayRecords.success && allPlayRecords.data != null) {
        final matchingRecords = allPlayRecords.data!.where((record) =>
            record.id == _currentID && record.source == _currentSource);
        if (matchingRecords.isNotEmpty) {
          playEpisodeIndex = matchingRecords.first.index - 1;
          playTime = matchingRecords.first.playTime;
        }
      }
    }

    updateLoadingState(message: '准备就绪，即将开始播放...', progress: 1.0, emoji: '✨');

    if (mounted) {
      _showSwitchLoadingOverlay = true;
      _switchLoadingMessage = '视频加载中...';
      notifyListeners();
    }

    Future.delayed(const Duration(seconds: 1), () {
      if (isActiveLoad(loadGeneration)) {
        _isLoading = false;
        notifyListeners();
      }
    });

    if (!isActiveLoad(loadGeneration)) return;
    startPlay(playEpisodeIndex, playTime);
  }

  void startPlay(int targetIndex, int playTime, {BuildContext? context}) {
    if (_currentDetail == null || _currentDetail!.episodes.isEmpty) {
      if (mounted) {
        _errorMessage = '无可用播放集数';
        _showError = true;
        notifyListeners();
      }
      return;
    }
    if (targetIndex >= _currentDetail!.episodes.length) {
      targetIndex = 0;
    }
    if (mounted) {
      _currentEpisodeIndex = targetIndex;
      notifyListeners();
    }
    _lastSavePosition = null;
    final startAt = playTime > 0 ? Duration(seconds: playTime) : null;
    _resumeStartAt = startAt;
    updateVideoUrl(_currentDetail!.episodes[targetIndex], startAt: null);
    scrollToCurrentEpisode(context);
  }

  void setInfosByDetail(SearchResult detail, [BuildContext? context]) {
    _videoTitle = detail.title;
    _videoDesc = detail.desc ?? '';
    _videoYear = detail.year;
    _videoCover = detail.poster;
    _currentSource = detail.source;
    _currentID = detail.id;
    _totalEpisodes = detail.episodes.length;

    int oldVideoDoubanID = _videoDoubanID;

    if (detail.doubanId != null && detail.doubanId! > 0) {
      _videoDoubanID = detail.doubanId!;
    } else {
      Map<int, int> doubanIDCount = {};
      for (var result in _allSources) {
        int? tmpDoubanID = result.doubanId;
        if (tmpDoubanID == null || tmpDoubanID == 0) {
          continue;
        }
        doubanIDCount[tmpDoubanID] = (doubanIDCount[tmpDoubanID] ?? 0) + 1;
      }
      _videoDoubanID = doubanIDCount.entries.isEmpty
          ? 0
          : doubanIDCount.entries
              .reduce((a, b) => a.value > b.value ? a : b)
              .key;
    }

    if (_videoDoubanID != oldVideoDoubanID && _videoDoubanID > 0) {
      fetchDoubanDetails(context);
    }

    notifyListeners();
  }

  Future<void> fetchDoubanDetails([BuildContext? context]) async {
    if (_videoDoubanID <= 0) {
      _doubanDetails = null;
      return;
    }

    try {
      final requestDoubanId = _videoDoubanID.toString();
      final response = await DoubanService.getDoubanDetails(
        context ?? (throw Exception('Context required for fetchDoubanDetails')),
        doubanId: requestDoubanId,
      );
      if (!mounted || _videoDoubanID.toString() != requestDoubanId) return;

      if (response.success && response.data != null) {
        _doubanDetails = response.data;
        if ((_videoDesc.isEmpty || _videoDesc == '暂无简介') &&
            response.data!.summary != null &&
            response.data!.summary!.isNotEmpty) {
          _videoDesc = response.data!.summary!;
        }
        notifyListeners();
      } else {
        debugPrint('获取豆瓣详情失败: ${response.message}');
      }
    } catch (e) {
      debugPrint('获取豆瓣详情异常: $e');
    }
  }

  Future<SearchResult> preferBestSource() async {
    final m3u8Service = M3U8Service();
    final result = await m3u8Service.preferBestSource(_allSources);

    final speedResults = result['allSourcesSpeed'] as Map<String, dynamic>;
    _allSourcesSpeed = {};
    for (final entry in speedResults.entries) {
      final speedData = entry.value as Map<String, dynamic>;
      _allSourcesSpeed[entry.key] = SourceSpeed(
        quality: speedData['quality'] as String,
        loadSpeed: speedData['loadSpeed'] as String,
        pingTime: speedData['pingTime'] as String,
      );
    }

    return result['bestSource'] as SearchResult;
  }

  void saveProgress({bool force = false, required String scene, required BuildContext context}) {
    try {
      if (_currentDetail == null) return;

      Duration? currentPositionVal;
      Duration? duration;

      if (_isCasting) {
        currentPositionVal = _dlnaCurrentPosition;
        duration = _dlnaCurrentDuration;
      } else {
        if (_videoPlayerController == null) return;
        currentPositionVal = _videoPlayerController!.currentPosition;
        duration = _videoPlayerController!.duration;
      }

      if (currentPositionVal == null || duration == null) return;

      if (currentPositionVal.inSeconds < 1) {
        return;
      }

      final playTime = currentPositionVal.inSeconds;
      final totalTime = duration.inSeconds;
      if (!force) {
        final now = DateTime.now();
        if (_lastSaveTime != null &&
            now.difference(_lastSaveTime!) < _saveProgressInterval) {
          return;
        }
        if (_lastSavePosition != null && playTime == _lastSavePosition!) {
          return;
        }
      }

      _lastSaveTime = DateTime.now();
      _lastSavePosition = playTime;

      final currentIDSnapshot = _currentID;
      final currentSourceSnapshot = _currentSource;
      final videoTitleSnapshot = _videoTitle;
      final videoYearSnapshot = _videoYear;
      final videoCoverSnapshot = _videoCover;
      final currentEpisodeIndexSnapshot = _currentEpisodeIndex;
      final totalEpisodesSnapshot = _totalEpisodes;
      final searchTitleSnapshot = _searchTitle;
      final sourceNameSnapshot = _currentDetail?.sourceName ?? _currentSource;

      final playRecord = PlayRecord(
        id: currentIDSnapshot,
        source: currentSourceSnapshot,
        title: videoTitleSnapshot,
        sourceName: sourceNameSnapshot,
        year: videoYearSnapshot,
        cover: videoCoverSnapshot,
        index: currentEpisodeIndexSnapshot + 1,
        totalEpisodes: totalEpisodesSnapshot,
        playTime: playTime,
        totalTime: totalTime,
        saveTime: DateTime.now().millisecondsSinceEpoch,
        searchTitle: searchTitleSnapshot,
      );

      PageCacheService().savePlayRecord(playRecord, context).then((_) {
        debugPrint(
            '保存播放进度 [场景: $scene]: source: $currentSourceSnapshot, id: $currentIDSnapshot, 第${currentEpisodeIndexSnapshot + 1}集, 时间: ${playTime}秒');
      }).catchError((e) {
        debugPrint('保存播放进度失败 [场景: $scene]: $e');
      });
    } catch (e) {
      debugPrint('保存播放进度失败: $e');
    }
  }

  void setError(String message) {
    if (mounted) {
      _errorMessage = message;
      _showError = true;
      _isLoading = false;
      notifyListeners();
    }
  }

  void hideError() {
    if (mounted) {
      _showError = false;
      _errorMessage = null;
      notifyListeners();
    }
  }

  void updateLoadingState({String? message, double? progress, String? emoji}) {
    if (!mounted) return;
    if (message != null) _loadingMessage = message;
    if (progress != null) _loadingProgress = progress.clamp(0.0, 1.0);
    if (emoji != null) _loadingEmoji = emoji;
    notifyListeners();
  }

  Future<void> updateVideoUrl(String newUrl, {Duration? startAt}) async {
    debugPrint("newUrl: $newUrl, startAt: $startAt");
    try {
      String finalUrl = newUrl;

      if (newUrl.startsWith('shortdrama:')) {
        final parts = newUrl.split(':');
        if (parts.length >= 3) {
          final dramaId = parts[1];
          final episodeNum = int.tryParse(parts[2]) ?? 1;
          updateLoadingState(message: '正在解析短剧播放地址...');
          final resolvedUrl = await ApiService.parseShortDramaEpisode(
            dramaId,
            episodeNum,
            sourceApi: sourceApi,
          );
          if (resolvedUrl != null) {
            finalUrl = resolvedUrl;
          } else {
            throw Exception('无法解析短剧播放地址');
          }
        }
      }

      final m3u8ProxyUrl = await UserDataService.getM3u8ProxyUrl();

      if (m3u8ProxyUrl.isNotEmpty && !finalUrl.startsWith('http')) {
        final encodedUrl = Uri.encodeComponent(finalUrl);
        finalUrl = '$m3u8ProxyUrl$encodedUrl';
        debugPrint("使用 M3U8 代理: $finalUrl");
      } else if (finalUrl.startsWith('http')) {
        debugPrint("直接使用URL: $finalUrl");
      }

      if (_isCasting) {
        return;
      } else {
        await _videoPlayerController?.updateDataSource(finalUrl,
            startAt: startAt);
      }
    } catch (e) {
      debugPrint("播放错误: $e");
      if (mounted) {
        _errorMessage = '播放失败: $e';
        _showError = true;
        notifyListeners();
      }
    }
  }

  Future<void> seekToProgress(Duration position) async {
    try {
      await _videoPlayerController?.seekTo(position);
    } catch (e) {
    }
  }

  Future<void> seekToSeconds(double seconds) async {
    await seekToProgress(Duration(seconds: seconds.round()));
  }

  void onVideoPlayerReady() {
    if (!mounted) return;
    debugPrint('Video player is ready!');
    _showSwitchLoadingOverlay = false;
    notifyListeners();
    _lastSaveTime = null;
    if (_resumeStartAt != null) {
      final tmpStartAt = _resumeStartAt;
      _resumeStartAt = null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && tmpStartAt != null) {
          seekToProgress(tmpStartAt);
        }
      });
    }
  }

  void checkFavoriteStatus() {
    if (_currentSource.isNotEmpty && _currentID.isNotEmpty) {
      final cacheService = PageCacheService();
      final isFavorited =
          cacheService.isFavoritedSync(_currentSource, _currentID);
      if (mounted) {
        _isFavorite = isFavorited;
        notifyListeners();
      }
    }
  }

  Future<void> toggleFavorite(BuildContext context) async {
    if (_currentSource.isEmpty || _currentID.isEmpty) return;

    final cacheService = PageCacheService();

    if (_isFavorite) {
      final result =
          await cacheService.removeFavorite(_currentSource, _currentID, context);
      if (!mounted) return;
      if (result.success) {
        _isFavorite = false;
        notifyListeners();
      }
    } else {
      final favoriteData = {
        'cover': _videoCover,
        'save_time': DateTime.now().millisecondsSinceEpoch,
        'source_name': _currentDetail?.sourceName ?? '',
        'title': _videoTitle,
        'total_episodes': _totalEpisodes,
        'year': _videoYear,
      };

      final result = await cacheService.addFavorite(
          _currentSource, _currentID, favoriteData, context);
      if (!mounted) return;
      if (result.success) {
        _isFavorite = true;
        notifyListeners();
      }
    }
  }

  void toggleEpisodesOrder() {
    _isEpisodesReversed = !_isEpisodesReversed;
    notifyListeners();
  }

  Future<void> switchSource(SearchResult newSource, int currentEpisode, int currentProgress, BuildContext context) async {
    if (!mounted) return;

    _showSwitchLoadingOverlay = true;
    _switchLoadingMessage = '切换播放源...';
    notifyListeners();

    final oldSource = _currentSource;
    final oldID = _currentID;

    _currentDetail = newSource;
    _currentSource = newSource.source;
    _currentID = newSource.id;
    _currentEpisodeIndex = currentEpisode;
    _totalEpisodes = newSource.episodes.length;
    _isEpisodesReversed = false;
    notifyListeners();

    if (oldSource.isNotEmpty &&
        oldID.isNotEmpty &&
        (oldSource != newSource.source || oldID != newSource.id)) {
      try {
        await PageCacheService().deletePlayRecord(oldSource, oldID, context);
        if (!mounted) return;
        debugPrint('删除旧源播放记录: $oldSource+$oldID');
      } catch (e) {
        debugPrint('删除旧源播放记录失败: $e');
        if (!mounted) return;
      }
    }

    setInfosByDetail(newSource, context);
    checkFavoriteStatus();
    startPlay(currentEpisode, currentProgress);
  }

  void scrollToCurrentEpisode([BuildContext? context]) {
    performScrollToCurrentEpisode(context, force: true);
  }

  void scrollToCurrentSource([BuildContext? context]) {
    performScrollToCurrentSource(context, force: true);
  }

  bool performScrollToCurrentEpisode(BuildContext? context, {bool force = false}) {
    if (!mounted || _currentDetail == null) return false;
    if (!_episodesScrollController.hasClients) {
      if (force) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          performScrollToCurrentEpisode(context, force: false);
        });
      }
      return false;
    }
    if (context == null) return false;

    final screenWidth = MediaQuery.of(context).size.width;
    final effectiveWidth = (_isTablet && !_isPortraitTablet)
        ? screenWidth * 0.65
        : screenWidth;

    const listViewPadding = 16.0;
    const itemMargin = 6.0;
    final availableWidth =
        effectiveWidth - (listViewPadding * 2);
    final cardsPerView = _isTablet ? 6.2 : 3.2;
    final buttonWidth = (availableWidth / cardsPerView) - itemMargin;

    final targetIndex = _isEpisodesReversed
        ? _currentDetail!.episodes.length - 1 - _currentEpisodeIndex
        : _currentEpisodeIndex;

    final visibleAreaWidth = effectiveWidth - (listViewPadding * 2);
    final visibleCenter = visibleAreaWidth / 2;
    final itemCenter = buttonWidth / 2;

    final targetOffset = (targetIndex * (buttonWidth + itemMargin)) -
        (visibleCenter - itemCenter - listViewPadding);

    final maxScrollExtent = _episodesScrollController.position.maxScrollExtent;
    final clampedOffset = targetOffset.clamp(0.0, maxScrollExtent);

    _episodesScrollController.animateTo(
      clampedOffset,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
    return true;
  }

  bool performScrollToCurrentSource(BuildContext? context, {bool force = false}) {
    if (!mounted || _currentDetail == null) return false;
    if (!_sourcesScrollController.hasClients) {
      if (force) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          performScrollToCurrentSource(context, force: false);
        });
      }
      return false;
    }
    if (context == null) return false;

    final currentSourceIndex = _allSources.indexWhere(
        (s) => s.source == _currentSource && s.id == _currentID);

    if (currentSourceIndex == -1) return false;

    final screenWidth = MediaQuery.of(context).size.width;
    final effectiveWidth = (_isTablet && !_isPortraitTablet)
        ? screenWidth * 0.65
        : screenWidth;

    const listViewPadding = 16.0;
    const itemMargin = 6.0;
    final availableWidth =
        effectiveWidth - (listViewPadding * 2);
    final cardsPerView = _isTablet ? 6.2 : 3.2;
    final cardWidth = (availableWidth / cardsPerView) - itemMargin;

    final visibleAreaWidth = effectiveWidth - (listViewPadding * 2);
    final visibleCenter = visibleAreaWidth / 2;
    final itemCenter = cardWidth / 2;

    final targetOffset = (currentSourceIndex * (cardWidth + itemMargin)) -
        (visibleCenter - itemCenter - listViewPadding);

    final maxScrollExtent = _sourcesScrollController.position.maxScrollExtent;
    final clampedOffset = targetOffset.clamp(0.0, maxScrollExtent);

    _sourcesScrollController.animateTo(
      clampedOffset,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
    return true;
  }

  Future<void> refreshSourcesSpeed({void Function()? onUpdate}) async {
    if (_allSources.isEmpty) return;

    if (onUpdate == null) {
      _isRefreshing = true;
      _refreshAnimationController.repeat();
      notifyListeners();
    }

    try {
      _allSourcesSpeed = {};
      notifyListeners();
      onUpdate?.call();

      final m3u8Service = M3U8Service();
      await m3u8Service.testSourcesWithCallback(
        _allSources,
        (String sourceId, Map<String, dynamic> speedData) {
          _allSourcesSpeed[sourceId] = SourceSpeed(
            quality: speedData['quality'] as String,
            loadSpeed: speedData['loadSpeed'] as String,
            pingTime: speedData['pingTime'] as String,
          );
          notifyListeners();
          onUpdate?.call();
        },
        timeout: const Duration(seconds: 10),
      );
    } catch (e) {
    } finally {
      if (onUpdate == null) {
        _isRefreshing = false;
        _refreshAnimationController.stop();
        _refreshAnimationController.reset();
        notifyListeners();
      }
    }
  }

  Future<List<SearchResult>> fetchSourceDetail(String source, String id) async {
    final isLocalSearch = await UserDataService.getLocalSearch();
    if (isLocalSearch) {
      return await SearchService.getDetailSync(source, id);
    } else {
      return await ApiService.fetchSourceDetail(source, id);
    }
  }

  Future<List<SearchResult>> fetchSourcesData(String query) async {
    final isLocalSearch = await UserDataService.getLocalSearch();
    List<SearchResult> results;
    if (isLocalSearch) {
      results = await SearchService.searchSync(query);
    } else {
      results = await ApiService.fetchSourcesData(query);
    }

    return results.where((result) {
      final titleMatch = result.title.replaceAll(' ', '').toLowerCase() ==
          (title.replaceAll(' ', '').toLowerCase());

      final yearMatch = year == null ||
          result.year.toLowerCase() == year!.toLowerCase();

      bool typeMatch = true;
      if (stype != null) {
        if (stype == 'tv') {
          typeMatch = result.episodes.length > 1;
        } else if (stype == 'movie') {
          typeMatch = result.episodes.length == 1;
        }
      }

      return titleMatch && yearMatch && typeMatch;
    }).toList();
  }
}
