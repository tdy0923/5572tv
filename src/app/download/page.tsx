'use client';

import { useMemo, useState, useEffect } from 'react';
import { detectPlatform } from './utils';
import HeroSection from './components/HeroSection';
import PlatformTabs from './components/PlatformTabs';
import InstallGuide from './components/InstallGuide';
import FeatureGrid from './components/FeatureGrid';
import DynamicBackground from '@/components/download/DynamicBackground';

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios' | 'tv' | 'desktop'>(platform);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <DynamicBackground />
      <HeroSection 
        platform={selectedPlatform} 
        onShowGuide={() => setShowGuide(true)} 
      />
      <PlatformTabs 
        selected={selectedPlatform} 
        onSelect={setSelectedPlatform} 
      />
      <FeatureGrid />
      {showGuide && (
        <InstallGuide 
          platform={selectedPlatform} 
          onClose={() => setShowGuide(false)} 
        />
      )}
    </div>
  );
}
