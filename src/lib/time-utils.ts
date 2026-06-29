export function timeToSeconds(timeStr: string): number {
  if (!timeStr || timeStr.trim() === '') return 0;

  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  } else {
    return parseFloat(timeStr) || 0;
  }
}

export function secondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const decimal = seconds % 1;
  if (decimal > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}.${Math.floor(decimal * 10)}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
