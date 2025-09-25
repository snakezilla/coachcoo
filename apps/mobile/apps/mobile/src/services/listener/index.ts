export type ListenResult = { heard: boolean };

export interface Listener {
  start(): Promise<void>;
  stop(): Promise<void>;
  pollHeard(): Promise<ListenResult>;
}

export class StubListener implements Listener {
  async start() {}
  async stop() {}
  async pollHeard(): Promise<ListenResult> { return { heard: false }; }
}
