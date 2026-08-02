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

  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.defineProperty(global, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock,
  });

  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ version: '1.12.0', sizeMb: 18 }),
    }),
  ) as jest.Mock;
});

describe('DownloadPage', () => {
  it('renders the page headline', () => {
    render(<DownloadPage />);
    expect(screen.getByText('这里都有')).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<DownloadPage />);
    expect(
      screen.getByText(
        '海量影视资源聚合，AI智能搜索推荐。支持手机、平板、电视全平台。',
      ),
    ).toBeInTheDocument();
  });

  it('renders platform tabs', () => {
    render(<DownloadPage />);
    expect(screen.getByRole('button', { name: 'Android' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'iOS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TV' })).toBeInTheDocument();
  });

  it('has download button linking to APK', () => {
    render(<DownloadPage />);
    const downloadLink = screen.getByText('下载 Android 版');
    expect(downloadLink.closest('a')).toHaveAttribute(
      'href',
      '/static/download/5572tv-android.apk',
    );
  });

  it('shows web version link', () => {
    render(<DownloadPage />);
    const webLink = screen.getByText('网页版体验');
    expect(webLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('shows architecture selector', () => {
    render(<DownloadPage />);
    expect(screen.getByText('arm64-v8a 64位（推荐）')).toBeInTheDocument();
    const compatLink = screen.getByText('armeabi-v7a 兼容版');
    expect(compatLink.closest('a')).toHaveAttribute(
      'href',
      '/static/download/5572tv-android-armv7a.apk',
    );
  });

  it('shows core features', () => {
    render(<DownloadPage />);
    expect(screen.getByText('核心功能')).toBeInTheDocument();
    expect(screen.getByText('多源聚合播放')).toBeInTheDocument();
  });
});
