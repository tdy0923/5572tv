import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/video_provider.dart';
import '../widgets/short_drama_player.dart';

class ShortDramaScreen extends StatefulWidget {
  const ShortDramaScreen({super.key});

  @override
  State<ShortDramaScreen> createState() => _ShortDramaScreenState();
}

class _ShortDramaScreenState extends State<ShortDramaScreen> {
  int _currentDramaIndex = 0;
  int _currentEpisodeIndex = 0;
  List<Map<String, dynamic>> _dramas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDramas();
  }

  Future<void> _loadDramas() async {
    try {
      final provider = context.read<VideoProvider>();
      final categories = await provider.getShortDramaCategories();
      if (categories.isNotEmpty) {
        final data = await provider.getShortDramaList(
          categories.first['id'] ?? 0,
        );
        setState(() {
          _dramas = List<Map<String, dynamic>>.from(data['list'] ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Failed to load dramas: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    if (_dramas.isEmpty) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Text('暂无短剧内容', style: TextStyle(color: Colors.white)),
        ),
      );
    }

    final drama = _dramas[_currentDramaIndex];
    final episodes = List<String>.generate(
      drama['episode_count'] ?? 10,
      (i) => drama['play_url'] ?? '',
    );
    final episodeTitles = List<String>.generate(
      drama['episode_count'] ?? 10,
      (i) => '第${i + 1}集',
    );

    return Scaffold(
      backgroundColor: Colors.black,
      body: ShortDramaVerticalPlayer(
        episodes: episodes,
        episodesTitles: episodeTitles,
        currentIndex: _currentEpisodeIndex,
        onEpisodeChange: (index) {
          setState(() {
            _currentEpisodeIndex = index;
          });
        },
        title: drama['name'] ?? '短剧',
      ),
    );
  }
}
