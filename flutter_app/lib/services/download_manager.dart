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
  final bool _isDownloading = false;

  List<DownloadTask> get tasks => List.unmodifiable(_tasks);
  bool get isDownloading => _isDownloading;

  Future<void> addTask({
    required String id,
    required String title,
    required String url,
    String? cover,
  }) async {
    if (_tasks.any((t) => t.id == id)) return;

    final task = DownloadTask(
      id: id,
      title: title,
      url: url,
      cover: cover,
    );

    _tasks.add(task);
    notifyListeners();
    _startDownload(task);
  }

  Future<void> removeTask(String id) async {
    final task = _tasks.firstWhere((t) => t.id == id);

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

  Future<void> _startDownload(DownloadTask task) async {
    task.status = 'downloading';
    notifyListeners();

    try {
      final directory = await getApplicationDocumentsDirectory();
      final filePath = '${directory.path}/downloads/${task.id}.mp4';

      final downloadDir = Directory('${directory.path}/downloads');
      if (!await downloadDir.exists()) {
        await downloadDir.create(recursive: true);
      }

      final client = http.Client();
      final request = http.Request('GET', Uri.parse(task.url));
      final response = await client.send(request);

      final contentLength = response.contentLength;
      if (contentLength != null) {
        task.fileSize = contentLength;
        notifyListeners();
      }

      final file = File(filePath);
      final sink = file.openWrite();
      int bytesReceived = 0;

      await for (final chunk in response.stream) {
        sink.add(chunk);
        bytesReceived += chunk.length;

        if (contentLength != null) {
          task.progress = bytesReceived / contentLength;
        }
      }

      client.close();

      await sink.close();

      task.status = 'completed';
      task.progress = 1.0;
      task.filePath = filePath;
      notifyListeners();
    } catch (e) {
      task.status = 'failed';
      notifyListeners();
      debugPrint('Download failed: $e');
    }
  }

  Future<List<DownloadTask>> getCompletedTasks() async {
    return _tasks.where((t) => t.status == 'completed').toList();
  }

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

  Future<void> clearAll() async {
    for (final task in List.from(_tasks)) {
      await removeTask(task.id);
    }
  }
}
