# 发版流程

## 版本号管理

版本号存储在 3 个地方，必须同步更新：

| 文件                 | 字段              | 示例      |
| -------------------- | ----------------- | --------- |
| `VERSION.txt`        | 纯文本            | `1.3.0`   |
| `package.json`       | `"version"`       | `"1.3.0"` |
| `src/lib/version.ts` | `CURRENT_VERSION` | `'1.3.0'` |

## 发版前检查清单

### 1. 代码准备

```bash
# 确认所有改动已提交
git status

# 确认构建通过
pnpm install --no-frozen-lockfile
rm -rf .next
pnpm run build

# 确认类型检查通过
npx tsc --noEmit

# 确认健康检查通过
bash scripts/health-check.sh
```

### 2. 版本号更新

```bash
# 确定新版本号（遵循 semver: major.minor.patch）
export NEW_VERSION="1.4.0"

# 更新三个版本文件
echo "$NEW_VERSION" > VERSION.txt
sed -i 's/"version": ".*"/"version": "'$NEW_VERSION'"/' package.json
sed -i "s/const CURRENT_VERSION = '.*'/const CURRENT_VERSION = '$NEW_VERSION'/" src/lib/version.ts

# 检查是否一致
grep -E "^$NEW_VERSION$|$NEW_VERSION" VERSION.txt package.json src/lib/version.ts
```

### 3. 更新日志

编辑 `CHANGELOG`，在文件顶部插入新版本：

```
## [1.4.0] - YYYY-MM-DD

### Added

- ✨ 新功能...

### Fixed

- 🐛 修复...

### Changed

- ⬆️ 依赖升级...
```

格式要求：

- 版本标题：`## [X.Y.Z] - YYYY-MM-DD`
- 分类标题：`### Added` / `### Fixed` / `### Changed`
- 条目以 `- ` 开头
- 保留 CHANGELOG 文件**不要** `.md` 后缀（程序内读取路径）
- ⚠️ **避免在条目中使用反引号包裹含双引号的内容**（如 `` `URI="..."` ``），会生成非法 TypeScript

**重要：** 更新 CHANGELOG 后必须重新生成 changelog.ts：

```bash
node scripts/convert-changelog.js
```

此脚本将 `CHANGELOG` 转换为 `src/lib/changelog.ts`（应用内版本日志显示的数据源）。

### 4. 提交

```bash
git add VERSION.txt package.json src/lib/version.ts CHANGELOG src/lib/changelog.ts
git commit -m "chore: bump v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push && git push --tags
```

### 5. CI 构建

推送后自动触发 GitHub Actions：

- `Build & Push Docker image` → 构建 Docker 镜像并推送到 GHCR
- `Deploy To Server` → 自动部署到生产服务器

等待两个 workflow 都显示 `success`：

```bash
gh run list --repo tdy0923/5572tv --branch main --limit 5 --json status,conclusion,displayTitle
```

### 6. GitHub Release

```bash
# 读取 CHANGELOG 中当前版本的更新内容
# 或者手动编写发布说明

gh release create "v$NEW_VERSION" --repo tdy0923/5572tv \
  --title "v$NEW_VERSION" \
  --notes "## v$NEW_VERSION

### 下载

\`\`\`bash
docker pull ghcr.io/tdy0923/5572tv:latest
\`\`\`

[查看完整更新日志](https://github.com/tdy0923/5572tv/blob/main/CHANGELOG)"
```

### 7. 发布后验证

```bash
# 验证 Docker 镜像
docker pull ghcr.io/tdy0923/5572tv:latest

# 检查应用内版本号
curl -s "https://YOUR_DOMAIN/api/server-config" | grep version

# 运行健康检查
bash scripts/health-check.sh https://YOUR_DOMAIN

# 检查 CHANGELOG 显示
# 打开应用 → 版本信息 → 确认最新版本显示正确
```

## 版本号对应关系

| 代码位置                 | 用途            | 推送后自动更新？            |
| ------------------------ | --------------- | --------------------------- |
| `VERSION.txt`            | 构建时引用      | ❌ 手动                     |
| `package.json`           | npm/pnpm 包版本 | ❌ 手动                     |
| `src/lib/version.ts`     | 应用内版本显示  | ❌ 手动                     |
| GitHub Tag `vX.Y.Z`      | Release 标识    | ❌ 手动 `git tag`           |
| GitHub Release           | 下载页面        | ❌ 手动 `gh release create` |
| GHCR Docker Tag `latest` | 镜像版本        | ✅ CI 自动                  |
| README 徽章              | 文档显示        | ❌ 手动                     |

## 快速发版脚本

```bash
# 一键发版（替换 X.Y.Z 为目标版本）
export V=X.Y.Z
echo "$V" > VERSION.txt
sed -i "s/\"version\": \".*\"/\"version\": \"$V\"/" package.json
sed -i "s/const CURRENT_VERSION = '.*'/const CURRENT_VERSION = '$V'/" src/lib/version.ts
git add VERSION.txt package.json src/lib/version.ts CHANGELOG
git commit -m "chore: bump v$V"
git tag "v$V"
git push && git push --tags
gh release create "v$V" --repo tdy0923/5572tv --title "v$V" \
  --notes "## v$V

\`\`\`bash
docker pull ghcr.io/tdy0923/5572tv:latest
\`\`\`
"

echo "✅ v$V 已发布。等待 CI 构建部署..."
```
