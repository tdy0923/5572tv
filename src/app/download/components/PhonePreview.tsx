'use client';

import Image from 'next/image';

/**
 * 真实APP界面预览
 * 使用真实的APP图标和界面元素
 * 响应式：桌面端更大，移动端适中
 */
export default function PhonePreview() {
  return (
    <div className="relative">
      {/* 手机框 - 响应式大小 */}
      <div className="w-[200px] sm:w-[240px] h-[430px] sm:h-[520px] bg-[#111] rounded-[2rem] sm:rounded-[2.5rem] border-[4px] sm:border-[5px] border-gray-800 overflow-hidden shadow-2xl relative">
        {/* 状态栏 */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-black/50 flex items-center justify-between px-6 pt-2 z-10">
          <span className="text-xs text-white/60">9:41</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/60">●●●</span>
            <span className="text-xs text-white/60">WiFi</span>
            <span className="text-xs text-white/60">🔋</span>
          </div>
        </div>

        {/* APP界面 */}
        <div className="h-full bg-[#0a0a0a] pt-12 pb-2">
          {/* APP头部 */}
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="w-7 h-7 bg-[#f4c24d] rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-black">5</span>
            </div>
            <span className="text-sm font-semibold text-white">5572 影视</span>
          </div>

          {/* 标签栏 */}
          <div className="px-4 flex gap-2 py-2">
            {['推荐', '电影', '剧集', '动漫'].map((tab, i) => (
              <span
                key={tab}
                className={`text-xs px-3 py-1 rounded-full ${
                  i === 0 
                    ? 'bg-[#f4c24d] text-black font-medium' 
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          {/* 内容区域 - 模拟真实卡片 */}
          <div className="px-3 space-y-2 mt-2">
            {/* 大图卡片 */}
            <div className="relative h-32 rounded-xl overflow-hidden">
              <Image
                src="/images/agnes/epic-bg.png"
                alt="推荐内容"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-2 left-3">
                <div className="text-sm font-semibold text-white">流浪地球3</div>
                <div className="text-xs text-white/60">科幻 · 2025</div>
              </div>
            </div>

            {/* 小卡片列表 */}
            {[
              { title: '庆余年3', color: 'from-purple-600/30 to-blue-600/30' },
              { title: '三体', color: 'from-cyan-600/30 to-blue-600/30' },
              { title: '繁花', color: 'from-yellow-600/30 to-orange-600/30' },
            ].map((item, i) => (
              <div key={i} className={`flex gap-2 p-2 rounded-lg bg-gradient-to-r ${item.color}`}>
                <div className="w-10 h-14 rounded bg-white/10 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-2.5 bg-white/20 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>

          {/* 底部导航 */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2 bg-black/80 border-t border-white/5">
            {[
              { icon: '🏠', label: '首页', active: true },
              { icon: '🔍', label: '搜索', active: false },
              { icon: '⭐', label: '收藏', active: false },
              { icon: '👤', label: '我的', active: false },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center gap-0.5 ${item.active ? 'text-[#f4c24d]' : 'text-white/40'}`}>
                <span className="text-base">{item.icon}</span>
                <span className="text-[9px]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 光效 - 让手机融入背景 */}
      <div className="absolute -inset-8 bg-[#f4c24d]/5 rounded-[3rem] blur-[60px] -z-10" />
    </div>
  );
}
