'use client';

import Image from 'next/image';

/**
 * 真实APP界面预览 - 大尺寸版本
 * 确保在桌面端足够显眼
 */
export default function PhonePreview() {
  return (
    <div className="relative">
      {/* 发光背景 */}
      <div className="absolute -inset-10 bg-[#f4c24d]/8 rounded-full blur-[80px] -z-10" />
      
      {/* 手机框 - 桌面端大尺寸 */}
      <div className="w-[220px] sm:w-[280px] h-[470px] sm:h-[600px] bg-[#111] rounded-[2.5rem] sm:rounded-[3rem] border-[5px] sm:border-[6px] border-gray-700 overflow-hidden shadow-2xl relative">
        {/* 状态栏 */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-black/60 flex items-center justify-between px-6 pt-3 z-10">
          <span className="text-sm text-white/70">9:41</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">●●●</span>
            <span className="text-xs text-white/60">WiFi</span>
            <span className="text-xs text-white/60">🔋</span>
          </div>
        </div>

        {/* APP界面 */}
        <div className="h-full bg-[#0a0a0a] pt-14 pb-3">
          {/* APP头部 */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f4c24d] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-base font-bold text-black">5</span>
            </div>
            <span className="text-base font-semibold text-white">5572 影视</span>
          </div>

          {/* 标签栏 */}
          <div className="px-4 flex gap-2 py-2">
            {['推荐', '电影', '剧集', '动漫'].map((tab, i) => (
              <span
                key={tab}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors ${
                  i === 0 
                    ? 'bg-[#f4c24d] text-black font-medium' 
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {tab}
              </span>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="px-3 space-y-3 mt-3">
            {/* 大图推荐卡片 */}
            <div className="relative h-36 sm:h-44 rounded-xl overflow-hidden">
              <Image
                src="/images/agnes/epic-bg.png"
                alt="推荐内容"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <div className="text-sm sm:text-base font-semibold text-white">流浪地球3</div>
                <div className="text-xs text-white/60">科幻 · 2025 · 豆瓣 9.2</div>
              </div>
              <div className="absolute bottom-3 right-4">
                <div className="w-8 h-8 rounded-full bg-[#f4c24d] flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-black border-y-[5px] border-y-transparent ml-0.5" />
                </div>
              </div>
            </div>

            {/* 继续观看 */}
            <div className="px-1">
              <div className="text-xs text-white/50 mb-2">继续观看</div>
              <div className="flex gap-2">
                {[
                  { title: '庆余年3', color: 'from-purple-600/40 to-blue-600/40' },
                  { title: '三体', color: 'from-cyan-600/40 to-blue-600/40' },
                ].map((item, i) => (
                  <div key={i} className={`flex-1 p-2 rounded-lg bg-gradient-to-r ${item.color}`}>
                    <div className="w-full h-16 sm:h-20 rounded bg-white/10 mb-1.5" />
                    <div className="text-xs text-white/80">{item.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 热门推荐 */}
            <div className="px-1">
              <div className="text-xs text-white/50 mb-2">热门推荐</div>
              <div className="space-y-2">
                {['繁花', '玫瑰的故事'].map((title, i) => (
                  <div key={i} className="flex gap-2 p-2 rounded-lg bg-white/5">
                    <div className="w-10 h-14 rounded bg-gradient-to-br from-yellow-600/30 to-orange-600/30 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white">{title}</div>
                      <div className="text-[10px] text-white/50">2025 · 8.5分</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 底部导航 */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2.5 bg-black/90 border-t border-white/5">
            {[
              { icon: '🏠', label: '首页', active: true },
              { icon: '🔍', label: '搜索', active: false },
              { icon: '⭐', label: '收藏', active: false },
              { icon: '👤', label: '我的', active: false },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center gap-0.5 ${item.active ? 'text-[#f4c24d]' : 'text-white/40'}`}>
                <span className="text-base sm:text-lg">{item.icon}</span>
                <span className="text-[10px] sm:text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
