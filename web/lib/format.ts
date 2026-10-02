const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatDuration(ms: number | null): string {
  if (ms === null) {
    return '—';
  }
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function formatNumber(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('en-US');
}
