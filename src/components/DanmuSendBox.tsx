'use client';

import { Palette, Send } from 'lucide-react';
import { useCallback, useState } from 'react';

interface DanmuSendBoxProps {
  videoId: string;
  videoSource: string;
  currentTime: number;
  onSend?: (danmu: any) => void;
}

const DANMU_COLORS = [
  { name: '白色', value: '#ffffff' },
  { name: '红色', value: '#ff0000' },
  { name: '黄色', value: '#ffff00' },
  { name: '绿色', value: '#00ff00' },
  { name: '蓝色', value: '#0000ff' },
  { name: '紫色', value: '#ff00ff' },
];

export default function DanmuSendBox({
  videoId,
  videoSource,
  currentTime,
  onSend,
}: DanmuSendBoxProps) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [showColors, setShowColors] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/danmu/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          color,
          time: currentTime,
          type: 'scroll',
          videoId,
          videoSource,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onSend?.(result.danmu);
        setText('');
      }
    } catch (error) {
      console.error('发送弹幕失败:', error);
    } finally {
      setSending(false);
    }
  }, [text, color, currentTime, videoId, videoSource, sending, onSend]);

  return (
    <div className='flex items-center gap-2'>
      {/* 颜色选择 */}
      <div className='relative'>
        <button
          onClick={() => setShowColors(!showColors)}
          className='p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
          title='选择颜色'
        >
          <Palette className='w-5 h-5' style={{ color }} />
        </button>
        {showColors && (
          <div className='absolute bottom-full mb-2 left-0 flex gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10'>
            {DANMU_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setColor(c.value);
                  setShowColors(false);
                }}
                className='w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center'
                style={{
                  backgroundColor: c.value,
                  borderColor: color === c.value ? '#3b82f6' : 'transparent',
                }}
                title={c.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* 弹幕输入框 */}
      <input
        type='text'
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder='发条弹幕...'
        maxLength={100}
        className='flex-1 px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500'
        disabled={sending}
      />

      {/* 发送按钮 */}
      <button
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className='p-2 rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        <Send className='w-5 h-5' />
      </button>
    </div>
  );
}
