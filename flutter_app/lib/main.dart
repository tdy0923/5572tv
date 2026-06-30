import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/user_data_service.dart';
import 'services/api_service.dart';
import 'services/theme_service.dart';
import 'services/douban_cache_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();

  final cacheService = DoubanCacheService();
  await cacheService.init();
  cacheService.startPeriodicCleanup();

  runApp(const Media5572App());
}

class Media5572App extends StatelessWidget {
  const Media5572App({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => ThemeService(),
      child: Consumer<ThemeService>(
        builder: (context, themeService, child) {
          return MaterialApp(
            title: '5572 影视',
            debugShowCheckedModeBanner: false,
            theme: themeService.lightTheme,
            darkTheme: themeService.darkTheme,
            themeMode: themeService.themeMode,
            home: const AppWrapper(),
          );
        },
      ),
    );
  }
}

class AppWrapper extends StatefulWidget {
  const AppWrapper({super.key});

  @override
  State<AppWrapper> createState() => _AppWrapperState();
}

class _AppWrapperState extends State<AppWrapper> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  void _checkLoginStatus() async {
    try {
      final hasAutoLoginData = await UserDataService.hasAutoLoginData();

      if (!hasAutoLoginData) {
        if (mounted) {
          setState(() => _isLoading = false);
        }
        return;
      }

      final loginResult = await ApiService.autoLogin();

      if (mounted) {
        if (loginResult.success) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const HomeScreen()),
          );
        } else {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Consumer<ThemeService>(
        builder: (context, themeService, child) {
          return Scaffold(
            body: Container(
              decoration: BoxDecoration(
                color: themeService.isDarkMode
                    ? const Color(0xFF000000)
                    : null,
                gradient: themeService.isDarkMode
                    ? null
                    : const LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xFFe6f3fb),
                          Color(0xFFeaf3f7),
                          Color(0xFFf7f7f3),
                          Color(0xFFe9ecef),
                          Color(0xFFd3dde6),
                        ],
                        stops: [0.0, 0.18, 0.38, 0.60, 1.0],
                      ),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(
                          themeService.isDarkMode
                              ? const Color(0xFFffffff)
                              : const Color(0xFF2c3e50)),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      '正在检查登录状态...',
                      style: TextStyle(
                        fontSize: 16,
                        color: themeService.isDarkMode
                            ? const Color(0xFFffffff)
                            : const Color(0xFF2c3e50),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    }

    return const LoginScreen();
  }
}
