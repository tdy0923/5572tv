/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useRef, useState } from 'react';

interface CapsuleSwitchProps {
  options: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

const CapsuleSwitch: React.FC<CapsuleSwitchProps> = ({
  options,
  active,
  onChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const activeIndex = options.findIndex((opt) => opt.value === active);

  // 更新指示器位置
  const updateIndicatorPosition = () => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const button = buttonRefs.current[activeIndex];
      const container = containerRef.current;
      if (button && container) {
        const buttonRect = button.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (buttonRect.width > 0) {
          setIndicatorStyle({
            left: buttonRect.left - containerRect.left,
            width: buttonRect.width,
          });
        }
      }
    }
  };

  // 组件挂载时立即计算初始位置
  useEffect(() => {
    const timeoutId = setTimeout(updateIndicatorPosition, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  // 监听选中项变化
  useEffect(() => {
    const timeoutId = setTimeout(updateIndicatorPosition, 0);
    return () => clearTimeout(timeoutId);
  }, [activeIndex]);

  return (
    <div className='max-w-full overflow-x-auto scrollbar-hide'>
      <div
        ref={containerRef}
        className={`relative inline-flex rounded-full border border-black/5 bg-white/55 p-1 shadow-[0_10px_22px_rgba(15,23,42,0.05)] backdrop-blur-md dark:border-white/8 dark:bg-white/5 ${
          className || ''
        }`}
      >
        {/* 滑动的渐变背景指示器 */}
        {indicatorStyle.width > 0 && (
          <div
            className='absolute bottom-1 top-1 rounded-full bg-linear-to-r from-[#f4c24d] via-[#f0b938] to-[#d89c18] shadow-[0_8px_18px_rgba(244,194,77,0.22)] transition-all duration-300 ease-out dark:from-[#f4c24d] dark:via-[#f0b938] dark:to-[#d89c18]'
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}

        {options.map((opt, index) => {
          const isActive = active === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              onClick={() => onChange(opt.value)}
              className={`relative z-10 min-w-[72px] rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer sm:min-w-[90px] sm:py-2 sm:text-sm ${
                isActive
                  ? 'text-[#171717]'
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CapsuleSwitch;
