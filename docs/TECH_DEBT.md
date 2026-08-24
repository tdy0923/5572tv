# 技术债与待办清单

> 记录已知问题、待迁移项与架构决策，供后续接续参考。

## 高优先级待办

### 1. vm2 → isolated-vm 迁移（安全）

- **状态**: 待办（2026-08-24 评估，暂缓）
- **风险**: vm2 已弃用，存在已知沙箱逃逸漏洞（CVE-2023-32314/32313）
- **当前缓解**: 三处使用点（`source-script-executor.ts`、`source-script/route.ts`、`ad-filter/route.ts`）的 NodeVM 均配置 `eval:false, wasm:false, builtin:[], external:false`，且脚本仅由受信管理员/站长上传
- **迁移代价**: 目标 `isolated-vm` 需要原生编译（build-essential），Docker 镜像体积 +200MB、构建时间 +3-5 分钟
- **迁移时机**: 下次 Docker 构建链路重构时一并处理

## 中优先级

### 2. `u:yuandm:pwd` 历史残留处理（用户数据）

- **状态**: V1 存储键已清理（2026-08-24），`yuandm` 的 V1 密码键已删除
- **注意**: 该用户 V1(scrypt) 与 V2(sha256) 密码此前不一致，若其反馈登录异常需单独重置密码
- **当前**: V1 桶已全部清理，`u:*:pwd` 键数量为 0

## 已完成项（参考）

- 2026-08-24: 用户桶统一 V2 —— 移除 `getAllUsers` 的 V1 SCAN/KEYS 合并；admin 新增用户改用 `createUserV2`；生产 V1 键清理归零
- 2026-08-24: `cache:device:*` 无 TTL 键设为 7 天过期；豆瓣内容缓存保持永不过期（避免误伤浏览体验）
- 2026-08-24: 前端 localStorage 损坏导致的白屏防护（douban/live/emby）
- 2026-08-24: hydration mismatch（公告铃铛状态）与未登录 401 刷屏修复
- 2026-08-24: `/api/cache` GET 放宽为登录用户可读；`/api/release-calendar` GET 公开
- 2026-08-24: health-check.sh "Source Loop Protection" 假阳性修复
