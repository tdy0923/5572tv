'use client';

import Image from 'next/image';

const features = [
  {
    icon: '/images/agnes/icon-speed.png',
    title: '极速播放',
    desc: '多源聚合，秒开无广告',
  },
  {
    icon: '/images/agnes/icon-download.png',
    title: '离线缓存',
    desc: 'WiFi下载，离线观看',
  },
  {
    icon: '/images/agnes/icon-sync.png',
    title: '多端同步',
    desc: '进度漫游，无缝衔接',
  },
  {
    icon: '/images/agnes/icon-ai.png',
    title: 'AI 推荐',
    desc: '智能分析，精准推荐',
  },
];

export default function AIFeatureShowcase() {
  return (
    <section className='py-16 px-4 bg-[#0a0a0a] border-t border-white/5'>
      <div className='max-w-4xl mx-auto'>
        <h2 className='text-xl font-bold text-center mb-8 text-white'>
          核心功能
        </h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
          {features.map((f) => (
            <div
              key={f.title}
              className='flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#f4c24d]/20 transition-all'
            >
              <div className='w-16 h-16 mb-4 rounded-2xl overflow-hidden'>
                <Image
                  src={f.icon}
                  alt={f.title}
                  width={64}
                  height={64}
                  className='object-cover'
                />
              </div>
              <h3 className='font-semibold text-white mb-1'>{f.title}</h3>
              <p className='text-sm text-gray-500'>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
