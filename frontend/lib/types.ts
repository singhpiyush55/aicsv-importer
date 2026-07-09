// These types mirror the backend's types (see backend/src/types/lead.ts).
// We keep a separate copy here on purpose, since the frontend and
// backend are two independent projects that don't share code directly.

// One row straight from the uploaded CSV, before any AI processing.
// We don't know the column names ahead of time, so it's just a plain
// object of string key -> string value.
export type RawCsvRow = Record<string, string>;

// One fully mapped GrowEasy CRM lead, after the AI + validation step.
export interface Lead {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRow {
  originalRow: RawCsvRow;
  reason: string;
}

// This is exactly what the backend's /api/import endpoint returns.
export interface ImportResult {
  imported: Lead[];
  skipped: SkippedRow[];
  totalImported: number;
  totalSkipped: number;
}

// Mirrors backend/src/types/streamEvent.ts. These are the small
// progress messages the backend now streams to us, one per line,
// WHILE an import is still running.
export type ImportStage = "parsing" | "ai_processing" | "generating_results";

export type StreamEvent =
  | { type: "stage"; stage: "parsing" }
  | { type: "stage"; stage: "ai_processing"; totalBatches: number }
  | { type: "stage"; stage: "generating_results" }
  | { type: "progress"; stage: "ai_processing"; batchesDone: number; totalBatches: number }
  | { type: "result"; data: ImportResult }
  | { type: "error"; message: string };
