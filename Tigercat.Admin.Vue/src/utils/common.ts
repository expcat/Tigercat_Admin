export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// Vue typically doesn't need normalizeInput for v-model, but keeping for consistency if manual handling needed
export const normalizeInput = (next: any): string => {
  return typeof next === 'object' && next?.target ? next.target.value : next;
};
