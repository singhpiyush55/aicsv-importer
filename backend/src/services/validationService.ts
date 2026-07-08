// This file is our "safety net". We never fully trust the AI's output,
// so every AI-mapped row passes through the checks in this file before
// we call it a valid, imported CRM lead.
//
// This is what guarantees things like "crm_status can ONLY be one of
// four exact values" - even if the AI slips up, our own code fixes it.

import { ALLOWED_CRM_STATUS, ALLOWED_DATA_SOURCE } from "../config/constants";
import { AiMappedRow } from "./groqService";
import { ImportResult, Lead, RawCsvRow, SkippedRow } from "../types/lead";

/**
 * Makes sure a string field is always a plain, trimmed string - never
 * undefined, null, or containing a real line break (which would break a CSV row).
 */
function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\r?\n/g, "\\n");
}

/**
 * Returns the value only if it's inside the allowed list, otherwise
 * returns an empty string. Case-sensitive exact match, as the spec
 * requires "one of" these exact values.
 */
function cleanEnum(value: unknown, allowedValues: string[]): string {
  const text = cleanText(value);
  return allowedValues.includes(text) ? text : "";
}

/**
 * Checks whether a date string can actually be parsed by JavaScript,
 * as required by the assignment ("must be convertible using new Date(...)").
 */
function cleanDate(value: unknown): string {
  const text = cleanText(value);
  if (!text) return "";
  const parsed = new Date(text);
  const isValidDate = !isNaN(parsed.getTime());
  return isValidDate ? text : "";
}

/**
 * Takes the raw CSV rows (what the user uploaded) together with the AI's
 * mapped output for those same rows, and produces the final, validated
 * result: a clean list of imported leads, and a list of skipped rows
 * with reasons.
 */
export function validateAndBuildResult(
  originalRows: RawCsvRow[],
  aiResults: AiMappedRow[]
): ImportResult {
  const imported: Lead[] = [];
  const skipped: SkippedRow[] = [];

  // Build a quick lookup so we can find the AI's answer for a given
  // row index without looping through the whole array every time.
  const aiResultByIndex = new Map<number, AiMappedRow>();
  for (const result of aiResults) {
    aiResultByIndex.set(result.index, result);
  }

  originalRows.forEach((originalRow, index) => {
    const aiRow = aiResultByIndex.get(index);

    if (!aiRow) {
      skipped.push({
        originalRow,
        reason: "The AI did not return a mapping for this row.",
      });
      return;
    }

    const lead: Lead = {
      created_at: cleanDate(aiRow.created_at),
      name: cleanText(aiRow.name),
      email: cleanText(aiRow.email),
      country_code: cleanText(aiRow.country_code),
      mobile_without_country_code: cleanText(aiRow.mobile_without_country_code),
      company: cleanText(aiRow.company),
      city: cleanText(aiRow.city),
      state: cleanText(aiRow.state),
      country: cleanText(aiRow.country),
      lead_owner: cleanText(aiRow.lead_owner),
      crm_status: cleanEnum(aiRow.crm_status, ALLOWED_CRM_STATUS),
      crm_note: cleanText(aiRow.crm_note),
      data_source: cleanEnum(aiRow.data_source, ALLOWED_DATA_SOURCE),
      possession_time: cleanText(aiRow.possession_time),
      description: cleanText(aiRow.description),
    };

    // The assignment's clearest hard rule: skip any row that has
    // NEITHER an email NOR a mobile number. We enforce this ourselves
    // instead of trusting the AI to do it correctly.
    const hasEmail = lead.email.length > 0;
    const hasMobile = lead.mobile_without_country_code.length > 0;

    if (!hasEmail && !hasMobile) {
      skipped.push({
        originalRow,
        reason: "Row has neither an email nor a mobile number.",
      });
      return;
    }

    imported.push(lead);
  });

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
  };
}
