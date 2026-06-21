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

  // CSP headers — allow Cloudflare challenge platform and RUM
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.5572.net https://cdn-cgi.challenge-platform.com",
            "worker-src 'self' blob: https://www.5572.net",
            "connect-src 'self' https://www.5572.net https://cdn-cgi.challenge-platform.com https://cdn-cgi.rum",
          ].join('; '),
        },
      ],
    },
  ],

  // 图片优化配置
  images: {
    // 代理图片不兼容 Next.js 优化管道，保持原图输出
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
};

module.exports = nextConfig;
