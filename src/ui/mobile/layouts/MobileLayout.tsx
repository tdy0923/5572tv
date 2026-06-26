'use client';

import { ReactNode } from 'react';
import MobileNav from './MobileNav';

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function MobileLayout({ children, showNav = true }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main 
        className="pb-20"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}
