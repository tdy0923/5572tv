'use client';

import { Download, Smartphone, ArrowRight, Check, Sparkles, Shield, Zap, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import DynamicBackground from '@/components/download/DynamicBackground';

function detectPlatform(): 'android' | 'ios' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'desktop';
}

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero */}
      <div className="relative min-h-[85vh] flex items-center justify-center">
        <DynamicBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
        
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          {/* Logo */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f4c24d] to-[#d89c18] flex items-center justify-center shadow-lg shadow-[#f4c24d]/20">
              <span className="text-2xl font-bold text-black">5</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl font-bold mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              5572 影视
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-400 mb-2">
            智能影视播放平台
          </p>
          <p className="text-sm text-gray-500 mb-12">
            海量资源 · AI搜索 · 弹幕互动 · 多端同步
          </p>

          {/* CTA */}
          {platform === 'ios' ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                iOS 用户直接使用网页版
              </div>
              <div>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-[#f4c24d]/25"
                >
                  立即体验
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
              <p className="text-xs text-gray-500">
                Safari → 分享 → 添加到主屏幕
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <a
                href="/download/5572tv-android.apk"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-[#f4c24d]/25"
              >
                <Download className="w-5 h-5" />
                下载 Android 版
              </a>
              <p className="text-xs text-gray-500">
                v1.5.0 · 65MB · 支持 Android 5.0+
              </p>
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-gray-600 flex justify-center pt-2">
            <div className="w-1 h-2 bg-gray-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="relative py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: '极速播放', desc: '秒开无广告' },
              { icon: Shield, label: '离线缓存', desc: 'WiFi下载' },
              { icon: Wifi, label: '多端同步', desc: '进度漫游' },
              { icon: Sparkles, label: 'AI推荐', desc: '智能片源' },
            ].map((f, i) => (
              <div key={i} className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#f4c24d]/30 hover:bg-[#f4c24d]/5 transition-all duration-300">
                <f.icon className="w-6 h-6 text-[#f4c24d] mb-3" />
                <h3 className="font-semibold text-white mb-1">{f.label}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Install Guide - iOS */}
      {platform === 'ios' && (
        <div className="py-16 px-6 border-t border-white/5">
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-xl font-bold mb-6">添加到主屏幕</h2>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              {['Safari 打开', '点击分享', '添加到主屏幕', '完成'].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-xs text-gray-600">
          © 2025 5572 影视 · 仅提供影视信息搜索服务
        </p>
      </div>
    </div>
  );
}
