import 'package:flutter/material.dart';

class AuthProvider with ChangeNotifier {
  bool _isLoggedIn = false;
  String? _username;
  
  bool get isLoggedIn => _isLoggedIn;
  String? get username => _username;
  
  Future<void> login(String username, String password) async {
    // TODO: 实现登录逻辑
    _isLoggedIn = true;
    _username = username;
    notifyListeners();
  }
  
  Future<void> logout() async {
    _isLoggedIn = false;
    _username = null;
    notifyListeners();
  }
}
