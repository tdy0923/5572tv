'use client';

import { Download, Smartphone, Tv, ArrowRight, Monitor, Check } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import DynamicBackground from '@/components/download/DynamicBackground';

function detectPlatform(): 'android' | 'ios' | 'tv' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/smart tv|android tv|roku|fire tv/i.test(ua)) return 'tv';
  return 'desktop';
}

const platforms = [
  { id: 'android', name: 'Android', icon: Smartphone, desc: 'APK 安装包', size: '65MB', version: 'v1.5.0' },
  { id: 'ios', name: 'iOS', icon: Smartphone, desc: 'PWA 网页应用', size: '-', version: 'v1.5.0' },
  { id: 'tv', name: 'TV', icon: Tv, desc: '电视版 APK', size: '65MB', version: 'v1.5.0' },
];

const features = [
  { icon: '⚡', title: '极速播放', desc: '多源聚合，秒开无广告' },
  { icon: '📥', title: '离线缓存', desc: 'WiFi下载，离线观看' },
  { icon: '🔄', title: '多端同步', desc: '手机、平板、电视进度同步' },
  { icon: '🤖', title: 'AI 推荐', desc: '智能分析喜好，精准推荐' },
];

export default function DownloadPage() {
  const detected = useMemo(() => detectPlatform(), []);
  const [active, setActive] = useState<'android' | 'ios' | 'tv' | 'desktop'>(detected);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <DynamicBackground />
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
          <p className="text-gray-400 text-lg mb-10">
            智能影视播放平台
          </p>

          {/* Platform Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active === p.id
                    ? 'bg-[#f4c24d] text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <p.icon className="w-4 h-4" />
                {p.name}
              </button>
            ))}
          </div>

          {/* Download Button */}
          {active === 'ios' ? (
            <div className="space-y-3">
              <a
                href="/"
                className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#f4c24d]/30 min-h-[56px]"
              >
                立即体验
                <ArrowRight className="w-5 h-5" />
              </a>
              <p className="text-sm text-gray-500">Safari 打开后「添加到主屏幕」</p>
            </div>
          ) : (
            <div className="space-y-3">
              <a
                href="/download/5572tv-android.apk"
                className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#f4c24d]/30 min-h-[56px]"
              >
                <Download className="w-5 h-5" />
                下载 {platforms.find(p => p.id === active)?.name} 版
              </a>
              <p className="text-sm text-gray-500">
                {platforms.find(p => p.id === active)?.version} · {platforms.find(p => p.id === active)?.size} · {platforms.find(p => p.id === active)?.desc}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#f4c24d]/20 transition-all">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold mt-3 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* iOS Install */}
      {active === 'ios' && (
        <section className="py-16 px-4 border-t border-white/5">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-8">添加到主屏幕</h2>
            <div className="flex justify-center gap-6 sm:gap-12">
              {[
                { step: '1', text: 'Safari 打开网站' },
                { step: '2', text: '点击分享按钮' },
                { step: '3', text: '选择「添加到主屏幕」' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center font-bold">{s.step}</div>
                  <p className="text-sm text-gray-400">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-8">常见问题</h2>
          <div className="space-y-4">
            {[
              { q: '安装时提示"不安全"？', a: '这是 Android 安全机制，点击"仍然安装"即可。' },
              { q: 'iOS 如何安装？', a: '使用 PWA 方式：Safari 打开网站，添加到主屏幕。' },
              { q: '会自动更新吗？', a: 'App 内自动检测新版本并提示更新。' },
            ].map((faq, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="font-medium mb-1">{faq.q}</p>
                <p className="text-sm text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-white/5 text-center">
        <p className="text-xs text-gray-600">© 2025 5572 影视 · 仅提供影视信息搜索服务</p>
      </footer>
    </div>
  );
}
