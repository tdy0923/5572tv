'use client';

import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import MobileLayout from '@/ui/mobile/layouts/MobileLayout';
import MobileVideoCard from '@/ui/mobile/components/MobileVideoCard';

// 热门搜索标签
const hotSearches = [
  '鱿鱼游戏', '三体', '庆余年', '流浪地球', 
  '狂飙', '漫长的季节', '繁花', '玫瑰的故事'
];

/**
 * 移动端搜索页
 */
export default function MobileSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // TODO: 调用搜索API
      // const data = await search(searchQuery);
      // setResults(data);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return (
    <MobileLayout>
      {/* 搜索框 */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a] px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            placeholder="搜索影视内容..."
            className="w-full h-12 pl-10 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#f4c24d]/50"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* 热门搜索 */}
      {!query && (
        <div className="px-4 py-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">热门搜索</h3>
          <div className="flex flex-wrap gap-2">
            {hotSearches.map((tag) => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); handleSearch(tag); }}
                className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div className="px-4 py-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">搜索结果</h3>
          <div className="grid grid-cols-3 gap-3">
            {results.map((item, index) => (
              <MobileVideoCard
                key={index}
                title={item.title}
                poster={item.poster}
                href={`/play?source=${item.source}&id=${item.id}`}
                subtitle={item.year}
              />
            ))}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isSearching && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#f4c24d] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 空状态 */}
      {!isSearching && query && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p>未找到相关结果</p>
        </div>
      )}
    </MobileLayout>
  );
}
