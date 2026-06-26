'use client';

import { Download, Smartphone, Tv } from 'lucide-react';

interface HeroSectionProps {
  platform: 'android' | 'ios' | 'tv' | 'desktop';
  onShowGuide: () => void;
}

export default function HeroSection({ platform, onShowGuide }: HeroSectionProps) {
  const isIOS = platform === 'ios';

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]" />
      
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[#f4c24d] to-[#d89c18] flex items-center justify-center shadow-2xl shadow-[#f4c24d]/30">
          <span className="text-4xl font-black text-black">5</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-black mb-3 tracking-tight">
          5572 影视
        </h1>
        <p className="text-gray-400 text-lg mb-10">智能影视播放平台</p>

        {/* CTA Button */}
        {isIOS ? (
          <div className="space-y-4">
            <button
              onClick={onShowGuide}
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#f4c24d]/30 min-h-[56px]"
            >
              添加到主屏幕
            </button>
            <p className="text-sm text-gray-500">Safari 打开后添加到主屏幕使用</p>
          </div>
        ) : (
          <div className="space-y-4">
            <a
              href="/download/5572tv-android.apk"
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#f4c24d]/30 min-h-[56px]"
            >
              <Download className="w-5 h-5" />
              下载 APK
            </a>
            <p className="text-sm text-gray-500">v1.5.0 · 65MB · Android 5.0+</p>
            <button
              onClick={onShowGuide}
              className="text-sm text-[#f4c24d] hover:underline"
            >
              安装遇到问题？点击查看帮助 →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
