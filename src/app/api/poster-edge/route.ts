import { GET } from '../image-proxy/route';

// 内部别名：专供 Cloudflare Worker 边缘缓存回源使用。
// 不出现在 Worker 路由表中，避免 Worker 回源时命中自身造成死循环。
export const runtime = 'nodejs';
export { GET };
