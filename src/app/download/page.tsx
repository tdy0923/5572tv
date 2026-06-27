'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, Play, Star, Users, ChevronRight, Check, Smartphone, Tv, Monitor } from 'lucide-react';
import { detectPlatform } from './utils';
import InstallGuide from './components/InstallGuide';
import PhonePreview from './components/PhonePreview';
import CoolFeatures from './components/CoolFeatures';
import AnimatedGradient from './components/AnimatedGradient';

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | 'tv'>(platform === 'ios' ? 'ios' : platform === 'tv' ? 'tv' : 'android');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const platforms = [
    { id: 'android' as const, name: 'Android', icon: Smartphone, desc: 'APK下载', size: '65MB' },
    { id: 'ios' as const, name: 'iOS', icon: Smartphone, desc: 'PWA安装', size: '无需下载' },
    { id: 'tv' as const, name: 'TV', icon: Tv, desc: '电视版', size: '65MB' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center">
        {/* 动画渐变背景 */}
        <AnimatedGradient />
        
        {/* 背景图片 */}
        <div className="absolute inset-0">
          <Image
            src="/images/agnes/epic-bg.png"
            alt=""
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/90 to-[#0a0a0a]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-16">
          <div className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* 左侧内容 */}
            <div className="flex-1 text-center lg:text-left">
              {/* 品牌 */}
              <div className="flex items-center gap-3 mb-6 justify-center lg:justify-start">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="5572"
                  width={48}
                  height={48}
                  className="rounded-xl"
                />
                <div>
                  <span className="text-xl font-bold text-white">5572 影视</span>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span>4.8</span>
                    <span>·</span>
                    <span>10万+用户</span>
                  </div>
                </div>
              </div>

              {/* 标题 */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                想看的，
                <br />
                <span className="text-[#f4c24d]">这里都有</span>
              </h1>

              <p className="text-lg text-gray-400 mb-6 max-w-lg">
                海量影视资源聚合，AI智能搜索推荐。
                <br />
                支持手机、平板、电视全平台。
              </p>

              {/* 数据 */}
              <div className="flex gap-6 mb-8 justify-center lg:justify-start">
                {[
                  { value: '100万+', label: '影视资源' },
                  { value: '50+', label: '播放源' },
                  { value: '24h', label: '实时更新' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-xl font-bold text-[#f4c24d]">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* 平台选择 */}
              <div className="flex gap-2 mb-6 justify-center lg:justify-start">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedPlatform === p.id
                        ? 'bg-[#f4c24d] text-black'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    <p.icon className="w-4 h-4" />
                    {p.name}
                  </button>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                {selectedPlatform === 'ios' ? (
                  <button
                    onClick={() => setShowGuide(true)}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold hover:bg-[#d89c18] transition-colors min-h-[56px]"
                  >
                    添加到主屏幕
                  </button>
                ) : (
                  <a
                    href="/download/5572tv-android.apk"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold hover:bg-[#d89c18] transition-colors min-h-[56px]"
                  >
                    <Download className="w-5 h-5" />
                    下载 {platforms.find(p => p.id === selectedPlatform)?.name}
                  </a>
                )}
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors min-h-[56px]"
                >
                  网页版体验
                </Link>
              </div>

              <p className="text-xs text-gray-500 mt-4 justify-center lg:justify-start flex">
                v1.5.0 · {platforms.find(p => p.id === selectedPlatform)?.size}
              </p>
            </div>

            {/* 右侧APP预览 */}
            <div className={`flex-1 flex justify-center lg:justify-end transition-all duration-700 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
              <PhonePreview />
            </div>
          </div>
        </div>
      </section>

      {/* 功能特性 - 炫酷组件 */}
      <CoolFeatures />

      {/* 安装说明 */}
      <section className="py-16 px-6 sm:px-12 lg:px-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">
                {selectedPlatform === 'ios' ? 'iOS 安装' : '安装步骤'}
              </h2>
              <div className="space-y-4">
                {(selectedPlatform === 'ios' ? [
                  '用 Safari 打开此页面',
                  '点击底部「分享」按钮',
                  '选择「添加到主屏幕」',
                  '点击「添加」完成',
                ] : [
                  '点击下载按钮',
                  '打开下载的文件',
                  '点击「仍然安装」',
                  '安装完成，打开使用',
                ]).map((step, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-300">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">核心功能</h2>
              <div className="space-y-3">
                {[
                  '多源聚合播放',
                  'AI智能搜索推荐',
                  '弹幕互动',
                  '离线缓存',
                  '多端同步',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-300">
                    <Check className="w-5 h-5 text-[#f4c24d] flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 sm:px-12 lg:px-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon-192x192.png" alt="5572" width={24} height={24} className="rounded" />
            <span className="text-sm text-gray-400">5572 影视 © 2025</span>
          </div>
          <p className="text-xs text-gray-500">仅提供影视信息搜索服务</p>
        </div>
      </footer>

      {/* 安装引导 */}
      {showGuide && (
        <InstallGuide platform={selectedPlatform} onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}
