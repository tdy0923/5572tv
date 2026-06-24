import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class ShortDramaVerticalPlayer extends StatefulWidget {
  final List<String> episodes;
  final List<String> episodesTitles;
  final int currentIndex;
  final Function(int) onEpisodeChange;
  final String title;

  const ShortDramaVerticalPlayer({
    super.key,
    required this.episodes,
    required this.episodesTitles,
    required this.currentIndex,
    required this.onEpisodeChange,
    required this.title,
  });

  @override
  State<ShortDramaVerticalPlayer> createState() => _ShortDramaVerticalPlayerState();
}

class _ShortDramaVerticalPlayerState extends State<ShortDramaVerticalPlayer> {
  VideoPlayerController? _controller;
  bool _showControls = true;
  bool _isMuted = false;
  bool _liked = false;

  @override
  void initState() {
    super.initState();
    _playCurrentEpisode();
  }

  @override
  void didUpdateWidget(ShortDramaVerticalPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentIndex != widget.currentIndex) {
      _playCurrentEpisode();
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _playCurrentEpisode() async {
    if (widget.currentIndex < 0 || widget.currentIndex >= widget.episodes.length) return;

    try {
      _controller?.dispose();
      final episodeUrl = widget.episodes[widget.currentIndex];

      _controller = VideoPlayerController.networkUrl(Uri.parse(episodeUrl));
      await _controller!.initialize();
      _controller!.play();
      _controller!.setLooping(true);

      setState(() {});
    } catch (e) {
      debugPrint('Failed to play episode: $e');
    }
  }

  void _handleVerticalSwipe(DragEndDetails details) {
    final velocity = details.primaryVelocity ?? 0;

    if (velocity < -500 && widget.currentIndex < widget.episodes.length - 1) {
      // 上滑 = 下一集
      widget.onEpisodeChange(widget.currentIndex + 1);
    } else if (velocity > 500 && widget.currentIndex > 0) {
      // 下滑 = 上一集
      widget.onEpisodeChange(widget.currentIndex - 1);
    }
  }

  void _handleDoubleTap() {
    setState(() {
      _liked = !_liked;
    });
    // TODO: 调用收藏API
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onVerticalDragEnd: _handleVerticalSwipe,
        onDoubleTap: _handleDoubleTap,
        onTap: () {
          setState(() {
            _showControls = !_showControls;
          });
          if (_controller != null && _controller!.value.isPlaying) {
            _controller!.pause();
          } else {
            _controller?.play();
          }
        },
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 视频播放器
            Center(
              child: _controller != null && _controller!.value.isInitialized
                  ? AspectRatio(
                      aspectRatio: _controller!.value.aspectRatio,
                      child: VideoPlayer(_controller!),
                    )
                  : const CircularProgressIndicator(color: Colors.white),
            ),

            // 顶部信息栏
            if (_showControls)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    MediaQuery.of(context).padding.top + 16,
                    16,
                    16,
                  ),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.black54, Colors.transparent],
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.currentIndex < widget.episodesTitles.length
                            ? widget.episodesTitles[widget.currentIndex]
                            : '第 ${widget.currentIndex + 1} 集',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // 右侧操作栏
            if (_showControls)
              Positioned(
                right: 12,
                top: MediaQuery.of(context).size.height * 0.3,
                child: Column(
                  children: [
                    _buildActionButton(
                      icon: _liked ? Icons.favorite : Icons.favorite_border,
                      label: '收藏',
                      color: _liked ? Colors.red : Colors.white,
                      onTap: _handleDoubleTap,
                    ),
                    const SizedBox(height: 20),
                    _buildActionButton(
                      icon: Icons.share,
                      label: '分享',
                      onTap: () {},
                    ),
                    const SizedBox(height: 20),
                    _buildActionButton(
                      icon: Icons.download,
                      label: '下载',
                      onTap: () {},
                    ),
                    const SizedBox(height: 20),
                    _buildActionButton(
                      icon: _isMuted ? Icons.volume_off : Icons.volume_up,
                      label: _isMuted ? '取消静音' : '静音',
                      onTap: () {
                        setState(() {
                          _isMuted = !_isMuted;
                        });
                        _controller?.setVolume(_isMuted ? 0 : 1);
                      },
                    ),
                  ],
                ),
              ),

            // 底部信息栏
            if (_showControls)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    MediaQuery.of(context).padding.bottom + 16,
                  ),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [Colors.black54, Colors.transparent],
                    ),
                  ),
                  child: Column(
                    children: [
                      // 进度条
                      if (_controller != null && _controller!.value.isInitialized)
                        VideoProgressIndicator(
                          _controller!,
                          allowScrubbing: true,
                          colors: const VideoProgressColors(
                            playedColor: Colors.green,
                            bufferedColor: Colors.white30,
                            backgroundColor: Colors.white12,
                          ),
                        ),
                      const SizedBox(height: 8),
                      // 集数信息
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${widget.currentIndex + 1} / ${widget.episodes.length}',
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                          ),
                          Text(
                            widget.currentIndex < widget.episodesTitles.length
                                ? widget.episodesTitles[widget.currentIndex]
                                : '',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

            // 点赞动画
            if (_liked)
              const Center(
                child: Icon(
                  Icons.favorite,
                  color: Colors.red,
                  size: 100,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    Color color = Colors.white,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontSize: 10),
          ),
        ],
      ),
    );
  }
}
