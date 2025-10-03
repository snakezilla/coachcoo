import Ajv from "ajv";
import type { ErrorObject } from "ajv";
import addFormats from "ajv-formats";

import schema from "../../content/schemas/routine.schema.json";
import { Routine } from "../stateMachine/types";

const ajv = new Ajv({ allErrors: true, removeAdditional: "failing" });
addFormats(ajv);

const validateRoutineSchema = ajv.compile(schema as any);

export interface ValidationResultOk {
  ok: true;
  routine: Routine;
}

export interface ValidationResultErr {
  ok: false;
  errors: string[];
}

export type ValidationResult = ValidationResultOk | ValidationResultErr;

export function validateRoutine(data: unknown): ValidationResult {
  const valid = validateRoutineSchema(data);
  if (valid) {
    return { ok: true, routine: data as Routine };
  }
  return { ok: false, errors: formatErrors(validateRoutineSchema.errors ?? []) };
}

export function formatErrors(errors: ErrorObject<string, Record<string, unknown>, unknown>[]): string[] {
  return errors.map((err) => {
    const path = err.instancePath ? err.instancePath.replace(/^\//, "") : "(root)";
    return `${path || "(root)"} ${err.message ?? "failed validation"}`;
  });
}
