'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Zap, Download, RefreshCw, Brain } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: '极速播放',
    desc: '多源聚合，秒开无广告',
    color: 'text-yellow-400',
  },
  {
    icon: <Download className="w-6 h-6" />,
    title: '离线缓存',
    desc: 'WiFi下载，随时观看',
    color: 'text-blue-400',
  },
  {
    icon: <RefreshCw className="w-6 h-6" />,
    title: '多端同步',
    desc: '进度漫游，无缝衔接',
    color: 'text-purple-400',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'AI 推荐',
    desc: '智能分析，精准推荐',
    color: 'text-green-400',
  },
];

export default function FeatureShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            为什么选择 5572
          </h2>
          <p className="text-gray-400 text-lg">
            为极致观影体验而生
          </p>
        </div>

        {/* 功能网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div 
              key={i}
              className={`text-center transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
