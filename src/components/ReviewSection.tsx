'use client';

import { MessageSquare, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Review {
  id: string;
  username: string;
  rating: number;
  comment: string;
  createdAt: number;
}

interface ReviewSectionProps {
  videoId: string;
  videoSource: string;
}

export default function ReviewSection({
  videoId,
  videoSource,
}: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载评论
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const res = await fetch(
          `/api/reviews?videoId=${videoId}&videoSource=${videoSource}`,
        );
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setAvgRating(data.avgRating || 0);
        }
      } catch {}
      setLoading(false);
    };
    loadReviews();
  }, [videoId, videoSource]);

  // 提交评论
  const handleSubmit = useCallback(async () => {
    if (userRating === 0) return;

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          videoSource,
          rating: userRating,
          comment: userComment,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // 更新评论列表
        setReviews((prev) => {
          const filtered = prev.filter(
            (r) => r.username !== data.review.username,
          );
          return [data.review, ...filtered];
        });
        setAvgRating(
          (reviews.reduce((sum, r) => sum + r.rating, 0) + userRating) /
            (reviews.length + 1),
        );
        setShowReviewForm(false);
        setUserRating(0);
        setUserComment('');
      }
    } catch {}
  }, [videoId, videoSource, userRating, userComment, reviews]);

  return (
    <div className='rounded-[28px] border border-black/6 bg-white/65 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/8 dark:bg-white/[0.04] sm:p-5'>
      {/* 标题和评分 */}
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2'>
          <MessageSquare className='w-4 h-4' />
          用户评价
        </h3>
        {avgRating > 0 && (
          <div className='flex items-center gap-1'>
            <Star className='w-4 h-4 text-yellow-400 fill-yellow-400' />
            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              {avgRating.toFixed(1)}
            </span>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {/* 发表评论按钮 */}
      {!showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className='w-full py-2 text-sm text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors'
        >
          写评价
        </button>
      )}

      {/* 评论表单 */}
      {showReviewForm && (
        <div className='space-y-3 mb-4'>
          {/* 评分 */}
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              评分：
            </span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setUserRating(star)}
                className='p-0.5'
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= userRating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* 评论输入 */}
          <textarea
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            placeholder='写下你的评价...（可选）'
            maxLength={500}
            rows={3}
            className='w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500'
          />

          {/* 按钮 */}
          <div className='flex gap-2'>
            <button
              onClick={handleSubmit}
              disabled={userRating === 0}
              className='px-4 py-1.5 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              提交
            </button>
            <button
              onClick={() => {
                setShowReviewForm(false);
                setUserRating(0);
                setUserComment('');
              }}
              className='px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 评论列表 */}
      {!loading && reviews.length > 0 && (
        <div className='space-y-3 mt-4'>
          {reviews.slice(0, 5).map((review) => (
            <div
              key={review.id}
              className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'
            >
              <div className='flex items-center justify-between mb-1'>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {review.username}
                </span>
                <div className='flex items-center gap-0.5'>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= review.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && reviews.length === 0 && !showReviewForm && (
        <p className='text-sm text-gray-500 dark:text-gray-400 text-center py-4'>
          暂无评价，来写第一条吧
        </p>
      )}
    </div>
  );
}
