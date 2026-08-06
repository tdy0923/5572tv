'use client';

import {
  Brain,
  Download,
  Layers,
  MonitorPlay,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const reasons = [
  {
    icon: <Layers className='w-5 h-5' />,
    title: '聚合 50+ 播放源',
    desc: '一个入口看全网资源，失效自动切换，从此告别到处找资源。',
  },
  {
    icon: <MonitorPlay className='w-5 h-5' />,
    title: '影视 + 短剧全覆盖',
    desc: '电影、电视剧、动漫、综艺、短剧一网打尽，还支持弹幕互动。',
  },
  {
    icon: <Brain className='w-5 h-5' />,
    title: 'AI 智能推荐',
    desc: '根据你的观影喜好智能推荐，AI 搜索也能秒懂模糊片名。',
  },
  {
    icon: <Download className='w-5 h-5' />,
    title: '离线缓存',
    desc: 'WiFi 下提前缓存，通勤路上无网络也能流畅观看。',
  },
  {
    icon: <RefreshCw className='w-5 h-5' />,
    title: '多端同步',
    desc: '网页、手机、平板、电视进度与收藏自动同步，无缝切换。',
  },
  {
    icon: <ShieldCheck className='w-5 h-5' />,
    title: '免费且安全',
    desc: '无需付费即可享受全部功能，播放记录和收藏数据本地加密。',
  },
];

export default function RecommendationsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className='py-20 px-6 bg-[#0a0a0a]'>
      <div className='max-w-5xl mx-auto'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-white mb-3'>
            为什么推荐 5572
          </h2>
          <p className='text-gray-400'>不只是播放器，是你的私人影视管家</p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`rounded-xl border border-white/5 bg-white/[0.03] p-5 transition-all duration-300 hover:border-[#f4c24d]/20 hover:bg-white/[0.05] ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className='w-10 h-10 rounded-lg bg-[#f4c24d]/10 flex items-center justify-center text-[#f4c24d] mb-4'>
                {r.icon}
              </div>
              <h3 className='font-semibold text-white mb-1.5'>{r.title}</h3>
              <p className='text-sm leading-relaxed text-gray-400'>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
