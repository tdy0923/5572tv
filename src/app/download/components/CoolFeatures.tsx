'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, Download, RefreshCw, Brain } from 'lucide-react';

/**
 * 炫酷功能展示组件
 * 微妙动画 + 数据展示 + 发光效果
 */
export default function CoolFeatures() {
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

  const features = [
    { icon: <Zap className="w-6 h-6" />, title: '极速播放', value: '0.5', unit: '秒', desc: '平均加载时间' },
    { icon: <Download className="w-6 h-6" />, title: '离线缓存', value: '100', unit: '万+', desc: '已缓存内容' },
    { icon: <RefreshCw className="w-6 h-6" />, title: '多端同步', value: '3', unit: '台', desc: '设备同时在线' },
    { icon: <Brain className="w-6 h-6" />, title: 'AI 推荐', value: '98', unit: '%', desc: '推荐准确率' },
  ];

  return (
    <section ref={ref} className="py-20 px-6 sm:px-12 lg:px-20 bg-[#111]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">为什么选择 5572</h2>
          <p className="text-gray-400">为极致观影体验而生</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div 
              key={i}
              className={`relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden group hover:border-[#f4c24d]/30 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* 发光背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#f4c24d]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#f4c24d]/10 flex items-center justify-center text-[#f4c24d] mb-4 group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                
                {/* 数字动画 */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-[#f4c24d]">{f.value}</span>
                  <span className="text-lg text-[#f4c24d]/70">{f.unit}</span>
                </div>
                
                <p className="text-sm text-gray-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
