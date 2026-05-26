'use client';

const NOTIFIED_KEY = '5572tv_reminder_notified';
const PERMISSION_ASKED_KEY = '5572tv_notification_permission_asked';

export function getNotificationPermission():
  | NotificationPermission
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window))
    return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window))
    return 'denied';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const result = await Notification.requestPermission();
  try {
    localStorage.setItem(PERMISSION_ASKED_KEY, '1');
  } catch (e) {
    //     console.log('[Notification] Storage error:', e);
  }
  return result;
}

export function shouldAskPermission(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'default') return false;
  try {
    return !localStorage.getItem(PERMISSION_ASKED_KEY);
  } catch (e) {
    //     console.log('[Notification] Storage error:', e);
  }
  return true;
}

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch (e) {
    //     console.log('[Notification] Storage error:', e);
    return new Set();
  }
}

function markNotified(key: string) {
  const set = getNotifiedSet();
  set.add(key);
  try {
    const arr = Array.from(set);
    if (arr.length > 200) arr.splice(0, arr.length - 200);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
  } catch (e) {
    //     console.log('[Notification] Storage error:', e);
  }
}

export function showReminderNotification(
  title: string,
  body: string,
  key: string,
  cover?: string,
  onClickUrl?: string,
) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  if (getNotifiedSet().has(key)) return;
  markNotified(key);

  try {
    const opts: NotificationOptions = {
      body,
      icon: cover || '/icon-5.svg',
      tag: key,
    };

    const notification = new Notification(title, opts);

    if (onClickUrl) {
      notification.onclick = () => {
        window.focus();
        window.location.href = onClickUrl;
        notification.close();
      };
    }

    setTimeout(() => {
      try {
        notification.close();
      } catch (e) {
        //         console.log('[Notification] Storage error:', e);
      }
    }, 15000);
  } catch (e) {
    //     console.log('[Notification] Storage error:', e);
  }
}

export function sendNewReleaseNotifications(
  newReleases: {
    title: string;
    sourceKey: string;
    videoId: string;
    cover?: string;
    remarks?: string;
    releaseDate?: string;
  }[],
) {
  if (!newReleases.length) return;
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  for (const release of newReleases) {
    const key = `${release.sourceKey}+${release.videoId}`;
    const playUrl = `/play?s=${release.sourceKey}&id=${release.videoId}&from=reminders`;
    showReminderNotification(
      `${release.title} 已上映`,
      release.remarks || '你标记想看的内容已上映，快去看看吧！',
      `release:${key}`,
      release.cover,
      playUrl,
    );
  }
}
