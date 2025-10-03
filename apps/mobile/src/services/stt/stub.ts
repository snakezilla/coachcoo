import { IStt, RecordUntilOptions, RecordUntilResult } from "./index";

export function createStubStt(): IStt {
  return {
    async recordUntil(_options: RecordUntilOptions): Promise<RecordUntilResult | null> {
      return null;
    },
  };
}
