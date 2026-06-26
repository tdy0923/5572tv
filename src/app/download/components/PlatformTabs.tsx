'use client';

import { Smartphone, Tv } from 'lucide-react';

interface PlatformTabsProps {
  selected: string;
  onSelect: (platform: 'android' | 'ios' | 'tv') => void;
}

const platforms = [
  { id: 'android', name: 'Android', icon: Smartphone },
  { id: 'ios', name: 'iOS', icon: Smartphone },
  { id: 'tv', name: 'TV', icon: Tv },
];

export default function PlatformTabs({ selected, onSelect }: PlatformTabsProps) {
  return (
    <div className="flex justify-center gap-2 px-4 py-6">
      {platforms.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id as 'android' | 'ios' | 'tv')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            selected === p.id
              ? 'bg-[#f4c24d] text-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <p.icon className="w-4 h-4" />
          {p.name}
        </button>
      ))}
    </div>
  );
}
