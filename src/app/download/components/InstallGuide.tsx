'use client';

import { Smartphone, Tv } from 'lucide-react';

interface InstallGuideProps {
  platform: 'android' | 'ios' | 'tv' | 'desktop';
  onClose: () => void;
}

function AndroidSteps() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-[#f4c24d]" />
        Android 安装步骤
      </h3>
      <div className="space-y-3">
        {[
          { step: 1, text: '点击下方按钮下载 APK' },
          { step: 2, text: '打开下载的文件' },
          { step: 3, text: '点击「仍然安装」或「允许本次安装」' },
          { step: 4, text: '安装完成，打开即可使用' },
        ].map((s) => (
          <div key={s.step} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-xs font-bold flex-shrink-0">
              {s.step}
            </div>
            <p className="text-sm text-gray-300">{s.text}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        * 首次安装可能提示「风险应用」，这是系统安全机制，不影响使用
      </p>
    </div>
  );
}

function IOSSteps() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-[#f4c24d]" />
        添加到主屏幕
      </h3>
      <div className="space-y-3">
        {[
          { step: 1, text: '用 Safari 打开此页面', icon: '🌐' },
          { step: 2, text: '点击底部「分享」按钮', icon: '📤' },
          { step: 3, text: '向下滑动，点击「添加到主屏幕」', icon: '➕' },
          { step: 4, text: '点击右上角「添加」完成', icon: '✅' },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#f4c24d]/20 flex items-center justify-center text-lg flex-shrink-0">
              {s.icon}
            </div>
            <p className="text-sm text-gray-300">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-xl bg-[#f4c24d]/10 border border-[#f4c24d]/20">
        <p className="text-sm text-[#f4c24d]">
          💡 添加后可在主屏幕直接打开，体验与原生 App 一致
        </p>
      </div>
    </div>
  );
}

function TVSteps() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Tv className="w-5 h-5 text-[#f4c24d]" />
        电视安装
      </h3>
      <div className="space-y-3">
        {[
          { step: 1, text: 'U盘拷贝 APK 文件' },
          { step: 2, text: '电视上打开文件管理器' },
          { step: 3, text: '找到 APK 文件并安装' },
          { step: 4, text: '允许「安装未知来源应用」' },
        ].map((s) => (
          <div key={s.step} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-xs font-bold flex-shrink-0">
              {s.step}
            </div>
            <p className="text-sm text-gray-300">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InstallGuide({ platform, onClose }: InstallGuideProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-3xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">安装指南</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {platform === 'ios' ? <IOSSteps /> : 
         platform === 'tv' ? <TVSteps /> : 
         <AndroidSteps />}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-[#f4c24d] text-black rounded-xl font-bold"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
