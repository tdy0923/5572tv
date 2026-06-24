import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';

import '../providers/video_provider.dart';

class PlayerScreen extends StatefulWidget {
  final String source;
  final String id;
  final String title;
  
  const PlayerScreen({
    super.key,
    required this.source,
    required this.id,
    required this.title,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  VideoPlayerController? _controller;
  bool _isLoading = true;
  String? _error;
  List<String> _episodes = [];
  int _currentEpisode = 0;

  @override
  void initState() {
    super.initState();
    _loadVideoDetail();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _loadVideoDetail() async {
    try {
      final provider = context.read<VideoProvider>();
      final detail = await provider.getVideoDetail(widget.source, widget.id);
      
      setState(() {
        _episodes = List<String>.from(detail['episodes'] ?? []);
        _isLoading = false;
      });
      
      if (_episodes.isNotEmpty) {
        _playEpisode(0);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _playEpisode(int index) async {
    if (index < 0 || index >= _episodes.length) return;
    
    setState(() {
      _currentEpisode = index;
      _isLoading = true;
    });
    
    try {
      final episodeUrl = _episodes[index];
      
      // 如果是短剧格式，需要解析
      if (episodeUrl.startsWith('shortdrama:')) {
        // TODO: 调用解析API获取真实URL
      }
      
      _controller?.dispose();
      _controller = VideoPlayerController.networkUrl(
        Uri.parse(episodeUrl),
      );
      
      await _controller!.initialize();
      _controller!.play();
      
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(widget.title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          // 视频播放器
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.white))
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error, color: Colors.red, size: 48),
                            const SizedBox(height: 16),
                            Text(
                              _error!,
                              style: const TextStyle(color: Colors.white),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => _playEpisode(_currentEpisode),
                              child: const Text('重试'),
                            ),
                          ],
                        ),
                      )
                    : _controller != null
                        ? Center(
                            child: AspectRatio(
                              aspectRatio: _controller!.value.aspectRatio,
                              child: VideoPlayer(_controller!),
                            ),
                          )
                        : const Center(
                            child: Text(
                              '选择集数开始播放',
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
          ),
          
          // 集数选择
          if (_episodes.length > 1)
            Container(
              height: 60,
              color: Colors.grey[900],
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                itemCount: _episodes.length,
                itemBuilder: (context, index) {
                  final isSelected = index == _currentEpisode;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ChoiceChip(
                      label: Text('第${index + 1}集'),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) _playEpisode(index);
                      },
                      selectedColor: Colors.green,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : Colors.grey[300],
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
