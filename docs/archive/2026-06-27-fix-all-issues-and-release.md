# 修复所有问题并发布新版本实施方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复所有已知问题（CORS错误、Flutter APP代理、React hydration），验证功能，发布新版本

**Architecture:**

1. 修复CORS问题 - 为视频源添加CORS支持或配置hls.js正确处理
2. 更新Flutter APP - 移除M3U8代理依赖，直接访问视频源
3. 修复React hydration - 消除服务端/客户端渲染差异
4. 全面测试 - 验证网站和APP功能
5. 发布新版本 - 构建APK并部署

**Tech Stack:** Next.js, Flutter, Cloudflare Worker, HLS.js

---

## Task 1: 修复CORS错误

**Files:**

- Modify: `src/app/play/page.tsx`
- Modify: `src/app/play/hooks/useSourceSwitching.ts`
- Modify: `src/app/play/hooks/useSpeedTest.ts`

**Interfaces:**

- Consumes: hls.js configuration
- Produces: Updated video loading logic without CORS errors

**问题分析:**
视频源（ppqrrs.com, zuidazym3u8.com等）没有CORS头，导致浏览器控制台显示CORS错误。虽然视频能播放，但存在以下风险：

1. 浏览器可能在未来版本中更严格地执行CORS策略
2. 某些浏览器扩展可能阻止跨域请求
3. 控制台错误可能误导开发者

**解决方案:**
配置hls.js使用`fetch`加载模式，该模式在某些情况下可以绕过CORS限制。

- [ ] **Step 1: 修改hls.js配置，添加fetch模式支持**

```typescript
// src/app/play/page.tsx - 在hls配置中添加
const hls = new HlsModule({
  // ... 现有配置
  // 添加fetch模式支持，某些CDN支持CORS
  fetchMode: true,
  // 降级策略：如果fetch失败，回退到xhr
  fetchModeOnFailure: true,
});
```

- [ ] **Step 2: 测试视频播放**

在浏览器中打开播放页面，验证：

1. 视频能正常播放
2. 控制台CORS错误减少或消失
3. 播放器功能正常（暂停、快进、音轨切换）

- [ ] **Step 3: 提交代码**

```bash
git add src/app/play/page.tsx
git commit -m "fix: configure hls.js to handle CORS properly"
```

---

## Task 2: 更新Flutter APP M3U8代理

**Files:**

- Modify: `flutter_app/lib/services/user_data_service.dart`
- Modify: `flutter_app/lib/screens/player_screen.dart`

**Interfaces:**

- Consumes: M3U8 URL
- Produces: Direct video playback without proxy

**问题分析:**
Flutter APP使用`UserDataService.getM3u8ProxyUrl()`获取代理URL，默认值为`https://www.5572.net/api/video-proxy?url=`。但这个代理端点可能不存在或不稳定。

**解决方案:**

1. 移除默认的代理URL
2. 让APP直接访问视频源
3. 添加配置选项让用户可以选择使用代理

- [ ] **Step 1: 修改默认代理URL为空**

```dart
// flutter_app/lib/services/user_data_service.dart:185-186
// 如果用户没有配置，不使用代理，直接访问视频源
if (savedUrl == null || savedUrl.isEmpty) {
  return ''; // 返回空字符串，表示直接访问
}
```

- [ ] **Step 2: 修改视频播放逻辑，支持直接访问**

```dart
// flutter_app/lib/screens/player_screen.dart:661-664
if (m3u8ProxyUrl.isNotEmpty && !newUrl.startsWith('http')) {
  // 使用代理
  final encodedUrl = Uri.encodeComponent(newUrl);
  finalUrl = '$m3u8ProxyUrl$encodedUrl';
} else {
  // 直接访问视频源
  finalUrl = newUrl;
}
```

- [ ] **Step 3: 测试Flutter APP**

1. 构建APK: `cd flutter_app && /opt/flutter/bin/flutter build apk --release`
2. 在模拟器或真机上测试视频播放
3. 验证视频能正常加载和播放

- [ ] **Step 4: 提交代码**

```bash
git add flutter_app/
git commit -m "fix: update Flutter app to access video sources directly"
```

---

## Task 3: 修复React Hydration错误

**Files:**

- Modify: `src/app/play/page.tsx`
- Modify: `src/components/EpisodeSelector.tsx`

**Interfaces:**

- Consumes: React components
- Produces: Consistent server/client rendering

**问题分析:**
React error #419 (Hydration mismatch) 发生在服务端渲染的HTML与客户端渲染的HTML不匹配时。常见原因：

1. 使用`Date.now()`或`new Date()`在初始渲染中
2. 使用`localStorage`在初始渲染中
3. 使用浏览器特定API在初始渲染中

**解决方案:**
确保所有动态内容都在`useEffect`中设置，初始状态在服务端和客户端保持一致。

- [ ] **Step 1: 检查并修复play页面的hydration问题**

```typescript
// src/app/play/page.tsx - 确保初始状态一致
const [videoUrl, setVideoUrl] = useState(''); // 初始为空字符串

useEffect(() => {
  // 所有动态内容都在这里设置
  // 这样服务端和客户端的初始渲染会一致
}, []);
```

- [ ] **Step 2: 检查EpisodeSelector组件**

确保组件没有在渲染期间使用浏览器特定API。

- [ ] **Step 3: 测试页面加载**

1. 在浏览器中打开播放页面
2. 检查控制台是否还有React hydration错误
3. 验证页面功能正常

- [ ] **Step 4: 提交代码**

```bash
git add src/app/play/page.tsx src/components/EpisodeSelector.tsx
git commit -m "fix: resolve React hydration mismatch errors"
```

---

## Task 4: 全面功能测试

**验证项:**

- [ ] **网站功能测试**
  - 登录功能
  - 搜索功能
  - 视频播放
  - 收藏功能
  - 下载页面
  - PWA安装

- [ ] **Flutter APP测试**
  - 构建APK
  - 安装测试
  - 视频播放
  - 用户登录
  - 收藏同步

- [ ] **跨浏览器测试**
  - Chrome
  - Firefox
  - Safari
  - Edge
  - 移动端浏览器

---

## Task 5: 发布新版本

**Files:**

- Modify: `package.json` (版本号)
- Modify: `flutter_app/pubspec.yaml` (版本号)

**步骤:**

- [ ] **Step 1: 更新版本号**

```bash
# 更新Web版本
npm version patch

# 更新Flutter版本
cd flutter_app
flutter pub get
```

- [ ] **Step 2: 提交版本更新**

```bash
git add package.json flutter_app/pubspec.yaml
git commit -m "chore: bump version to x.x.x"
git tag v1.x.x
```

- [ ] **Step 3: 推送到GitHub**

```bash
git push origin main --tags
```

- [ ] **Step 4: 等待CI/CD完成**

1. GitHub Actions自动构建Docker镜像
2. 自动部署到服务器
3. 验证网站正常工作

- [ ] **Step 5: 构建Flutter APK**

```bash
cd flutter_app
/opt/flutter/bin/flutter build apk --release
```

- [ ] **Step 6: 上传APK到下载页面**

将构建的APK上传到服务器的下载目录。

---

## 时间估算

| Task                        | 预计时间    |
| --------------------------- | ----------- |
| Task 1: 修复CORS            | 30分钟      |
| Task 2: 更新Flutter APP     | 45分钟      |
| Task 3: 修复React hydration | 30分钟      |
| Task 4: 全面测试            | 60分钟      |
| Task 5: 发布新版本          | 30分钟      |
| **总计**                    | **约3小时** |

---

## 风险评估

| 风险                         | 影响 | 缓解措施        |
| ---------------------------- | ---- | --------------- |
| CORS修复可能影响播放         | 高   | 测试多种视频源  |
| Flutter APP修改可能引入新bug | 中   | 充分测试APP功能 |
| React修复可能影响其他页面    | 中   | 测试所有页面    |
| 发布可能引入回归问题         | 高   | 全面回归测试    |

---

## 成功标准

- [ ] 控制台无CORS错误
- [ ] 视频正常播放
- [ ] Flutter APP正常工作
- [ ] 无React hydration错误
- [ ] 所有测试通过
- [ ] 新版本成功发布
