import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const FAILED_TRAILER_REFRESHES_KEY = 'failed-trailer-refreshes';
const FAILED_TRAILER_RETRY_TTL = 10 * 60 * 1000;
const NO_TRAILER_IDS_KEY = 'no-trailer-ids';

function getFailedTrailerRefreshes(): Record<string, number> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(FAILED_TRAILER_REFRESHES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveFailedTrailerRefreshes(data: Record<string, number>) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FAILED_TRAILER_REFRESHES_KEY, JSON.stringify(data));
  } catch {
    // ignore localStorage errors
  }
}

function getNoTrailerIds(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(NO_TRAILER_IDS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function markNoTrailer(doubanId: number | string) {
  const ids = getNoTrailerIds();
  ids[String(doubanId)] = true;
  try {
    localStorage.setItem(NO_TRAILER_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore localStorage errors
  }
}

function clearNoTrailer(doubanId: number | string) {
  const ids = getNoTrailerIds();
  if (ids[String(doubanId)] !== undefined) {
    delete ids[String(doubanId)];
    try {
      localStorage.setItem(NO_TRAILER_IDS_KEY, JSON.stringify(ids));
    } catch {
      // ignore localStorage errors
    }
  }
}

export function shouldSkipTrailerRefresh(doubanId: number | string): boolean {
  const noTrailerIds = getNoTrailerIds();
  if (noTrailerIds[String(doubanId)]) {
    return true;
  }

  const failedMap = getFailedTrailerRefreshes();
  const failedAt = failedMap[String(doubanId)];
  return (
    typeof failedAt === 'number' &&
    Date.now() - failedAt < FAILED_TRAILER_RETRY_TTL
  );
}

function markTrailerRefreshFailed(doubanId: number | string) {
  const failedMap = getFailedTrailerRefreshes();
  failedMap[String(doubanId)] = Date.now();
  saveFailedTrailerRefreshes(failedMap);
}

function clearFailedTrailerRefresh(doubanId: number | string) {
  const failedMap = getFailedTrailerRefreshes();
  if (failedMap[String(doubanId)] !== undefined) {
    delete failedMap[String(doubanId)];
    saveFailedTrailerRefreshes(failedMap);
  }
}

/**
 * Query for refreshed trailer URLs cache
 * Replaces localStorage-based refreshedTrailerUrls state
 * Based on TanStack Query useQuery with initialData pattern (react-native example)
 */
export function useRefreshedTrailerUrlsQuery() {
  return useQuery<Record<string, string>>({
    queryKey: ['refreshedTrailerUrls'],
    queryFn: () => {
      // Read from localStorage as the source of truth
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('refreshed-trailer-urls');
          return stored ? JSON.parse(stored) : {};
        } catch {
          return {};
        }
      }
      return {};
    },
    // Initialize immediately from localStorage (no loading state)
    initialData: () => {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('refreshed-trailer-urls');
          return stored ? JSON.parse(stored) : {};
        } catch {
          return {};
        }
      }
      return {};
    },
    staleTime: Infinity, // Never refetch automatically - only updated via mutations
    gcTime: Infinity,
  });
}

/**
 * Mutation for refreshing a trailer URL
 * Replaces manual refreshTrailerUrl useCallback + localStorage management
 * Based on TanStack Query useMutation with optimistic updates pattern
 * Reference: query-main/examples/react/optimistic-updates-cache
 */
export function useRefreshTrailerUrlMutation() {
  const queryClient = useQueryClient();

  return useMutation<string | null, Error, { doubanId: number | string }>({
    mutationFn: async ({ doubanId }) => {
      if (shouldSkipTrailerRefresh(doubanId)) {
        return null;
      }

      const response = await fetch(
        `/api/douban/refresh-trailer?id=${doubanId}`,
      );

      if (!response.ok) {
        if (response.status === 404 || response.status === 429) {
          return null;
        }
        return null;
      }

      const data = await response.json();
      if (data.code === 200 && data.data?.trailerUrl) {
        return data.data.trailerUrl;
      }

      if (data.code === 404 || data.error === 'NO_TRAILER') {
        markNoTrailer(doubanId);
      }

      return null;
    },
    onSuccess: (newUrl, { doubanId }) => {
      if (newUrl) {
        clearFailedTrailerRefresh(doubanId);
        clearNoTrailer(doubanId);
        // Update query cache with new URL
        queryClient.setQueryData<Record<string, string>>(
          ['refreshedTrailerUrls'],
          (prev = {}) => {
            const updated = { ...prev, [doubanId]: newUrl };

            // Persist to localStorage
            try {
              localStorage.setItem(
                'refreshed-trailer-urls',
                JSON.stringify(updated),
              );
            } catch {
              // localStorage 不可用时忽略缓存写入失败
            }

            return updated;
          },
        );
      } else {
        markTrailerRefreshFailed(doubanId);
      }
    },
    onError: (_error, { doubanId }) => {
      markTrailerRefreshFailed(doubanId);
    },
  });
}

/**
 * Clear a specific trailer URL from cache
 * Used when a previously refreshed URL also expires (403)
 */
export function useClearTrailerUrlMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { doubanId: number | string }>({
    mutationFn: async ({ doubanId }) => {
      // Update query cache - remove the expired URL
      queryClient.setQueryData<Record<string, string>>(
        ['refreshedTrailerUrls'],
        (prev = {}) => {
          const updated = { ...prev };
          delete updated[doubanId as string];

          // Persist to localStorage
          try {
            localStorage.setItem(
              'refreshed-trailer-urls',
              JSON.stringify(updated),
            );
          } catch {
            // localStorage 不可用时忽略缓存写入失败
          }

          return updated;
        },
      );
    },
  });
}
