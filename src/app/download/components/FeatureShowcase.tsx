'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const features = [
  {
    icon: '/images/agnes/icon-speed.png',
    title: '极速播放',
    desc: '多源聚合，秒开无广告',
    gradient: 'from-yellow-500/20 to-orange-500/20',
  },
  {
    icon: '/images/agnes/icon-download.png',
    title: '离线缓存',
    desc: 'WiFi下载，离线观看',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    icon: '/images/agnes/icon-sync.png',
    title: '多端同步',
    desc: '进度漫游，无缝衔接',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    icon: '/images/agnes/icon-ai.png',
    title: 'AI 推荐',
    desc: '智能分析，精准推荐',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
];

export default function FeatureShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-20 px-4 relative">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-30">
        <Image
          src="/images/agnes/holographic.png"
          alt=""
          fill
          className="object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-[#0a0a0a]/80" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-white">
          核心功能
        </h2>
        <p className="text-center text-gray-400 mb-12">
          为极致观影体验而生
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div 
              key={i}
              className={`group relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#f4c24d]/30 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-[#f4c24d]/10 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* 背景渐变 */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="w-16 h-16 mb-4 rounded-2xl overflow-hidden shadow-lg">
                  <Image
                    src={f.icon}
                    alt={f.title}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>

              {/* 悬停发光效果 */}
              <div className="absolute inset-0 rounded-2xl bg-[#f4c24d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
