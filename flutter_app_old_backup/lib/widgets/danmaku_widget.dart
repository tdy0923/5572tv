import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

class DanmakuWidget extends StatefulWidget {
  final List<DanmakuItem> items;
  final bool enabled;

  const DanmakuWidget({
    super.key,
    required this.items,
    this.enabled = true,
  });

  @override
  State<DanmakuWidget> createState() => _DanmakuWidgetState();
}

class DanmakuItem {
  final String text;
  final Color color;
  final double time;

  DanmakuItem({
    required this.text,
    this.color = Colors.white,
    this.time = 0,
  });
}

class _DanmakuWidgetState extends State<DanmakuWidget> {
  final List<_DanmakuEntry> _entries = [];
  int _nextId = 0;

  @override
  void initState() {
    super.initState();
    _startDanmakuLoop();
  }

  @override
  void didUpdateWidget(DanmakuWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.enabled && oldWidget.enabled) {
      _entries.clear();
    }
  }

  void _startDanmakuLoop() {
    Timer.periodic(const Duration(milliseconds: 100), (timer) {
      if (!widget.enabled || !mounted) {
        timer.cancel();
        return;
      }

      setState(() {
        // 移除已离开屏幕的弹幕
        _entries.removeWhere((entry) => entry.position > 1.2);

        // 添加新弹幕
        for (final item in widget.items) {
          if (!_entries.any((e) => e.text == item.text && e.startTime == item.time)) {
            _entries.add(_DanmakuEntry(
              id: _nextId++,
              text: item.text,
              color: item.color,
              startTime: item.time,
              position: -0.2,
              speed: 0.005 + Random().nextDouble() * 0.003,
            ));
          }
        }

        // 更新位置
        for (final entry in _entries) {
          entry.position += entry.speed;
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) return const SizedBox.shrink();

    return Stack(
      children: _entries.map((entry) {
        return Positioned(
          top: entry.id % 5 * 40.0 + 10,
          left: entry.position * MediaQuery.of(context).size.width,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.5),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              entry.text,
              style: TextStyle(
                color: entry.color,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                shadows: [
                  Shadow(
                    color: Colors.black.withOpacity(0.5),
                    blurRadius: 2,
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _DanmakuEntry {
  final int id;
  final String text;
  final Color color;
  final double startTime;
  double position;
  final double speed;

  _DanmakuEntry({
    required this.id,
    required this.text,
    required this.color,
    required this.startTime,
    required this.position,
    required this.speed,
  });
}
