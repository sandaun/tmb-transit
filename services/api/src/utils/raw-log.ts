const seen = new Set<string>();

export function devLogRawOnce(key: string, payload: unknown): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  console.log(`[raw:${key}]`, JSON.stringify(payload).slice(0, 5_000));
}
