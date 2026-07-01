# MCP Server 配置说明

## 已安装的 MCP Server

1. **Filesystem** — 读写项目代码文件
2. **Playwright** — 浏览器自动化、截图、DOM 分析
3. **GitHub** — PR review、commit 分析、diff 检查

## 使用方法

### 在 Claude Desktop / Cursor 中配置

复制 `mcp.json` 的内容到对应配置的 MCP Servers 区域。

### GitHub Token 配置

需要先在 GitHub 生成 Personal Access Token：

1. Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 勾选 `repo` 权限
3. 复制 token 到 `mcp.json` 中的 `GITHUB_PERSONAL_ACCESS_TOKEN` 环境变量

```json
"env": {
  "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
}
```

### Playwright 浏览器

首次运行会自动安装 Chromium。如需指定浏览器：

```bash
npx @playwright/mcp --browser chrome
```

## AI 开发闭环工作流

1. **Filesystem MCP** — 读取项目代码、分析结构
2. **Playwright MCP** — 打开页面、截图、检查 UI
3. **GitHub MCP** — 审计代码变更、Review PR
4. **AI 分析** — 定位 bug、提出修复方案
5. **自动修复** — 应用 patch、重新验证
