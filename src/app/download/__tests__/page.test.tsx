import { render, screen } from '@testing-library/react';

import DownloadPage from '../page';

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

beforeAll(() => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 14)',
    configurable: true,
  });
});

describe('DownloadPage', () => {
  it('renders the page heading', () => {
    render(<DownloadPage />);
    expect(
      screen.getByRole('heading', { name: '5572 影视' }),
    ).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<DownloadPage />);
    expect(screen.getByText('智能影视播放平台')).toBeInTheDocument();
  });

  it('renders comparison table', () => {
    render(<DownloadPage />);
    expect(screen.getByText('网页版 vs App')).toBeInTheDocument();
  });

  it('shows feature cards', () => {
    render(<DownloadPage />);
    expect(screen.getByText('极速加载')).toBeInTheDocument();
    expect(screen.getByText('离线观看')).toBeInTheDocument();
    expect(screen.getByText('多端同步')).toBeInTheDocument();
    expect(screen.getByText('智能推荐')).toBeInTheDocument();
  });

  it('has download button linking to APK', () => {
    render(<DownloadPage />);
    const downloadLink = screen.getByText('下载 Android 版');
    expect(downloadLink.closest('a')).toHaveAttribute(
      'href',
      '/download/5572tv-android.apk',
    );
  });

  it('shows web version link', () => {
    render(<DownloadPage />);
    const webLink = screen.getByText('继续使用网页版');
    expect(webLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders platform tabs', () => {
    render(<DownloadPage />);
    const androidLinks = screen.getAllByText('Android');
    expect(androidLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('iOS')).toBeInTheDocument();
    expect(screen.getByText('Android TV')).toBeInTheDocument();
  });
});
