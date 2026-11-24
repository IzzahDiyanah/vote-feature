const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatDate = (iso: string) => date.format(new Date(iso));

/** "3 days ago", "yesterday" etc. Shows a date after a month. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day');
  return formatDate(iso);
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
