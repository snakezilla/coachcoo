export function now(): number {
  return Date.now();
}

export function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function fromIso(value: string): number {
  return new Date(value).getTime();
}

export function toUnixSeconds(timestamp: number): number {
  return Math.floor(timestamp / 1000);
}
