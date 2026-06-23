import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'https://www.5572.net/api';
  
  // 获取首页数据
  static Future<Map<String, dynamic>> getHomeData() async {
    final response = await http.get(
      Uri.parse('$baseUrl/home'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load home data');
  }
  
  // 搜索
  static Future<Map<String, dynamic>> search(String query, {String type = 'video'}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/search?q=${Uri.encodeComponent(query)}&type=$type'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Search failed');
  }
  
  // 获取视频详情
  static Future<Map<String, dynamic>> getVideoDetail(String source, String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/detail?source=$source&id=$id'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load video detail');
  }
  
  // AI 智能搜索
  static Future<Map<String, dynamic>> aiSearch(String query) async {
    final response = await http.get(
      Uri.parse('$baseUrl/ai-search?q=${Uri.encodeComponent(query)}'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('AI search failed');
  }
  
  // 获取短剧列表
  static Future<Map<String, dynamic>> getShortDramaList(int category, {int page = 1}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/shortdrama/list?categoryId=$category&page=$page'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load short drama list');
  }
  
  // 获取短剧分类
  static Future<List<dynamic>> getShortDramaCategories() async {
    final response = await http.get(
      Uri.parse('$baseUrl/shortdrama/categories'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['categories'] ?? [];
    }
    throw Exception('Failed to load categories');
  }
  
  // 获取播放记录
  static Future<List<dynamic>> getPlayHistory() async {
    final response = await http.get(
      Uri.parse('$baseUrl/play-history/timeline'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['timeline'] ?? [];
    }
    throw Exception('Failed to load play history');
  }
  
  // 获取收藏列表
  static Future<List<dynamic>> getFavorites() async {
    final response = await http.get(
      Uri.parse('$baseUrl/favorites/groups'),
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['groups'] ?? [];
    }
    throw Exception('Failed to load favorites');
  }
}
