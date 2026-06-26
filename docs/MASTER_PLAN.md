# 5572 项目全面整改计划
> 系统架构师制定 | 2025-06-26

---

## 一、已完成的工作（本次会话）

### 1. 品牌统一 ✅
- [x] Flutter APP: Selene → 5572 影视
- [x] 包名: com.media5572.app
- [x] 主题色: #f4c24d 金黄色（与主站一致）
- [x] User-Agent: 5572tv/1.4.0
- [x] 更新链接: 指向 www.5572.net

### 2. Web端修复 ✅
- [x] 触摸目标统一44px
- [x] Service Worker 206错误修复
- [x] 图片代理规则CI检查
- [x] 安全头配置
- [x] 下载页暗黑电影风格UI
- [x] 下载页粒子动态背景
- [x] iOS PWA安装教程

### 3. Flutter APP修复 ✅
- [x] APK构建成功 (65.9MB)
- [x] 图标: 5572品牌图标
- [x] 播放器加载状态修复
- [x] 图片代理: poster-cache
- [x] 品牌配色统一

### 4. 本地化缓存 ✅
- [x] poster-cache API (1.5GB限制)
- [x] video-cache API (500MB限制)
- [x] 智能存储控制

---

## 二、待完成的工作（优先级排序）

### P0 - 必须立即修复（影响核心功能）

#### 2.1 Flutter APP播放问题
**问题**: 用户报告APP无法正常播放影片
**原因分析**:
- 视频URL可能需要经过服务器代理
- media_kit播放器配置可能有问题
- 网络请求超时或失败

**修复方案**:
```dart
// 1. 视频URL处理 - 需要通过代理
// src/app/play/utils.ts 中的 replacePlaybackUrlParams
// Flutter端需要对应的URL处理逻辑

// 2. 播放器错误处理
// video_player_widget.dart 需要更详细的错误日志
```

**涉及文件**:
- `flutter_app/lib/widgets/video_player_widget.dart`
- `flutter_app/lib/screens/player_screen.dart`
- `flutter_app/lib/services/api_service.dart`

#### 2.2 海报/图片不显示
**问题**: 动漫海报无法显示
**原因分析**:
- 已修复: image_url.dart 现在使用 poster-cache 代理
- 需要验证: poster-cache API 是否正常工作

**验证步骤**:
1. 检查服务器日志
2. 测试 poster-cache API
3. 确认图片格式正确

---

### P1 - 重要优化（影响用户体验）

#### 2.3 视频缩略图本地化
**当前状态**: 已创建 video-cache API
**待完成**: Flutter APP集成

```dart
// flutter_app/lib/widgets/video_card.dart
// 需要将视频缩略图也通过 video-cache 代理
```

#### 2.4 错误处理完善
**审计发现的问题**:
1. `announcement_service.dart:26` - 空catch块
2. `bangumi_service.dart:58,97,146` - 缓存错误静默
3. `douban_cache_service.dart:121,134,155` - 删除错误忽略

**修复**: 添加日志记录，至少打印错误信息

#### 2.5 播放器状态管理
**问题**: `_isLoadingVideo` 状态可能不一致
**方案**: 统一状态管理，使用状态机模式

---

### P2 - 体验优化（提升用户满意度）

#### 2.6 下载页完善
**当前状态**: 基础UI已完成
**待优化**:
- [ ] 添加实际截图展示
- [ ] 添加用户评价/推荐
- [ ] 添加版本更新日志
- [ ] 添加社交媒体分享

#### 2.7 APP启动优化
**当前**: 启动时加载较多数据
**优化**:
- 首屏优先加载
- 懒加载非关键数据
- 预加载常用资源

#### 2.8 离线缓存策略
**当前**: 只缓存元数据
**目标**: 
- 缓存最近观看的海报
- 缓存收藏夹数据
- 缓存搜索历史

---

### P3 - 安全加固（保护用户数据）

#### 2.9 凭证存储安全
**问题**: SharedPreferences明文存储密码
**方案**: 使用 flutter_secure_storage

#### 2.10 网络安全配置
**问题**: 允许明文流量 + 用户CA信任
**方案**: 
- 移除 `android:usesCleartextTraffic="true"`
- 限制用户CA信任

---

## 三、技术架构优化

### 3.1 本地化资源架构
```
用户请求 → Flutter APP
    ↓
图片请求 → poster-cache API → 本地缓存 → Cloudflare CDN
视频缩略图 → video-cache API → 本地缓存 → Cloudflare CDN
视频流 → 直接播放（通过代理）
```

### 3.2 存储分配计划
| 资源 | 限制 | 清理策略 |
|------|------|----------|
| 海报缓存 | 1.5GB | 30天未访问清理 |
| 视频缩略图 | 500MB | 30天未访问清理 |
| **总计** | **2GB** | **占26GB的7.7%** |

### 3.3 Cloudflare缓存策略
```nginx
# 静态资源 - 长期缓存
/location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# API响应 - 短期缓存
/location ~* /api/(poster-cache|video-cache) {
    expires 7d;
    add_header Cache-Control "public, s-maxage=604800";
}
```

---

## 四、实施时间表

### 第一阶段：紧急修复（1-2天）
1. 修复APP播放问题
2. 验证海报显示
3. 重建并发布APK

### 第二阶段：体验优化（3-5天）
1. 完善错误处理
2. 视频缩略图本地化
3. 下载页完善

### 第三阶段：安全加固（5-7天）
1. 凭证加密存储
2. 网络安全配置
3. 代码审计

### 第四阶段：性能优化（7-14天）
1. 启动优化
2. 离线缓存
3. 图片懒加载

---

## 五、质量保证

### 测试清单
- [ ] APP启动正常
- [ ] 登录功能正常
- [ ] 播放功能正常
- [ ] 图片加载正常
- [ ] 搜索功能正常
- [ ] 收藏功能正常
- [ ] 历史记录正常
- [ ] 下载功能正常

### 性能指标
- 启动时间 < 3秒
- 首屏加载 < 2秒
- 图片加载 < 1秒
- 视频播放 < 3秒

---

## 六、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 海报缓存占满磁盘 | 中 | 智能清理 + 监控 |
| 播放源失效 | 高 | 多源备份 + 自动切换 |
| 服务器带宽不足 | 中 | Cloudflare CDN |
| APP兼容性问题 | 低 | 多版本测试 |

---

## 七、下一步行动

### 立即执行
1. 用户测试APP播放功能
2. 根据测试结果修复问题
3. 发布修复版本

### 本周完成
1. 完善错误处理
2. 视频缩略图本地化
3. 下载页优化

### 下周完成
1. 安全加固
2. 性能优化
3. 全面测试
