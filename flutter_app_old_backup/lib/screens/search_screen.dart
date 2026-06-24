import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/video_provider.dart';
import '../widgets/video_card.dart';
import 'player_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchType = 'video';
  
  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _performSearch(String query) {
    if (query.trim().isEmpty) return;
    context.read<VideoProvider>().search(query, type: _searchType);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 搜索栏
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: '搜索电影、电视剧...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {});
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onSubmitted: _performSearch,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          
          // 搜索类型选择
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'video', label: Text('影视')),
              ButtonSegment(value: 'netdisk', label: Text('网盘')),
            ],
            selected: {_searchType},
            onSelectionChanged: (Set<String> selected) {
              setState(() {
                _searchType = selected.first;
              });
            },
          ),
          const SizedBox(height: 16),
          
          // 搜索结果
          Expanded(
            child: Consumer<VideoProvider>(
              builder: (context, provider, child) {
                if (provider.isSearching) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                if (provider.searchResults.isEmpty) {
                  return const Center(
                    child: Text(
                      '输入关键词搜索',
                      style: TextStyle(color: Colors.grey),
                    ),
                  );
                }
                
                return GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 0.7,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: provider.searchResults.length,
                  itemBuilder: (context, index) {
                    final item = provider.searchResults[index];
                    return VideoCard(
                      title: item['title'] ?? '',
                      poster: item['poster'] ?? '',
                      year: item['year'] ?? '',
                      rate: item['rate'] ?? '',
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
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
