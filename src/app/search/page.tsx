import dynamic from 'next/dynamic';

const SearchContent = dynamic(() => import('./_content'));
const MobileSearchPage = dynamic(() => import('@/components/MobileSearchPage'));
const DeviceRouter = dynamic(() => import('@/components/DeviceRouter'));

export default function SearchPage() {
  return (
    <DeviceRouter
      mobile={<MobileSearchPage />}
      desktop={<SearchContent />}
    />
  );
}
