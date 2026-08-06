'use client';

import {
  Bug,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { changelog, ChangelogEntry } from '@/lib/changelog';
import { CURRENT_VERSION } from '@/lib/version';

const VISIBLE_VERSIONS = 3;

function EntryList({
  items,
  color,
}: {
  items: string[];
  color: 'green' | 'blue' | 'purple';
}) {
  if (items.length === 0) return null;
  const dotColor =
    color === 'green'
      ? 'bg-green-500'
      : color === 'blue'
        ? 'bg-blue-500'
        : 'bg-purple-500';
  return (
    <ul className='space-y-1.5'>
      {items.map((item, i) => (
        <li
          key={i}
          className='text-xs leading-relaxed text-gray-400 flex items-start gap-2'
        >
          <span
            className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColor}`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  const isCurrent = entry.version === CURRENT_VERSION;
  return (
    <div className='rounded-xl border border-white/5 bg-white/[0.03] p-5 hover:border-[#f4c24d]/20 transition-colors duration-200'>
      <div className='flex items-center justify-between gap-2 mb-4'>
        <div className='flex items-center gap-2.5'>
          <span className='text-base font-bold text-white'>
            v{entry.version}
          </span>
          {isCurrent && (
            <span
              className='px-2 py-0.5 rounded-full text-[10px] font-semibold'
              style={{ background: '#f4c24d', color: '#1a1a1a' }}
            >
              最新
            </span>
          )}
        </div>
        <span className='text-xs text-gray-500'>{entry.date}</span>
      </div>

      <div className='space-y-3'>
        {entry.added.length > 0 && (
          <div>
            <h5 className='flex items-center gap-1.5 text-xs font-semibold text-green-500 mb-2'>
              <Plus className='w-3.5 h-3.5' />
              新增功能
            </h5>
            <EntryList items={entry.added} color='green' />
          </div>
        )}
        {entry.changed.length > 0 && (
          <div>
            <h5 className='flex items-center gap-1.5 text-xs font-semibold text-blue-500 mb-2'>
              <RefreshCw className='w-3.5 h-3.5' />
              功能改进
            </h5>
            <EntryList items={entry.changed} color='blue' />
          </div>
        )}
        {entry.fixed.length > 0 && (
          <div>
            <h5 className='flex items-center gap-1.5 text-xs font-semibold text-purple-500 mb-2'>
              <Bug className='w-3.5 h-3.5' />
              问题修复
            </h5>
            <EntryList items={entry.fixed} color='purple' />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChangelogSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
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

  const visibleEntries = expanded
    ? changelog
    : changelog.slice(0, VISIBLE_VERSIONS);
  const canExpand = changelog.length > VISIBLE_VERSIONS;

  return (
    <section ref={ref} className='py-20 px-6 bg-[#0a0a0a]'>
      <div className='max-w-3xl mx-auto'>
        <div className='text-center mb-12'>
          <h2 className='flex items-center justify-center gap-2 text-3xl font-bold text-white mb-3'>
            <Sparkles className='w-6 h-6' style={{ color: '#f4c24d' }} />
            版本更新日志
          </h2>
          <p className='text-gray-400'>每次更新，都是为了更好的观影体验</p>
        </div>

        <div
          className={`space-y-4 transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {visibleEntries.map((entry) => (
            <ChangelogCard key={entry.version} entry={entry} />
          ))}

          {canExpand && (
            <div className='pt-2 text-center'>
              <button
                type='button'
                onClick={() => setExpanded(!expanded)}
                className='inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]'
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: '#d4d4d4',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {expanded ? (
                  <>
                    <ChevronUp className='w-4 h-4' />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className='w-4 h-4' />
                    查看全部 {changelog.length} 个版本
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
