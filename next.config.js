/** @type {import('next').NextConfig} */

const nextConfig = {
  // 生产环境始终使用 standalone 模式（Vercel/Docker/Render）
  // 本地开发时（NODE_ENV !== 'production'）不使用 standalone
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  reactStrictMode: false,

  // Puppeteer/Chromium 相关包不进行 bundle（用于 Vercel serverless）
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'redis'],

  // Next.js 16 使用 Turbopack，配置 SVG 加载
  turbopack: {
    root: __dirname,
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // 性能优化：包体积优化和模块化导入
  experimental: {
    // 自动优化大型库的导入，只打包实际使用的部分
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      'framer-motion',
      'react-icons',
    ],
  },

  // 图片优化配置
  images: {
    // 代理图片通过API路由，Next.js优化管道无法处理
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // 安全头配置
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ],
};

module.exports = nextConfig;
