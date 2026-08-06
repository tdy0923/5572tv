'use client';

import { Check, Link2, Share2, Twitter } from 'lucide-react';
import { useState } from 'react';

const SHARE_URL = 'https://www.5572.net/download';

export default function ShareSection() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: '5572 影视 - 海量影视资源聚合',
        text: '想看的这里都有，免费聚合播放，支持手机、平板、电视全平台。',
        url: SHARE_URL,
      });
    } catch {}
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动复制网址');
    }
  };

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    '5572 影视 - 想看的这里都有',
  )}&url=${encodeURIComponent(SHARE_URL)}`;

  return (
    <section className='py-16 px-6 bg-[#0e0e0e] border-t border-white/5'>
      <div className='max-w-3xl mx-auto text-center'>
        <h2 className='text-2xl font-bold text-white mb-3'>分享给朋友</h2>
        <p className='text-sm text-gray-400 mb-8'>
          好用的影视应用，值得让更多人看到
        </p>

        <div className='flex flex-wrap items-center justify-center gap-3'>
          {navigator.share && (
            <button
              type='button'
              onClick={handleNativeShare}
              className='inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
              style={{
                background: 'linear-gradient(135deg, #f4c24d, #dba52b)',
                color: '#1a1a1a',
                boxShadow: '0 4px 16px rgba(244,194,77,0.3)',
              }}
            >
              <Share2 className='w-4 h-4' />
              立即分享
            </button>
          )}

          <button
            type='button'
            onClick={copyLink}
            className='inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#d4d4d4',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {copied ? (
              <Check className='w-4 h-4' style={{ color: '#f4c24d' }} />
            ) : (
              <Link2 className='w-4 h-4' />
            )}
            {copied ? '已复制' : '复制链接'}
          </button>

          <a
            href={twitterHref}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#d4d4d4',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Twitter className='w-4 h-4' style={{ color: '#f4c24d' }} />
            Twitter / X
          </a>
        </div>

        {error && (
          <p className='mt-4 text-xs' style={{ color: '#f87171' }}>
            {error}
          </p>
        )}

        <p className='mt-6 text-xs text-gray-600 select-all'>{SHARE_URL}</p>
      </div>
    </section>
  );
}
