// These are the small "event" messages the backend sends to the
// frontend, one per line, WHILE an import is still running - instead
// of one single response at the very end.
//
// This is a TypeScript "discriminated union": every variant has a
// different "type" value, and TypeScript uses that to know exactly
// which other fields are allowed on each one. For example, only the
// "result" variant is allowed to have a "data" field.

import { ImportResult } from "./lead";

export type ImportStage = "parsing" | "ai_processing" | "generating_results";

export type StreamEvent =
  // Sent once, right when we start reading the CSV text into rows.
  | { type: "stage"; stage: "parsing" }
  // Sent once, right when we know how many AI batches there will be.
  | { type: "stage"; stage: "ai_processing"; totalBatches: number }
  // Sent once, right before we run the final validation step.
  | { type: "stage"; stage: "generating_results" }
  // Sent after EVERY batch finishes, so the frontend can show
  // something like "2 of 5 batches done".
  | { type: "progress"; stage: "ai_processing"; batchesDone: number; totalBatches: number }
  // Sent exactly once, as the very last message: the real result.
  | { type: "result"; data: ImportResult }
  // Sent if something goes wrong partway through.
  | { type: "error"; message: string };