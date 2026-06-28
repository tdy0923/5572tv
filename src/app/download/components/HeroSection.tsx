'use client';

import { Download, Play, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import PhonePreview from './PhonePreview';

interface HeroSectionProps {
  platform: string;
  onShowGuide: () => void;
}

export default function HeroSection({
  platform,
  onShowGuide,
}: HeroSectionProps) {
  const [isVisible] = useState(true);

  return (
    <section className='relative min-h-screen flex items-center bg-[#0a0a0a]'>
      {/* 高级背景 */}
      <div className='absolute inset-0'>
        <Image
          src='/images/agnes/epic-bg.png'
          alt=''
          fill
          className='object-cover opacity-40'
          priority
        />
        <div className='absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent' />
        <div className='absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50' />
      </div>

      <div className='relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-12'>
        {/* 顶部导航 */}
        <div
          className={`flex items-center justify-between mb-8 transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className='flex items-center gap-3'>
            <Image
              src='/icons/icon-192x192.png'
              alt='5572'
              width={40}
              height={40}
              className='rounded-xl'
            />
            <span className='text-lg font-semibold text-white'>5572 影视</span>
          </div>
          <div className='flex items-center gap-4 text-sm text-gray-400'>
            <span className='flex items-center gap-1'>
              <Star className='w-4 h-4 text-yellow-400 fill-yellow-400' />
              4.8
            </span>
            <span className='flex items-center gap-1'>
              <Users className='w-4 h-4' />
              10万+
            </span>
          </div>
        </div>

        {/* 主内容 - 两列布局 */}
        <div
          className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* 左侧：文字内容 */}
          <div className='flex-1 text-center lg:text-left'>
            <div className='inline-flex items-center gap-2 px-3 py-1 bg-[#f4c24d]/10 rounded-full text-[#f4c24d] text-sm font-medium mb-4'>
              <Play className='w-3 h-3 fill-current' />
              正在热播
            </div>

            <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight'>
              想看的，
              <br />
              <span className='text-[#f4c24d]'>这里都有</span>
            </h1>

            <p className='text-lg text-gray-400 mb-6 max-w-lg'>
              海量影视资源聚合，AI智能搜索推荐，让每一次观影都是享受。
            </p>

            {/* 数据 */}
            <div className='flex gap-8 mb-8 justify-center lg:justify-start'>
              <div>
                <div className='text-2xl font-bold text-[#f4c24d]'>100万+</div>
                <div className='text-xs text-gray-500'>影视资源</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-[#f4c24d]'>50+</div>
                <div className='text-xs text-gray-500'>播放源</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-[#f4c24d]'>24h</div>
                <div className='text-xs text-gray-500'>实时更新</div>
              </div>
            </div>

            {/* CTA */}
            <div className='flex flex-col sm:flex-row gap-3'>
              {platform === 'ios' ? (
                <button
                  onClick={onShowGuide}
                  className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold hover:bg-[#d89c18] transition-colors min-h-[56px]'
                >
                  添加到主屏幕
                </button>
              ) : (
                <a
                  href='/download/5572tv-android.apk'
                  className='inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#f4c24d] text-black rounded-xl font-semibold hover:bg-[#d89c18] transition-colors min-h-[56px]'
                >
                  <Download className='w-5 h-5' />
                  下载 APK
                </a>
              )}
              <span className='text-sm text-gray-500 self-center'>
                v1.6.0 · 65MB
              </span>
            </div>
          </div>

          {/* 右侧：手机预览 - 确保可见 */}
          <div
            className={`flex-1 flex justify-center lg:justify-end transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            <PhonePreview />
          </div>
        </div>
      </div>
    </section>
  );
}
