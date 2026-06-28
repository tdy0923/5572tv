import dynamic from 'next/dynamic';

const SearchContent = dynamic(() => import('./_content'));

export default function SearchPage() {
  return <SearchContent />;
}
