import 'package:flutter/material.dart';

import '../services/api_service.dart';

class VideoProvider with ChangeNotifier {
  List<dynamic> _hotMovies = [];
  List<dynamic> _hotTvShows = [];
  List<dynamic> _hotAnime = [];
  List<dynamic> _hotShortDramas = [];
  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  bool _isSearching = false;
  
  List<dynamic> get hotMovies => _hotMovies;
  List<dynamic> get hotTvShows => _hotTvShows;
  List<dynamic> get hotAnime => _hotAnime;
  List<dynamic> get hotShortDramas => _hotShortDramas;
  List<dynamic> get searchResults => _searchResults;
  bool get isLoading => _isLoading;
  bool get isSearching => _isSearching;
  
  Future<void> loadHomeData() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      final data = await ApiService.getHomeData();
      _hotMovies = data['hotMovies'] ?? [];
      _hotTvShows = data['hotTvShows'] ?? [];
      _hotAnime = data['hotAnime'] ?? [];
      _hotShortDramas = data['hotShortDramas'] ?? [];
    } catch (e) {
      debugPrint('Failed to load home data: $e');
    }
    
    _isLoading = false;
    notifyListeners();
  }
  
  Future<void> search(String query, {String type = 'video'}) async {
    _isSearching = true;
    notifyListeners();
    
    try {
      final data = await ApiService.search(query, type: type);
      _searchResults = data['results'] ?? [];
    } catch (e) {
      debugPrint('Search failed: $e');
      _searchResults = [];
    }
    
    _isSearching = false;
    notifyListeners();
  }
  
  Future<Map<String, dynamic>> getVideoDetail(String source, String id) async {
    return await ApiService.getVideoDetail(source, id);
  }
  
  void clearSearch() {
    _searchResults = [];
    notifyListeners();
  }
}
