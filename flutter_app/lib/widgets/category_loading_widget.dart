import 'package:flutter/material.dart';

class CategoryLoadingWidget extends StatefulWidget {
  final String message;
  final String emoji;

  const CategoryLoadingWidget({
    super.key,
    this.message = '加载中...',
    this.emoji = '🎬',
  });

  @override
  State<CategoryLoadingWidget> createState() => _CategoryLoadingWidgetState();
}

class _CategoryLoadingWidgetState extends State<CategoryLoadingWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFF0A0A0A),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Transform.rotate(
                  angle: _controller.value * 2 * 3.14159,
                  child: child,
                );
              },
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  gradient: SweepGradient(
                    colors: const [
                      Color(0xFFf4c24d),
                      Color(0xFFe88d30),
                      Color(0xFFf4c24d),
                    ],
                    transform: GradientRotation(0),
                  ),
                  shape: BoxShape.circle,
                ),
                padding: const EdgeInsets.all(4),
                child: Container(
                  decoration: const BoxDecoration(
                    color: Color(0xFF0A0A0A),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      widget.emoji,
                      style: const TextStyle(fontSize: 28),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Opacity(
                  opacity: 0.6 + (_controller.value * 0.4),
                  child: child,
                );
              },
              child: Text(
                widget.message,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            const SizedBox(height: 12),
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                final dots = '.' * ((_controller.value * 4).floor() + 1);
                return Opacity(
                  opacity: 0.5,
                  child: SizedBox(
                    width: 40,
                    child: Text(
                      dots,
                      style: const TextStyle(
                        color: Colors.white38,
                        fontSize: 20,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
