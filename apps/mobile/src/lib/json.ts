export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch (error) {
    return JSON.stringify({ error: String(error) });
  }
}

export function safeParse<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
