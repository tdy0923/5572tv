import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/theme_service.dart';
import '../models/search_result.dart';
import '../models/video_info.dart';
import '../widgets/video_card.dart';
import 'player_screen.dart';
import '../utils/device_utils.dart';
import '../widgets/tv_remote_adapter.dart';

class ShortDramaScreen extends StatefulWidget {
  const ShortDramaScreen({super.key});

  @override
  State<ShortDramaScreen> createState() => _ShortDramaScreenState();
}

class _ShortDramaScreenState extends State<ShortDramaScreen> {
  List<Map<String, dynamic>> _categories = [];
  List<SearchResult> _dramas = [];
  int? _selectedCategoryId;
  bool _isLoadingCategories = true;
  bool _isLoadingDramas = false;
  bool _isLoadingMore = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    setState(() {
      _isLoadingCategories = true;
      _error = null;
    });
    try {
      final categories = await ApiService.getShortDramaCategories();
      if (mounted) {
        setState(() {
          _categories = categories;
          _isLoadingCategories = false;
          if (categories.isNotEmpty) {
            _selectedCategoryId = categories.first['type_id'] as int?;
            _loadDramas(_selectedCategoryId);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingCategories = false;
          _error = '加载分类失败: $e';
        });
      }
    }
  }

  Future<void> _loadDramas(int? categoryId, {bool loadMore = false}) async {
    if (!loadMore) {
      _currentPage = 1;
      _hasMore = true;
    }
    if (loadMore && _isLoadingMore) return;
    setState(() {
      if (loadMore) {
        _isLoadingMore = true;
      } else {
        _isLoadingDramas = true;
      }
      _error = null;
    });
    try {
      final dramas = await ApiService.getShortDramaList(
        categoryId: categoryId,
        page: _currentPage,
        size: 20,
      );
      if (mounted) {
        setState(() {
          if (loadMore) {
            _currentPage++;
            _dramas.addAll(dramas);
            _isLoadingMore = false;
          } else {
            _dramas = dramas;
            _isLoadingDramas = false;
          }
          _hasMore = dramas.length >= 20;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingDramas = false;
          _isLoadingMore = false;
          _error = '加载短剧失败: $e';
        });
      }
    }
  }

  void _onCategoryChanged(int? categoryId) {
    setState(() => _selectedCategoryId = categoryId);
    _loadDramas(categoryId);
  }

  void _playDrama(SearchResult drama) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlayerScreen(
          source: 'shortdrama',
          id: drama.id,
          title: drama.title,
          year: drama.year,
          sourceApi: drama.sourceApi,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeService = context.watch<ThemeService>();
    final isTablet = DeviceUtils.isTablet(context);
    final isDark = themeService.isDarkMode;

    return TVRemoteAdapter(
      child: Column(
        children: [
          // 分类选择器
          if (!_isLoadingCategories && _categories.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildCategoryChip('全部', null, isDark),
                    ..._categories.map((cat) => _buildCategoryChip(
                          cat['type_name'] ?? '',
                          cat['type_id'] as int?,
                          isDark,
                        )),
                  ],
                ),
              ),
            ),

          // 内容区
          if (_isLoadingCategories || _isLoadingDramas)
            const Expanded(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!,
                        style: TextStyle(
                            color: isDark ? Colors.white70 : Colors.grey)),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => _loadDramas(_selectedCategoryId),
                      child: const Text('重试'),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _loadDramas(_selectedCategoryId),
                child: GridView.builder(
                  padding: EdgeInsets.all(isTablet ? 20 : 12),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: isTablet ? 5 : 3,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.62,
                  ),
                  itemCount: _dramas.length + (_hasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == _dramas.length && !_isLoadingMore) {
                      _loadDramas(_selectedCategoryId, loadMore: true);
                    }
                    if (index >= _dramas.length) {
                      return const Center(
                          child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(),
                      ));
                    }
                    final drama = _dramas[index];
                    final videoInfo = VideoInfo(
                      id: drama.id,
                      source: 'shortdrama',
                      title: drama.title,
                      sourceName: '短剧',
                      year: drama.year,
                      cover: drama.poster,
                      index: 0,
                      totalEpisodes: drama.episodes.length,
                      playTime: 0,
                      totalTime: 0,
                      saveTime: 0,
                      searchTitle: drama.title,
                    );
                    return GestureDetector(
                      onTap: () => _playDrama(drama),
                      child: VideoCard(
                        videoInfo: videoInfo,
                        from: 'shortdrama',
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String label, int? categoryId, bool isDark) {
    final isSelected = _selectedCategoryId == categoryId;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => _onCategoryChanged(categoryId),
        selectedColor: AppTheme.success,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
        backgroundColor: isDark ? AppTheme.darkBackground : Colors.grey[200],
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}
