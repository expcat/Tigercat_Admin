/** Short local datetime for lists/feeds (avoids raw ISO with fractional seconds). */
export function formatDisplayDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const normalizeInput = (next: any): string => {
  return typeof next === 'object' && next?.target ? next.target.value : next;
};
