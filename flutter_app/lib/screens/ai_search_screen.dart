import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../screens/player_screen.dart';

class AiSearchScreen extends StatefulWidget {
  const AiSearchScreen({super.key});

  @override
  State<AiSearchScreen> createState() => _AiSearchScreenState();
}

class _AiSearchScreenState extends State<AiSearchScreen> {
  final TextEditingController _controller = TextEditingController();
  List<dynamic> _results = [];
  Map<String, dynamic>? _parsed;
  bool _isLoading = false;
  bool _showResults = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _performAiSearch(String query) async {
    if (query.trim().isEmpty) return;

    setState(() {
      _isLoading = true;
      _showResults = true;
      _results = [];
      _parsed = null;
    });

    try {
      final response = await http.get(
        Uri.parse('https://www.5572.net/api/ai-search?q=${Uri.encodeComponent(query)}'),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _results = data['results'] ?? [];
          _parsed = data['parsed'];
        });
      }
    } catch (e) {
      debugPrint('AI search failed: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI 智能搜索'),
        backgroundColor: Colors.green,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 搜索栏
            TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: '用自然语言描述你想看的内容...',
                prefixIcon: const Icon(Icons.auto_awesome),
                suffixIcon: _isLoading
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onSubmitted: _performAiSearch,
            ),
            const SizedBox(height: 8),
            const Text(
              '试试: "找一部韩剧讲女总裁复仇的" 或 "类似鱿鱼游戏的悬疑剧"',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 16),

            // AI 解析结果
            if (_parsed != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '🤖 AI 理解',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        if (_parsed!['keywords'] != null)
                          ...(_parsed!['keywords'] as List).map(
                            (kw) => Chip(
                              label: Text(kw, style: const TextStyle(fontSize: 12)),
                              backgroundColor: Colors.green.withOpacity(0.2),
                            ),
                          ),
                        if (_parsed!['genre'] != null)
                          ...(_parsed!['genre'] as List).map(
                            (g) => Chip(
                              label: Text(g, style: const TextStyle(fontSize: 12)),
                              backgroundColor: Colors.blue.withOpacity(0.2),
                            ),
                          ),
                        if (_parsed!['mood'] != null)
                          ...(_parsed!['mood'] as List).map(
                            (m) => Chip(
                              label: Text(m, style: const TextStyle(fontSize: 12)),
                              backgroundColor: Colors.purple.withOpacity(0.2),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 搜索结果
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _results.isEmpty
                      ? Center(
                          child: Text(
                            _showResults ? '未找到相关结果' : '输入关键词开始搜索',
                            style: const TextStyle(color: Colors.grey),
                          ),
                        )
                      : GridView.builder(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 0.7,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: _results.length,
                          itemBuilder: (context, index) {
                            final item = _results[index];
                            return _buildResultCard(item);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultCard(Map<String, dynamic> item) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PlayerScreen(
              source: item['source'] ?? 'douban',
              id: item['id'] ?? '',
              title: item['title'] ?? '',
            ),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                item['poster'] ?? '',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: Colors.grey[300],
                  child: const Icon(Icons.movie),
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            item['title'] ?? '',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12),
          ),
        ],
      ),
    );
  }
}
