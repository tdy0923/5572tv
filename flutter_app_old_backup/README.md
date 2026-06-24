# 5572 影视 Flutter App

跨平台影视播放应用，支持 Android、iOS、TV。

## 功能特性

- 🎬 海量影视资源（豆瓣数据）
- 📱 竖屏短剧体验（TikTok 风格）
- 🤖 AI 智能搜索
- 💬 弹幕互动
- ⭐ 用户评分评论
- 📋 片单分享
- 📺 TV 端适配

## 开发环境

```bash
# 安装 Flutter
# https://docs.flutter.dev/get-started/install

# 进入项目目录
cd flutter_app

# 获取依赖
flutter pub get

# 运行开发版
flutter run

# 构建 APK
flutter build apk

# 构建 iOS
flutter build ios
```

## 项目结构

```
lib/
├── main.dart              # 应用入口
├── core/
│   └── app_theme.dart     # 主题配置
├── screens/
│   ├── splash_screen.dart  # 启动页
│   ├── home_screen.dart    # 首页
│   ├── search_screen.dart  # 搜索页
│   └── player_screen.dart  # 播放器页
├── widgets/
│   └── video_card.dart     # 视频卡片组件
├── services/
│   └── api_service.dart    # API 服务
├── providers/
│   ├── auth_provider.dart  # 认证状态
│   └── video_provider.dart # 视频数据状态
└── models/                 # 数据模型
```

## 与 Web 版本的对应关系

| Web 功能 | App 对应       |
| -------- | -------------- |
| 首页推荐 | HomeScreen     |
| 搜索功能 | SearchScreen   |
| 视频播放 | PlayerScreen   |
| 短剧竖屏 | 竖屏模式播放器 |
| AI 搜索  | AI 搜索按钮    |
| 弹幕发送 | 弹幕输入框     |
| 用户评分 | 评分组件       |

## 构建命令

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release

# Web
flutter build web
```
