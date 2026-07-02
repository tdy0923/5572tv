'use client';

import { ListPlus, Plus, Share2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface PlaylistItem {
  id: string;
  title: string;
  cover: string;
  source: string;
  addedAt: number;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  username: string;
  items: PlaylistItem[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PlaylistManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentVideo?: {
    id: string;
    title: string;
    cover: string;
    source: string;
  };
}

export default function PlaylistManager({
  isOpen,
  onClose,
  currentVideo,
}: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载片单
  useEffect(() => {
    if (!isOpen) return;
    const loadPlaylists = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/playlists');
        if (res.ok) {
          const data = await res.json();
          setPlaylists(data.playlists || []);
        }
      } catch {}
      setLoading(false);
    };
    loadPlaylists();
  }, [isOpen]);

  // 创建片单
  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          items: currentVideo
            ? [
                {
                  id: currentVideo.id,
                  title: currentVideo.title,
                  cover: currentVideo.cover,
                  source: currentVideo.source,
                  addedAt: Date.now(),
                },
              ]
            : [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlaylists((prev) => [...prev, data.playlist]);
        setShowCreateForm(false);
        setNewName('');
        setNewDescription('');
      }
    } catch {}
  }, [newName, newDescription, currentVideo]);

  // 添加到片单
  const handleAddToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!currentVideo) return;

      try {
        const res = await fetch('/api/playlists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playlistId,
            action: 'add',
            item: {
              id: currentVideo.id,
              title: currentVideo.title,
              cover: currentVideo.cover,
              source: currentVideo.source,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setPlaylists((prev) =>
            prev.map((p) => (p.id === playlistId ? data.playlist : p)),
          );
        }
      } catch {}
    },
    [currentVideo],
  );

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm md:items-center md:p-4'
      onClick={onClose}
    >
      <div
        className='flex max-h-[85vh] w-full flex-col rounded-t-[28px] border border-gray-200 dark:border-gray-700 bg-white/88 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-gray-700 dark:bg-[#151a22]/88 md:max-h-[90vh] md:max-w-md md:rounded-xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className='flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4'>
          <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
            我的片单
          </h3>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* 内容 */}
        <div className='flex-1 overflow-y-auto p-4'>
          {loading ? (
            <div className='text-center py-8 text-gray-500'>加载中...</div>
          ) : playlists.length === 0 ? (
            <div className='text-center py-8'>
              <ListPlus className='w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3' />
              <p className='text-gray-500 dark:text-gray-400'>还没有片单</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className='mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600'
              >
                创建第一个片单
              </button>
            </div>
          ) : (
            <div className='space-y-2'>
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'
                >
                  <div className='min-w-0 flex-1'>
                    <p className='font-medium text-gray-900 dark:text-white truncate'>
                      {playlist.name}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {playlist.items.length} 部影片
                    </p>
                  </div>
                  {currentVideo && (
                    <button
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className='ml-2 px-3 py-1 text-xs bg-green-500 text-white rounded-full hover:bg-green-600'
                    >
                      添加
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/playlists/${playlist.id}`,
                      );
                    }}
                    className='ml-2 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700'
                    title='分享片单'
                  >
                    <Share2 className='w-4 h-4 text-gray-500' />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 创建表单 */}
          {showCreateForm && (
            <div className='mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3'>
              <input
                type='text'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='片单名称'
                className='w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder='片单描述（可选）'
                rows={2}
                className='w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none'
              />
              <div className='flex gap-2'>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className='px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50'
                >
                  创建
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className='px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg'
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {!showCreateForm && (
          <div className='border-t border-gray-200 dark:border-gray-700 p-4'>
            <button
              onClick={() => setShowCreateForm(true)}
              className='w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600'
            >
              <Plus className='w-4 h-4' />
              新建片单
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
