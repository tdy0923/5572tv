'use client';

import {
  CheckCircle,
  Download,
  ExternalLink,
  Film,
  Play,
  Smartphone,
  Star,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';

function detectPlatform(): 'android' | 'ios' | 'tv' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/smart tv|android tv|roku|fire tv/i.test(ua)) return 'tv';
  return 'desktop';
}

function getQrCodeUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
}

export default function DownloadPage() {
  const detectedPlatform = useMemo(() => detectPlatform(), []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const downloadInfo: Record<string, {
    name: string;
    icon: typeof Smartphone;
    description: string;
    url: string;
    qrText: string;
    size: string;
    version: string;
    updatedAt: string;
    comingSoon?: boolean;
    features: { name: string; desc: string }[];
  }> = {
    android: {
      name: 'Android',
      icon: Smartphone,
      description: '支持 Android 5.0+ 手机和平板',
      url: '/download/5572tv-android.apk',
      qrText: 'https://www.5572.net/download/5572tv-android.apk',
      size: '65 MB',
      version: 'v1.4.0',
      updatedAt: '2025-06-24',
      features: [
        { name: '竖屏短剧', desc: '沉浸式竖屏播放体验' },
        { name: '画中画 PiP', desc: '小窗追剧不耽误聊天' },
        { name: '离线缓存', desc: 'WiFi下载随时观看' },
        { name: 'Chromecast 投屏', desc: '大屏观影更震撼' },
        { name: '弹幕互动', desc: '实时弹幕欢乐共享' },
        { name: '后台播放', desc: '锁屏后继续播放' },
      ],
    },
    ios: {
      name: 'iOS',
      icon: Smartphone,
      description: '支持 iOS 14.0+ iPhone 和 iPad',
      url: '#',
      qrText: 'https://testflight.apple.com/join/xxxxx',
      size: '32 MB',
      version: 'v1.4.0',
      updatedAt: '2025-06-24',
      comingSoon: true,
      features: [
        { name: '竖屏短剧', desc: '沉浸式竖屏播放体验' },
        { name: '画中画', desc: '小窗追剧不耽误聊天' },
        { name: 'AirPlay 投屏', desc: 'Apple TV 大屏观影' },
        { name: 'Siri 快捷指令', desc: '语音控制播放' },
        { name: 'Widget 小组件', desc: '桌面快速访问' },
        { name: '后台播放', desc: '锁屏后继续播放' },
      ],
    },
    tv: {
      name: 'Android TV',
      icon: Tv,
      description: '支持 Android TV 和智能电视',
      url: '/download/5572tv-android.apk',
      qrText: 'https://www.5572.net/download/5572tv-android.apk',
      size: '65 MB',
      version: 'v1.4.0',
      updatedAt: '2025-06-24',
      features: [
        { name: '遥控器操作', desc: 'Dpad导航，无需触屏' },
        { name: '大屏优化', desc: '专为电视设计的界面' },
        { name: '4K 支持', desc: '超高清画质体验' },
        { name: '屏保模式', desc: '待机时展示影视海报' },
      ],
    },
  };

  const current = downloadInfo[detectedPlatform as keyof typeof downloadInfo] || downloadInfo.android;

  const appFeatures = [
    {
      icon: <Film className="w-6 h-6" />,
      title: '海量影视资源',
      desc: '聚合多个播放源，电影、剧集、动漫、短剧一网打尽',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'AI 智能搜索',
      desc: '输入关键词即可找到资源，支持模糊搜索和联想推荐',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: <Play className="w-6 h-6" />,
      title: '极速播放',
      desc: '自适应画质，秒开播放，多线路自动切换',
      gradient: 'from-primary to-emerald-500',
    },
    {
      icon: <Wifi className="w-6 h-6" />,
      title: '多端同步',
      desc: '登录账号后，手机、平板、电视播放进度实时同步',
      gradient: 'from-blue-500 to-cyan-500',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section - Cinema Style */}
      <div className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm mb-6">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                最新版本 v1.4.0
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                5572 影视
              </h1>
              <p className="text-xl sm:text-2xl text-gray-400 mb-2">
                智能影视播放平台
              </p>
              <p className="text-lg text-gray-500 mb-8">
                海量资源 · AI搜索 · 弹幕互动 · 多端同步
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href={current.url}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-emerald-500 rounded-2xl font-bold text-lg shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  下载 {current.name} 版
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 text-white rounded-2xl font-bold text-lg border border-white/10 hover:bg-white/10 transition-all"
                >
                  网页版体验
                  <ExternalLink className="w-5 h-5" />
                </Link>
              </div>

              {/* Platform Tabs */}
              <div className="flex gap-2 mt-8 justify-center lg:justify-start">
                {Object.entries(downloadInfo).map(([key, platform]) => {
                  const Icon = platform.icon;
                  return (
                    <Link
                      key={key}
                      href={`/download#${key}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        detectedPlatform === key
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {platform.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Phone Mockup - Dark Theme */}
            <div className="flex-shrink-0 hidden sm:block">
              <div className="relative">
                {/* Phone Frame */}
                <div className="relative w-64 h-[520px] bg-gray-900 rounded-[3rem] shadow-2xl border-4 border-gray-700 overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10" />
                  
                  {/* Screen Content */}
                  <div className="h-full overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900">
                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-4 pt-8 pb-2 text-white/60 text-xs">
                      <span>9:41</span>
                      <span>●●● WiFi 🔋</span>
                    </div>
                    
                    {/* App Header */}
                    <div className="px-4 py-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                          5
                        </div>
                        <span className="text-white font-bold text-sm">5572 影视</span>
                      </div>
                      
                      {/* Tabs */}
                      <div className="flex gap-2 mb-3">
                        {['推荐', '电影', '剧集', '动漫', '短剧'].map((t, i) => (
                          <span
                            key={t}
                            className={`text-xs px-3 py-1 rounded-full ${
                              i === 0
                                ? 'bg-primary text-white'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Hero Banner Placeholder */}
                    <div className="mx-3 mb-3 h-32 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-white/10 flex items-center justify-center">
                      <div className="text-center">
                        <Play className="w-8 h-8 text-white/40 mx-auto mb-1" />
                        <span className="text-xs text-white/40">热门推荐</span>
                      </div>
                    </div>

                    {/* Content Cards */}
                    <div className="px-3 space-y-2">
                      {['流浪地球3', '三体', '庆余年3'].map((title, i) => (
                        <div
                          key={i}
                          className="flex gap-2 p-2 rounded-xl bg-white/5 border border-white/5"
                        >
                          <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                            <Film className="w-4 h-4 text-white/30" />
                          </div>
                          <div className="flex-1 py-1">
                            <div className="h-3 bg-white/20 rounded w-3/4 mb-1" />
                            <div className="h-2 bg-white/10 rounded w-1/2 mb-1" />
                            <div className="flex gap-1">
                              <span className="text-[9px] text-primary bg-primary/10 px-1 rounded">HD</span>
                              <span className="text-[9px] text-white/40">·</span>
                              <span className="text-[9px] text-yellow-400">★ {(8.5 - i * 0.3).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Nav */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2 bg-gray-900/95 backdrop-blur border-t border-white/5">
                      {[
                        { name: '首页', active: true },
                        { name: '搜索', active: false },
                        { name: '我的', active: false },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className={`flex flex-col items-center gap-0.5 ${
                            item.active ? 'text-primary' : 'text-white/40'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-current opacity-20" />
                          <span className="text-[9px]">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reflection */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-16 bg-gradient-to-b from-white/5 to-transparent rounded-full blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            为什么选择 App？
          </h2>
          <p className="text-gray-400">比网页版更强大，体验更流畅</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {appFeatures.map((feature, i) => (
            <div
              key={i}
              className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Download Section */}
      <div id={detectedPlatform} className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl border border-white/5 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left - Info */}
            <div className="flex-1 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                  <current.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{current.name} 版</h3>
                  <p className="text-sm text-gray-400">{current.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
                <span className="px-3 py-1 bg-white/5 rounded-lg">{current.version}</span>
                <span className="px-3 py-1 bg-white/5 rounded-lg">{current.size}</span>
                <span className="px-3 py-1 bg-white/5 rounded-lg">{current.updatedAt}</span>
              </div>

              {current.comingSoon ? (
                <div className="w-full px-6 py-4 bg-gray-700 text-gray-400 rounded-2xl font-bold text-lg text-center cursor-not-allowed">
                  即将推出
                </div>
              ) : (
                <a
                  href={current.url}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary to-emerald-500 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02]"
                >
                  <Download className="w-5 h-5" />
                  立即下载
                </a>
              )}

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {current.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-white">{feature.name}</span>
                      <p className="text-xs text-gray-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - QR Code */}
            <div className="flex flex-col items-center justify-center p-8 bg-black/20 md:border-l border-white/5">
              <div className="p-4 bg-white rounded-2xl shadow-xl mb-4">
                <img
                  src={getQrCodeUrl(current.qrText)}
                  alt="扫码下载"
                  className="w-40 h-40"
                />
              </div>
              <p className="text-sm text-gray-400 text-center">手机扫描二维码下载</p>
              <p className="text-xs text-gray-500 mt-2 text-center max-w-[200px]">
                或在手机浏览器中打开此页面
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          网页版 vs App
        </h2>
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-3xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-4 text-left text-gray-400 font-medium">功能</th>
                  <th className="p-4 text-center text-gray-400 font-medium">网页版</th>
                  <th className="p-4 text-center text-primary font-bold">App 版</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: '影视播放', web: true, app: true },
                  { feature: '短剧竖屏', web: '部分', app: '完整' },
                  { feature: 'AI 摘要', web: true, app: true },
                  { feature: '弹幕互动', web: true, app: true },
                  { feature: '离线缓存', web: false, app: true },
                  { feature: '推送通知', web: false, app: true },
                  { feature: '画中画', web: '部分', app: '完整' },
                  { feature: 'TV 遥控器', web: false, app: true },
                  { feature: '投屏', web: false, app: true },
                ].map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-gray-300">{row.feature}</td>
                    <td className="p-4 text-center">
                      {typeof row.web === 'boolean' ? (
                        row.web ? (
                          <span className="text-primary">✓</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )
                      ) : (
                        <span className="text-sm text-gray-400">{row.web}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {typeof row.app === 'boolean' ? (
                        row.app ? (
                          <span className="text-primary">✓</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )
                      ) : (
                        <span className="text-sm text-primary font-medium">{row.app}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          安装说明 & 常见问题
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Installation Steps */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-white/5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Android 安装步骤
            </h3>
            <ol className="space-y-3 text-sm text-gray-400">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                <span>点击下载按钮，获取 APK 安装包</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                <span>打开下载的 APK 文件</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                <span>点击 <strong className="text-white">"仍然安装"</strong> 或 <strong className="text-white">"允许本次安装"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
                <span>安装完成后打开 App，登录即可使用</span>
              </li>
            </ol>
            <p className="mt-4 text-xs text-gray-500">
              * Android 系统对非 Google Play 安装的应用会显示安全提示，这是正常的安全机制
            </p>
          </div>

          {/* FAQ */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-white/5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              常见问题
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-white mb-1">Q: 为什么安装时提示"不安全"？</p>
                <p className="text-gray-400">A: 这是 Android 系统的安全机制。我们是独立开发者，未通过 Google Play 发布，所以系统会提示。App 本身是安全的。</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Q: 安装后打不开怎么办？</p>
                <p className="text-gray-400">A: 请确保已开启"允许安装未知来源应用"（设置 → 安全 → 未知来源）。</p>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Q: 会自动更新吗？</p>
                <p className="text-gray-400">A: App 内会自动检测新版本并提示更新。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              5
            </div>
            <span className="font-bold">5572 影视</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2025 5572 影视 · 智能影视播放平台
          </p>
          <p className="text-gray-600 text-xs mt-2">
            本应用仅提供影视信息搜索服务，所有内容均来自第三方网站
          </p>
        </div>
      </div>
    </div>
  );
}
