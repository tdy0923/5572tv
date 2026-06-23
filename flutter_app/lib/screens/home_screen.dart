import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/video_provider.dart';
import '../widgets/video_card.dart';
import '../widgets/scrollable_row.dart';
import 'search_screen.dart';
import 'player_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentTab = 0;
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VideoProvider>().loadHomeData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: IndexedStack(
          index: _currentTab,
          children: [
            _buildHomeTab(),
            const SearchScreen(),
            _buildProfileTab(),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentTab,
        onDestinationSelected: (index) {
          setState(() {
            _currentTab = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: '首页',
          ),
          NavigationDestination(
            icon: Icon(Icons.search),
            selectedIcon: Icon(Icons.search),
            label: '搜索',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: '我的',
          ),
        ],
      ),
    );
  }

  Widget _buildHomeTab() {
    return Consumer<VideoProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        
        return RefreshIndicator(
          onRefresh: () => provider.loadHomeData(),
          child: CustomScrollView(
            slivers: [
              // 热门电影
              SliverToBoxAdapter(
                child: _buildSection(
                  '热门电影',
                  provider.hotMovies,
                ),
              ),
              // 热门剧集
              SliverToBoxAdapter(
                child: _buildSection(
                  '热门剧集',
                  provider.hotTvShows,
                ),
              ),
              // 热门动漫
              SliverToBoxAdapter(
                child: _buildSection(
                  '热门动漫',
                  provider.hotAnime,
                ),
              ),
              // 热门短剧
              SliverToBoxAdapter(
                child: _buildSection(
                  '热门短剧',
                  provider.hotShortDramas,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSection(String title, List<dynamic> items) {
    if (items.isEmpty) return const SizedBox.shrink();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton(
                onPressed: () {},
                child: const Text('查看更多'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: VideoCard(
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
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildProfileTab() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.person, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            '个人中心',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          Text(
            '登录后可同步观看记录',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
