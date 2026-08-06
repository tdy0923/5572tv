'use client';

import { Maximize2, Monitor, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ScreenshotsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [loaded, setLoaded] = useState<Record<'mobile' | 'desktop', boolean>>({
    mobile: false,
    desktop: false,
  });
  const [lightbox, setLightbox] = useState<null | 'mobile' | 'desktop'>(null);
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

  const handleLoad = (key: 'mobile' | 'desktop') => {
    setLoaded((prev) => ({ ...prev, [key]: true }));
  };

  const frames = [
    {
      key: 'mobile' as const,
      label: '手机端',
      icon: <Smartphone className='w-4 h-4' />,
      frameClass: 'aspect-[9/19] w-full max-w-[260px]',
      chromeClass: 'rounded-[2.2rem] border-[5px] border-gray-700',
      iframeClass: '',
    },
    {
      key: 'desktop' as const,
      label: '网页端',
      icon: <Monitor className='w-4 h-4' />,
      frameClass: 'aspect-video w-full',
      chromeClass: 'rounded-2xl border-[5px] border-gray-700',
      iframeClass: '',
    },
  ];

  return (
    <section ref={ref} className='py-20 px-6 bg-[#0e0e0e]'>
      <div className='max-w-6xl mx-auto'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-white mb-3'>界面预览</h2>
          <p className='text-gray-400'>手机、网页双端真实界面，所见即所得</p>
        </div>

        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-start transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {frames.map((f, i) => (
            <div
              key={f.key}
              className='flex flex-col items-center'
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className='flex items-center gap-2 mb-4'>
                {f.icon}
                <span className='text-sm font-medium text-white'>
                  {f.label}
                </span>
              </div>

              <button
                type='button'
                onClick={() => setLightbox(f.key)}
                title='点击放大'
                className={`group relative block overflow-hidden text-left bg-[#0a0a0a] shadow-2xl transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99] ${f.frameClass} ${f.chromeClass}`}
              >
                {!loaded[f.key] && (
                  <div className='absolute inset-0 flex flex-col items-center justify-center gap-3'>
                    <div className='w-8 h-8 rounded-full border-2 border-[#f4c24d]/30 border-t-[#f4c24d] animate-spin' />
                    <span className='text-xs text-gray-500'>加载中...</span>
                  </div>
                )}
                <iframe
                  src='/'
                  title={`5572 影视 ${f.label}预览`}
                  className={`h-full w-full border-0 bg-white ${loaded[f.key] ? '' : 'opacity-0'} transition-opacity duration-300 ${f.iframeClass}`}
                  onLoad={() => handleLoad(f.key)}
                  loading='lazy'
                />
                <span className='absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100'>
                  <Maximize2 className='w-3 h-3' />
                  点击放大
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'
          onClick={() => setLightbox(null)}
        >
          <div
            className='relative max-h-[90vh] max-w-5xl w-full'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className='absolute -top-10 right-0 flex items-center gap-1.5 text-sm text-white/80 hover:text-white'
            >
              关闭
            </button>
            <div
              className={`mx-auto bg-[#0a0a0a] shadow-2xl ${
                lightbox === 'mobile'
                  ? 'aspect-[9/19] max-w-[300px] rounded-[2.5rem] border-[6px] border-gray-700'
                  : 'aspect-video rounded-2xl border-[6px] border-gray-700'
              }`}
            >
              <iframe
                src='/'
                title='5572 影视 界面预览（放大）'
                className='h-full w-full border-0 bg-white'
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
