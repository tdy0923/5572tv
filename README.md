<div align="center">

# 5572影视 v1.3.0

[![Docker](https://img.shields.io/badge/docker-latest-blue?logo=docker)](https://github.com/tdy0923/5572tv/pkgs/container/5572tv)
[![Node](https://img.shields.io/badge/node-22-green?logo=node.js)](https://nodejs.org)
[![Next](https://img.shields.io/badge/next-16.2-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/react-19.2-61dafb?logo=react)](https://react.dev)

</div>

## 下载

```bash
docker pull ghcr.io/tdy0923/5572tv:latest
```

## 更新日志

- **1.3.0** — 播放修复、依赖升级、健康检查体系、CF Worker 边缘代理
- **1.2.3** — 修复 29 个 ESLint 错误、播放优化、搜索聚合、移除 Watch Room
- [完整日志](CHANGELOG)

## 部署

```bash
docker pull ghcr.io/tdy0923/5572tv:latest && docker compose up -d
```

详细部署文档见 [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)

## 技术栈

Node 22 / Next.js 16.2 / React 19.2 / pnpm 10.14 / TypeScript 5.9 / Tailwind CSS 4.3
