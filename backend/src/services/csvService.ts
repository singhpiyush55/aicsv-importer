// This file handles turning a raw CSV file (as text) into an array
// of plain JavaScript objects, one object per row.
// We do NOT assume the column names in advance - whatever headers
// the uploaded file has, that's what each row object will use as keys.

import Papa from "papaparse";
import { RawCsvRow } from "../types/lead";

/**
 * Parses raw CSV text into an array of row objects.
 * Example: "name,email\nJohn,john@x.com" becomes
 * [ { name: "John", email: "john@x.com" } ]
 */
export function parseCsvText(csvText: string): RawCsvRow[] {
  const result = Papa.parse<RawCsvRow>(csvText, {
    header: true, // use the first row as object keys
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(), // remove stray spaces from column names
  });

  if (result.errors && result.errors.length > 0) {
    // We don't want to crash the whole import just because of one
    // messy line, so we just log the parser warnings and continue
    // with whatever rows were successfully parsed.
    console.warn("CSV parse warnings:", result.errors);
  }

  return result.data;
}

/**
 * Splits an array of rows into smaller arrays ("batches") of a given size.
 * Example: splitIntoBatches([1,2,3,4,5], 2) => [[1,2],[3,4],[5]]
 *
 * We batch rows before sending them to the AI so that:
 * 1. Each AI request stays small and fast (better for Groq's free tier).
 * 2. If one batch fails, we don't lose the whole file - only that batch.
 */
export function splitIntoBatches<T>(rows: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }
  return batches;
}
