// ArtPlayer 移动端手势增强
// - 双击左/右侧：快退/快进 10s（带涟漪提示）
// - 长按屏幕：2x 倍速，松手恢复（进度条区域除外）
// 设计为纯附加层：不干扰 ArtPlayer 自带的单击显隐控制栏与拖动逻辑。

interface GestureHandle {
  destroy: () => void;
}

const DOUBLE_TAP_SEEK = 10;
const LONG_PRESS_SPEED = 2;

export function attachMobileGestures(
  container: HTMLElement,
  video: HTMLVideoElement,
  opts: { isMobile: boolean; showToast?: (msg: string) => void },
): GestureHandle {
  if (!opts.isMobile) return { destroy: () => {} };

  const show = opts.showToast;
  let lastTapTime = 0;
  let lastTapX = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressActive = false;
  let originalRate = 1;
  let pressStartX = 0;
  let pressStartY = 0;
  let movedBeyondPress = false;

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const restoreRate = () => {
    if (longPressActive) {
      longPressActive = false;
      try {
        video.playbackRate = originalRate;
        show?.('已恢复常速');
      } catch {}
    }
  };

  const flashRipple = (side: 'left' | 'right') => {
    const ripple = document.createElement('div');
    ripple.textContent = side === 'left' ? '«10s' : '10s»';
    Object.assign(ripple.style, {
      position: 'absolute',
      top: '50%',
      [side]: '12%',
      transform: 'translateY(-50%)',
      padding: '14px 18px',
      borderRadius: '9999px',
      background: 'rgba(0,0,0,.45)',
      color: '#fff',
      fontSize: '14px',
      pointerEvents: 'none',
      zIndex: '60',
    } as Record<string, string>);
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    pressStartX = t.clientX;
    pressStartY = t.clientY;
    movedBeyondPress = false;

    // 进度条/音量条等控件上的触摸不触发长按
    const target = e.target as HTMLElement;
    const onControl = !!target.closest(
      '.art-control, .art-progress, .art-bottom, input, button',
    );
    if (!onControl && video.duration > 0) {
      clearLongPress();
      longPressTimer = setTimeout(() => {
        if (movedBeyondPress) return;
        if (video.paused) return; // 暂停时长按无意义
        longPressActive = true;
        originalRate = video.playbackRate || 1;
        try {
          video.playbackRate = LONG_PRESS_SPEED;
          show?.(`${LONG_PRESS_SPEED}x 倍速中`);
        } catch {}
      }, 450);
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    if (
      Math.abs(t.clientX - pressStartX) > 12 ||
      Math.abs(t.clientY - pressStartY) > 12
    ) {
      movedBeyondPress = true;
      clearLongPress();
      restoreRate();
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    clearLongPress();
    restoreRate();

    // 双击检测：300ms 内同侧两次轻点
    const t = e.changedTouches[0];
    if (!t || movedBeyondPress) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.art-control, .art-progress, .art-bottom, input, button')
    ) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const now = Date.now();
    const side: 'left' | 'right' =
      t.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
    if (now - lastTapTime < 300 && side === lastTapSide(lastTapX, rect)) {
      lastTapTime = 0;
      try {
        video.currentTime = Math.max(
          0,
          Math.min(
            video.duration,
            video.currentTime +
              (side === 'left' ? -DOUBLE_TAP_SEEK : DOUBLE_TAP_SEEK),
          ),
        );
        flashRipple(side);
      } catch {}
    } else {
      lastTapTime = now;
      lastTapX = t.clientX;
    }
  };

  const lastTapSide = (x: number, rect: DOMRect): 'left' | 'right' =>
    x - rect.left < rect.width / 2 ? 'left' : 'right';

  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('touchend', onTouchEnd, { passive: true });
  container.addEventListener('touchcancel', () => {
    clearLongPress();
    restoreRate();
  });

  return {
    destroy() {
      clearLongPress();
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    },
  };
}
