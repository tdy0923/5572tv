'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, ChevronRight, Play, Star, Check } from 'lucide-react';
import { detectPlatform } from './utils';
import InstallGuide from './components/InstallGuide';

// Netflix风格：内容为王，UI最小化
export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | 'tv' | 'desktop'>(platform);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'tv'>(selectedPlatform as any || 'android');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero - 全屏电影海报风格 */}
      <section className="relative h-screen">
        {/* 背景海报 */}
        <div className="absolute inset-0">
          <Image
            src="/images/agnes/epic-bg.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
        </div>

        {/* 内容 */}
        <div className="relative h-full flex items-end pb-24 px-6 sm:px-12 lg:px-20">
          <div className="max-w-2xl">
            {/* 品牌标识 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#f4c24d] rounded-lg flex items-center justify-center">
                <span className="text-lg font-black text-black">5</span>
              </div>
              <span className="text-sm font-medium text-gray-300">5572 影视</span>
            </div>

            {/* 标题 */}
            <h1 className="text-5xl sm:text-7xl font-black mb-4 leading-none">
              海量影视
              <br />
              <span className="text-[#f4c24d]">尽在掌握</span>
            </h1>

            {/* 描述 */}
            <p className="text-lg text-gray-300 mb-6 max-w-lg">
              100万+影视资源，AI智能搜索，多源聚合播放。
              <br />
              支持手机、平板、电视全平台。
            </p>

            {/* 数据 */}
            <div className="flex gap-6 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#f4c24d]">100万+</div>
                <div className="text-xs text-gray-400">影视资源</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#f4c24d]">50+</div>
                <div className="text-xs text-gray-400">播放源</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#f4c24d]">9.2</div>
                <div className="text-xs text-gray-400">平均评分</div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              {activeTab === 'ios' ? (
                <button
                  onClick={() => setShowGuide(true)}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-lg font-bold text-lg hover:bg-gray-200 transition-colors min-h-[56px]"
                >
                  添加到主屏幕
                </button>
              ) : (
                <a
                  href="/download/5572tv-android.apk"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-lg font-bold text-lg hover:bg-gray-200 transition-colors min-h-[56px]"
                >
                  <Download className="w-5 h-5" />
                  下载
                </a>
              )}
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white rounded-lg font-bold text-lg hover:bg-white/20 transition-colors min-h-[56px]"
              >
                网页版体验
              </Link>
            </div>

            {/* 版本信息 */}
            <p className="text-xs text-gray-500 mt-4">
              v1.5.0 · 65MB · Android 5.0+ / iOS PWA
            </p>
          </div>
        </div>
      </section>

      {/* 平台选择 - Netflix风格标签 */}
      <section className="px-6 sm:px-12 lg:px-20 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 mb-8">
            {(['android', 'ios', 'tv'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {tab === 'android' ? 'Android' : tab === 'ios' ? 'iOS' : 'TV'}
              </button>
            ))}
          </div>

          {/* 平台内容 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 安装说明 */}
            <div className="md:col-span-2">
              <h2 className="text-xl font-bold mb-4">
                {activeTab === 'ios' ? '添加到主屏幕' : '安装步骤'}
              </h2>
              <div className="space-y-3">
                {(activeTab === 'ios' ? [
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
                  <div key={i} className="flex items-center gap-3 text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* 功能列表 */}
            <div>
              <h2 className="text-xl font-bold mb-4">核心功能</h2>
              <div className="space-y-3">
                {[
                  '多源聚合播放',
                  'AI智能搜索推荐',
                  '弹幕互动',
                  '离线缓存',
                  '多端同步',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-300">
                    <Check className="w-4 h-4 text-[#f4c24d]" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 底部信息 */}
      <footer className="px-6 sm:px-12 lg:px-20 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#f4c24d] rounded flex items-center justify-center">
              <span className="text-sm font-black text-black">5</span>
            </div>
            <span className="text-sm text-gray-400">5572 影视 © 2025</span>
          </div>
          <p className="text-xs text-gray-500">仅提供影视信息搜索服务</p>
        </div>
      </footer>

      {/* 安装引导弹窗 */}
      {showGuide && (
        <InstallGuide
          platform={activeTab}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}
