import 'package:media_5572/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/user_data_service.dart';
import '../utils/device_utils.dart';
import '../utils/font_utils.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPasswordVisible = false;
  bool _isLoading = false;
  bool _isFormValid = false;

  @override
  void initState() {
    super.initState();
    _usernameController.addListener(_validateForm);
    _passwordController.addListener(_validateForm);
    _loadSavedUserData();
  }

  void _loadSavedUserData() async {
    final userData = await UserDataService.getAllUserData();
    if (!mounted) return;

    if (userData['username'] != null) {
      _usernameController.text = userData['username']!;
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _validateForm() {
    if (!mounted) return;
    setState(() {
      _isFormValid = _usernameController.text.isNotEmpty &&
          _passwordController.text.isNotEmpty;
    });
  }

  void _handleSubmit() {
    _handleLogin();
  }

  void _showToast(String message, Color backgroundColor) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: FontUtils.systemFont(color: Colors.white, fontSize: 14),
        ),
        backgroundColor: backgroundColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusLg)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  String _parseCookies(http.Response response) {
    List<String> cookies = [];
    final setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders != null) {
      final cookieParts = setCookieHeaders.split(';');
      if (cookieParts.isNotEmpty) {
        cookies.add(cookieParts[0].trim());
      }
    }
    return cookies.join('; ');
  }

  void _handleLogin() async {
    if (_formKey.currentState!.validate() && _isFormValid) {
      setState(() => _isLoading = true);

      try {
        final response = await http.post(
          Uri.parse('https://www.5572.net/api/login'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'username': _usernameController.text,
            'password': _passwordController.text,
          }),
        );
        if (!mounted) return;

        setState(() => _isLoading = false);

        switch (response.statusCode) {
          case 200:
            final cookies = _parseCookies(response);
            await UserDataService.saveUserData(
              username: _usernameController.text,
              password: _passwordController.text,
              cookies: cookies,
            );
            if (mounted) {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (context) => const HomeScreen()),
                (route) => false,
              );
            }
            break;
          case 401:
            _showToast('用户名或密码错误', AppTheme.error);
            break;
          case 429:
            _showToast('登录尝试过于频繁', AppTheme.error);
            break;
          default:
            _showToast('登录失败 (${response.statusCode})', AppTheme.error);
        }
      } catch (e) {
        if (!mounted) return;
        setState(() => _isLoading = false);
        _showToast('网络异常，请检查网络连接', AppTheme.error);
      }
    }
  }

  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: _usernameController,
          style: FontUtils.systemFont(fontSize: 16, color: AppTheme.foreground),
          decoration: InputDecoration(
            labelText: '用户名',
            labelStyle: FontUtils.systemFont(color: AppTheme.foregroundMuted, fontSize: 14),
            hintText: '请输入用户名',
            hintStyle: FontUtils.systemFont(color: AppTheme.stroke, fontSize: 16),
            prefixIcon: const Icon(Icons.person, color: AppTheme.foregroundMuted, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusXl), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusXl), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusXl), borderSide: BorderSide.none),
            filled: true,
            fillColor: Colors.white.withOpacity(0.6),
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return '请输入用户名';
            return null;
          },
          onFieldSubmitted: (_) => _handleSubmit(),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _passwordController,
          obscureText: !_isPasswordVisible,
          style: FontUtils.systemFont(fontSize: 16, color: AppTheme.foreground),
          decoration: InputDecoration(
            labelText: '密码',
            labelStyle: FontUtils.systemFont(color: AppTheme.foregroundMuted, fontSize: 14),
            hintText: '请输入密码',
            hintStyle: FontUtils.systemFont(color: AppTheme.stroke, fontSize: 16),
            prefixIcon: const Icon(Icons.lock, color: AppTheme.foregroundMuted, size: 20),
            suffixIcon: IconButton(
              icon: Icon(
                _isPasswordVisible ? Icons.visibility : Icons.visibility_off,
                color: AppTheme.foregroundMuted, size: 20,
              ),
              onPressed: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
            ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusXl), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusXl), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(AppTheme.radiusXl), borderSide: BorderSide.none),
            filled: true,
            fillColor: Colors.white.withOpacity(0.6),
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return '请输入密码';
            return null;
          },
          onFieldSubmitted: (_) => _handleSubmit(),
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: (_isLoading || !_isFormValid) ? null : _handleLogin,
          style: ElevatedButton.styleFrom(
            backgroundColor: _isFormValid && !_isLoading
                ? AppTheme.success
                : AppTheme.stroke,
            foregroundColor: _isFormValid && !_isLoading
                ? Colors.white
                : AppTheme.foregroundMuted,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radiusXl)),
            elevation: 0,
            shadowColor: Colors.transparent,
          ),
          child: _isLoading
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 18, width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white))),
                    const SizedBox(width: 12),
                    Text('登录中...', style: FontUtils.systemFont(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.white)),
                  ],
                )
              : Text('登录', style: FontUtils.systemFont(fontSize: 16, fontWeight: FontWeight.w500, letterSpacing: 1.0)),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = DeviceUtils.isTablet(context);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.gray100,
              AppTheme.gray100,
              AppTheme.backgroundSubtle,
              AppTheme.gray200,
              AppTheme.gray300,
            ],
            stops: [0.0, 0.18, 0.38, 0.60, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: isTablet ? 0 : 32.0,
                vertical: 24.0,
              ),
              child: isTablet ? _buildTabletLayout() : _buildMobileLayout(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMobileLayout() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppTheme.success, AppTheme.success],
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Center(
            child: Text('5', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          '5572 影视',
          style: FontUtils.monospace(
            fontSize: 32,
            fontWeight: FontWeight.w600,
            color: AppTheme.foreground,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '智能影视播放平台',
          style: FontUtils.systemFont(fontSize: 14, color: AppTheme.foregroundMuted),
        ),
        const SizedBox(height: 40),
        Form(key: _formKey, child: _buildForm()),
      ],
    );
  }

  Widget _buildTabletLayout() {
    return Container(
      constraints: const BoxConstraints(maxWidth: 480),
      padding: const EdgeInsets.symmetric(horizontal: 32.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.success, AppTheme.success]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Center(
              child: Text('5', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
          const SizedBox(height: 16),
          Text('5572 影视', style: FontUtils.monospace(fontSize: 32, fontWeight: FontWeight.w600, color: AppTheme.foreground, letterSpacing: 1.5)),
          const SizedBox(height: 8),
          Text('智能影视播放平台', style: FontUtils.systemFont(fontSize: 14, color: AppTheme.foregroundMuted)),
          const SizedBox(height: 40),
          Form(key: _formKey, child: _buildForm()),
        ],
      ),
    );
  }
}
