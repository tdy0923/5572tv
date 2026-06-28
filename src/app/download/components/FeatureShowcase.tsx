'use client';

import {
  Brain,
  Download,
  RefreshCw,
  Smartphone,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: <Zap className='w-5 h-5' />,
    title: '极速播放',
    desc: '多源聚合，秒开无缓冲',
    stat: '0.5s',
    statLabel: '平均加载',
  },
  {
    icon: <Download className='w-5 h-5' />,
    title: '离线缓存',
    desc: 'WiFi下载，随时随地',
    stat: '100万+',
    statLabel: '已缓存',
  },
  {
    icon: <RefreshCw className='w-5 h-5' />,
    title: '多端同步',
    desc: '手机、平板、电视无缝切换',
    stat: '3台',
    statLabel: '设备同步',
  },
  {
    icon: <Brain className='w-5 h-5' />,
    title: 'AI 推荐',
    desc: '智能分析你的观影喜好',
    stat: '98%',
    statLabel: '推荐准确率',
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
      { threshold: 0.2 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className='py-20 px-6 bg-[#111]'>
      <div className='max-w-5xl mx-auto'>
        {/* 标题 */}
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-white mb-3'>
            为什么选择 5572
          </h2>
          <p className='text-gray-400'>不只是播放器，是你的私人影视管家</p>
        </div>

        {/* 功能列表 */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`flex items-start gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#f4c24d]/20 transition-all duration-300 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className='w-10 h-10 rounded-lg bg-[#f4c24d]/10 flex items-center justify-center text-[#f4c24d] flex-shrink-0'>
                {f.icon}
              </div>
              <div className='flex-1'>
                <div className='flex items-center justify-between mb-1'>
                  <h3 className='font-semibold text-white'>{f.title}</h3>
                  <span className='text-lg font-bold text-[#f4c24d]'>
                    {f.stat}
                  </span>
                </div>
                <p className='text-sm text-gray-400'>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 设备支持 */}
        <div className='mt-12 text-center'>
          <p className='text-sm text-gray-500 mb-4'>支持所有设备</p>
          <div className='flex justify-center gap-6'>
            {[
              { icon: <Smartphone className='w-5 h-5' />, label: '手机' },
              { icon: <Tv className='w-5 h-5' />, label: '电视' },
              { icon: <Wifi className='w-5 h-5' />, label: '平板' },
            ].map((device) => (
              <div
                key={device.label}
                className='flex items-center gap-2 text-gray-400'
              >
                {device.icon}
                <span className='text-sm'>{device.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
