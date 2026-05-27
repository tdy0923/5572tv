<div align="center">

# 5572影视 v1.4.0

[![Docker](https://img.shields.io/badge/docker-latest-blue?logo=docker)](https://github.com/tdy0923/5572tv/pkgs/container/5572tv)
[![Release](https://img.shields.io/badge/release-v1.4.0-green)](https://github.com/tdy0923/5572tv/releases/tag/v1.4.0)
[![Node](https://img.shields.io/badge/node-22-green?logo=node.js)](https://nodejs.org)
[![Next](https://img.shields.io/badge/next-16.2-black?logo=next.js)](https://nextjs.org)

</div>

## 快速开始

```bash
docker run -d -p 3000:3000 \
  -e USERNAME=admin \
  -e PASSWORD=your_password \
  ghcr.io/tdy0923/5572tv:latest
```

打开 `http://localhost:3000` 即可使用。

## 部署方案

| 方案                   | 说明                      | 文档                                      |
| ---------------------- | ------------------------- | ----------------------------------------- |
| **Docker 自托管**      | 完整部署，含 Kvrocks 存储 | [部署指南](docs/deployment/DEPLOYMENT.md) |
| **Docker Compose**     | 一键启动（推荐）          | [部署指南](docs/deployment/DEPLOYMENT.md) |
| **Cloudflare Workers** | 视频代理边缘加速          | [部署指南](docs/deployment/DEPLOYMENT.md) |
| **Vercel / Render**    | 云端部署                  | [部署指南](docs/deployment/DEPLOYMENT.md) |

## 配置

首次启动后访问 `http://localhost:3000/admin` 配置播放源、用户权限、OIDC 等。完整配置说明见 [配置文档](docs/deployment/CONFIGURATION.md)。

## 下载

```bash
docker pull ghcr.io/tdy0923/5572tv:latest
```

GitHub Releases: [v1.4.0](https://github.com/tdy0923/5572tv/releases/tag/v1.4.0)

## 更新日志

- [完整日志](CHANGELOG) | [GitHub Releases](https://github.com/tdy0923/5572tv/releases)

## 技术栈

Node 22 / Next.js 16.2 / React 19.2 / pnpm 10.14 / TypeScript 5.9 / Tailwind CSS 4.3
