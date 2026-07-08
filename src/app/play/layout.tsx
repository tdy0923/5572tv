import type { Metadata } from 'next';

interface PlaySearchParams {
  source?: string;
  id?: string;
  title?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: PlaySearchParams;
}): Promise<Metadata> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '5572影视';
  const { source, id, title } = searchParams;
  const decodedTitle = title
    ? decodeURIComponent(title.replace(/\+/g, ' '))
    : '';
  const pageTitle = decodedTitle ? `${decodedTitle} - ${siteName}` : siteName;
  const pageDescription = decodedTitle
    ? `在线观看${decodedTitle}，海量影视资源，AI搜索，弹幕互动 - ${siteName}`
    : '5572影视 - 智能影视播放平台，海量资源，AI搜索，弹幕互动';

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: `/play${source && id ? `?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}` : ''}`,
    },
    openGraph: {
      title: decodedTitle || siteName,
      description: pageDescription,
      type: 'video.movie',
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: decodedTitle || siteName,
      description: pageDescription,
    },
    other: decodedTitle
      ? {
          'application/ld+json': JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Movie',
            name: decodedTitle,
            description: pageDescription,
            url: `/play?source=${source ? encodeURIComponent(source) : ''}&id=${id ? encodeURIComponent(id) : ''}`,
          }),
        }
      : {},
  };
}

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
