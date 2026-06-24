import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class DownloadTask {
  final String id;
  final String title;
  final String url;
  final String? cover;
  double progress;
  String status; // 'pending', 'downloading', 'completed', 'failed'
  String? filePath;
  int? fileSize;

  DownloadTask({
    required this.id,
    required this.title,
    required this.url,
    this.cover,
    this.progress = 0,
    this.status = 'pending',
    this.filePath,
    this.fileSize,
  });
}

class DownloadManager extends ChangeNotifier {
  final List<DownloadTask> _tasks = [];
  bool _isDownloading = false;

  List<DownloadTask> get tasks => List.unmodifiable(_tasks);
  bool get isDownloading => _isDownloading;

  // 添加下载任务
  Future<void> addTask({
    required String id,
    required String title,
    required String url,
    String? cover,
  }) async {
    // 检查是否已存在
    if (_tasks.any((t) => t.id == id)) return;

    final task = DownloadTask(
      id: id,
      title: title,
      url: url,
      cover: cover,
    );

    _tasks.add(task);
    notifyListeners();

    // 开始下载
    _startDownload(task);
  }

  // 删除下载任务
  Future<void> removeTask(String id) async {
    final task = _tasks.firstWhere((t) => t.id == id);
    
    // 删除文件
    if (task.filePath != null) {
      try {
        final file = File(task.filePath!);
        if (await file.exists()) {
          await file.delete();
        }
      } catch (e) {
        debugPrint('Failed to delete file: $e');
      }
    }

    _tasks.removeWhere((t) => t.id == id);
    notifyListeners();
  }

  // 开始下载
  Future<void> _startDownload(DownloadTask task) async {
    setState(() {
      task.status = 'downloading';
    });

    try {
      final directory = await getApplicationDocumentsDirectory();
      final filePath = '${directory.path}/downloads/${task.id}.mp4';
      
      // 创建下载目录
      final downloadDir = Directory('${directory.path}/downloads');
      if (!await downloadDir.exists()) {
        await downloadDir.create(recursive: true);
      }

      // 下载文件
      final response = await http.send(
        http.Request('GET', Uri.parse(task.url)),
      );

      // 获取文件大小
      final contentLength = response.contentLength;
      if (contentLength != null) {
        setState(() {
          task.fileSize = contentLength;
        });
      }

      // 写入文件
      final file = File(filePath);
      final sink = file.openWrite();
      int bytesReceived = 0;

      await for (final chunk in response.stream) {
        sink.add(chunk);
        bytesReceived += chunk.length;

        if (contentLength != null) {
          setState(() {
            task.progress = bytesReceived / contentLength;
          });
        }
      }

      await sink.close();

      setState(() {
        task.status = 'completed';
        task.progress = 1.0;
        task.filePath = filePath;
      });

      notifyListeners();
    } catch (e) {
      setState(() {
        task.status = 'failed';
      });
      debugPrint('Download failed: $e');
    }
  }

  // 获取已下载的文件列表
  Future<List<DownloadTask>> getCompletedTasks() async {
    return _tasks.where((t) => t.status == 'completed').toList();
  }

  // 获取总下载大小
  Future<int> getTotalSize() async {
    int total = 0;
    for (final task in _tasks) {
      if (task.filePath != null) {
        try {
          final file = File(task.filePath!);
          if (await file.exists()) {
            total += await file.length();
          }
        } catch (e) {
          // ignore
        }
      }
    }
    return total;
  }

  // 清理所有下载
  Future<void> clearAll() async {
    for (final task in List.from(_tasks)) {
      await removeTask(task.id);
    }
  }
}
