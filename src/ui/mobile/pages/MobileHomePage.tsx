'use client';

import MobileLayout from '../layouts/MobileLayout';
import MobileHeroBanner from '../components/MobileHeroBanner';
import MobileVideoCard from '../components/MobileVideoCard';

interface MobileHomePageProps {
  heroItems: { poster: string; title: string; href: string }[];
  sections: { title: string; items: { poster: string; title: string; href: string; subtitle?: string }[] }[];
}

export default function MobileHomePage({ heroItems, sections }: MobileHomePageProps) {
  return (
    <MobileLayout>
      {/* Hero Banner */}
      <MobileHeroBanner items={heroItems} />

      {/* 内容区块 */}
      {sections.map((section, sIndex) => (
        <section key={sIndex} className="py-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-white">{section.title}</h2>
            <button className="text-sm text-[#f4c24d]">更多</button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
            {section.items.map((item, iIndex) => (
              <div key={iIndex} className="flex-shrink-0 w-[45vw] snap-start">
                <MobileVideoCard
                  title={item.title}
                  poster={item.poster}
                  href={item.href}
                  subtitle={item.subtitle}
                  priority={sIndex === 0 && iIndex < 3}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </MobileLayout>
  );
}
