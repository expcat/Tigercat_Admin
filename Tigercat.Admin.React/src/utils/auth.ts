export const safeParse = <T = any>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
