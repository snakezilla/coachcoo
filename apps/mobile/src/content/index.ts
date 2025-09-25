import type { Routine } from "../engine/stateMachine";
import morning from "./packs/morning_v1.json";

// Extend this registry as new content packs are added.
const routineCatalog: Record<string, Routine> = {
  [morning.id]: morning as Routine,
};

export function getRoutineById(id: string): Routine | undefined {
  return routineCatalog[id];
}

export function listRoutineIds() {
  return Object.keys(routineCatalog);
}
