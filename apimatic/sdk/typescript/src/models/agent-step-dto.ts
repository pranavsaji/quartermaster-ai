import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { status2Schema, type Status2 } from "./status2.js";

/** One step of the procurement agent's research run (tool, input summary, outcome). */
export type AgentStepDto = {
  /** Unique identifier (UUID). */
  id: string;
  tool: string;
  /** Current status. */
  status: Status2;
  /** Duration, in milliseconds. */
  durationMs: number;
  summary: string;
  /** When started happened (ISO 8601, UTC). */
  startedAt: string;
};

export const agentStepDtoSchema: Schema<AgentStepDto> = s.object<AgentStepDto>({
  id: s.string(),
  tool: s.string(),
  status: status2Schema,
  durationMs: s.float64(),
  summary: s.string(),
  startedAt: s.string(),
  _keysMap: {
    durationMs: "duration_ms",
    startedAt: "started_at",
  },
});
