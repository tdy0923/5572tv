'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Smartphone, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  platform: string;
  onShowGuide: () => void;
}

export default function HeroSection({ platform, onShowGuide }: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const isIOS = platform === 'ios';

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 背景图 */}
      <div className="absolute inset-0">
        <Image
          src="/images/agnes/epic-bg.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0a0a0a]" />
      </div>

      {/* 动态光效 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f4c24d]/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />

      {/* 网格线效果 */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(244,194,77,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(244,194,77,0.3) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      <div className={`relative z-10 text-center px-6 max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Logo */}
        <div className="relative inline-block mb-8">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[#f4c24d] to-[#d89c18] flex items-center justify-center shadow-2xl shadow-[#f4c24d]/40">
            <span className="text-5xl font-black text-black">5</span>
          </div>
          <div className="absolute -inset-4 bg-[#f4c24d]/20 rounded-3xl blur-xl animate-pulse" />
        </div>

        {/* 标题 */}
        <h1 className="text-6xl sm:text-8xl font-black mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-white via-[#f4c24d] to-white bg-clip-text text-transparent">
            5572
          </span>
        </h1>
        <p className="text-2xl sm:text-3xl text-gray-300 mb-2 font-light">
          影视
        </p>
        <p className="text-lg text-gray-400 mb-12">
          智能影视播放平台 · 海量资源 · AI驱动
        </p>

        {/* CTA按钮 */}
        {isIOS ? (
          <div className="space-y-4">
            <button
              onClick={onShowGuide}
              className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#f4c24d]/40 min-h-[60px]"
            >
              <span className="relative z-10">添加到主屏幕</span>
              <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-sm text-gray-500">Safari 打开后添加到主屏幕</p>
          </div>
        ) : (
          <div className="space-y-4">
            <a
              href="/download/5572tv-android.apk"
              className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#f4c24d]/40 min-h-[60px]"
            >
              <Download className="w-6 h-6 relative z-10" />
              <span className="relative z-10">立即下载</span>
              <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <p className="text-sm text-gray-500">v1.5.0 · 65MB · Android 5.0+</p>
            <button
              onClick={onShowGuide}
              className="text-[#f4c24d] hover:underline text-sm"
            >
              安装遇到问题？点击查看帮助 →
            </button>
          </div>
        )}
      </div>

      {/* 手机模型 */}
      <div className={`absolute right-0 bottom-0 w-1/3 max-w-md opacity-80 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-80 translate-x-0' : 'opacity-0 translate-x-10'}`}>
        <Image
          src="/images/agnes/phone-mockup.png"
          alt="App Preview"
          width={400}
          height={300}
          className="object-contain drop-shadow-2xl"
        />
      </div>

      {/* 向下滚动提示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-gray-600 flex justify-center pt-2">
          <div className="w-1 h-2 bg-gray-500 rounded-full" />
        </div>
      </div>
    </section>
  );
}
