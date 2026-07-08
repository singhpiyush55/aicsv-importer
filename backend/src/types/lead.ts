// This file just describes the "shape" of one CRM lead record.
// We use a TypeScript "interface" here, which is basically a contract
// that says "any object claiming to be a Lead must have these fields".

export interface Lead {
  created_at: string; // must be parsable by JavaScript's `new Date(...)`
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string; // must be one of ALLOWED_CRM_STATUS (see constants.ts)
  crm_note: string;
  data_source: string; // must be one of ALLOWED_DATA_SOURCE, or blank
  possession_time: string;
  description: string;
}

// This is what one row looks like right after we parse the raw CSV.
// At this point we don't know the column names in advance, so we just
// treat every row as a plain object of string key -> string value.
export type RawCsvRow = Record<string, string>;

// This is what the AI batch step returns for one row: either a
// successfully mapped Lead, or a reason why the row was skipped.
export interface ImportResult {
  imported: Lead[];
  skipped: SkippedRow[];
  totalImported: number;
  totalSkipped: number;
}

export interface SkippedRow {
  originalRow: RawCsvRow;
  reason: string;
}
