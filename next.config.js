/** @type {import('next').NextConfig} */

const nextConfig = {
  // 生产环境始终使用 standalone 模式（Vercel/Docker/Render）
  // 本地开发时（NODE_ENV !== 'production'）不使用 standalone
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

  reactStrictMode: true,

  // Puppeteer/Chromium 相关包不进行 bundle（用于 Vercel serverless）
  serverExternalPackages: [
    '@sparticuz/chromium',
    'puppeteer-core',
    'redis',
    'vm2',
  ],

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

  // Redirect old APK check URLs to the download page
  async redirects() {
    return [
      {
        source: '/download/releases/:path*',
        destination: '/download',
        permanent: true,
      },
    ];
  },
  // Security headers (CSP is set dynamically in proxy.ts with per-request nonce)
  async headers() {
    return [
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
      {
        source: '/poster-cache/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, s-maxage=2592000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/video-cache/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, s-maxage=2592000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
