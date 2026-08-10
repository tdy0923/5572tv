# 发版检查清单（RELEASE CHECKLIST）

发布新版本 / 新 APK 时必须同步以下位置，防止"日志、下载页、二维码、下载链接不同步"。

## 每次发布新 APK 都要改

| #   | 文件                       | 改什么                                                                                                                                                      |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `flutter_app/pubspec.yaml` | `version: <x.y.z>+<build>`（APP 版本名 + 构建号）                                                                                                           |
| 2   | `src/lib/app-release.ts`   | `version` / `buildNumber` / `releaseNotes` / `minRequiredVersion` / `forceUpdate` / `releaseDate`（**唯一数据源**，下载页与 `/api/version-check` 自动同步） |
| 3   | `CHANGELOG.md`             | 顶部追加本次版本记录（网站 / 全栈日志）                                                                                                                     |
| 4   | `flutter_app/CHANGELOG.md` | 若存在，同步 APP 侧更新日志                                                                                                                                 |

> 改完 `flutter_app/**` 推送会自动触发 `Build & Push Android APK`（CI 重建并提交 APK，带 `[skip apk]` 防死循环）。

## 二维码 / 下载链接（通常不用改）

- 二维码与下载按钮**固定指向** `/download/5572tv-android.apk`，文件名不变则永远有效，无需更新。
- **仅当** APK 文件名变更时：同步 `src/lib/app-release.ts` 的 `downloadUrl`、`src/components/auth/AppDownloads.tsx` 与 `src/app/download/page.tsx` 里的所有 `.apk` 引用，并重新考虑 `/api/version-check` 的 `getApkSizeMb` 路径。

## 发版后验证

- [ ] `curl https://www.5572.net/api/version-check` 返回新 `version` / `buildNumber` / `releaseNotes`
- [ ] `https://www.5572.net/download` 显示新版本号与 APK 大小
- [ ] 登录页二维码扫码能直接下载新 APK
- [ ] APP 内"检查更新"提示文案为新版本
