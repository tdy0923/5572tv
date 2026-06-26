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
    <section className="relative min-h-screen flex items-center">
      {/* 简洁背景 - 渐变而非花哨 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
      
      {/* 微妙的装饰 - 只有一个光晕 */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#f4c24d]/5 rounded-full blur-[150px]" />

      <div className={`relative z-10 w-full max-w-6xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16 transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* 左侧：文字内容 */}
        <div className="flex-1 text-center lg:text-left">
          {/* Logo */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#f4c24d] flex items-center justify-center">
              <span className="text-2xl font-black text-black">5</span>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">5572</span>
          </div>

          {/* 标题 - 大但不夸张 */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            影视
            <br />
            <span className="text-[#f4c24d]">播放平台</span>
          </h1>
          
          <p className="text-lg text-gray-400 mb-10 max-w-md leading-relaxed">
            海量资源，AI搜索，多端同步。<br />
            为你打造极致的观影体验。
          </p>

          {/* CTA */}
          {isIOS ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onShowGuide}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold text-base hover:bg-[#d89c18] transition-colors min-h-[56px]"
              >
                添加到主屏幕
                <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-500 self-center">Safari → 分享 → 添加到主屏幕</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/download/5572tv-android.apk"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold text-base hover:bg-[#d89c18] transition-colors min-h-[56px]"
              >
                <Download className="w-5 h-5" />
                下载 APK
              </a>
              <span className="text-sm text-gray-500 self-center">v1.5.0 · 65MB</span>
            </div>
          )}
        </div>

        {/* 右侧：产品预览 */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="relative">
            {/* 手机框 */}
            <div className="w-72 h-[480px] bg-[#1a1a1a] rounded-[3rem] border-2 border-gray-800 p-3 shadow-2xl">
              <div className="w-full h-full rounded-[2.5rem] overflow-hidden bg-black">
                <Image
                  src="/images/agnes/phone-mockup.png"
                  alt="App Preview"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            
            {/* 装饰光效 */}
            <div className="absolute -inset-10 bg-[#f4c24d]/5 rounded-full blur-[80px] -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
