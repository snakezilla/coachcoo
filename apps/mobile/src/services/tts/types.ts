export type Viseme = { t: number; idx?: number; openness?: number };
export type TtsPlayback = { audioUri: string; durationMs: number; visemes: Viseme[] };
