'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface MobileSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function MobileSearchBar({ 
  onSearch, 
  placeholder = '搜索影视内容' 
}: MobileSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-10 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#f4c24d]/50"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      )}
    </form>
  );
}
