import { act, render, screen } from '@testing-library/react';

import PlayerErrorsPanel from '../PlayerErrorsPanel';

const summary = {
  days: 3,
  total: 3,
  top: [
    {
      kind: 'error',
      message: 'MEDIA_ERR_DECODE',
      count: 2,
      lastTs: 1789500000000,
      videoId: 'zdrama:1',
      title: 'Drama',
      sourceName: 'zuid',
    },
    {
      kind: 'source_switch',
      message: 'zuid',
      count: 1,
      lastTs: 1789400000000,
    },
  ],
  recent: [
    {
      ts: 1789500000000,
      kind: 'error',
      message: 'MEDIA_ERR_DECODE',
      title: 'Drama',
      sourceName: 'zuid',
    },
    {
      ts: 1789400000000,
      kind: 'source_switch',
      message: 'zuid',
    },
  ],
};

describe('PlayerErrorsPanel', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => summary,
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('renders top errors and recent samples', async () => {
    render(<PlayerErrorsPanel />);

    expect(
      await screen.findAllByText('MEDIA_ERR_DECODE'),
    ).not.toHaveLength(0);
    expect(screen.getByText(/共 3 条/)).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/admin/player-errors?days=3',
    );
  });

  it('renders the empty state when there are no errors', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ days: 3, total: 0, top: [], recent: [] }),
    });
    render(<PlayerErrorsPanel />);

    expect(await screen.findByText(/暂无播放器错误/)).toBeInTheDocument();
  });

  it('renders the error state with retry', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    render(<PlayerErrorsPanel />);

    expect(await screen.findByText(/请求失败: 500/)).toBeInTheDocument();
    await act(async () => {
      screen.getByText('重试').click();
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
