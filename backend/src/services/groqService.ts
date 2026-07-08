// This file talks to Groq's AI API.
// Groq uses the SAME request/response format as OpenAI, so we just
// send a normal fetch() POST request - no special SDK needed.
//
// The job of this file is simple to describe but important to get right:
// Given a batch of "raw" CSV rows (with unknown, messy column names),
// ask the AI to map them into GrowEasy's fixed CRM field names.

import { ALLOWED_CRM_STATUS, ALLOWED_DATA_SOURCE, CRM_FIELDS } from "../config/constants";
import { RawCsvRow } from "../types/lead";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// This is what we expect back from the AI for ONE row.
// "index" tells us which input row this result belongs to, so we can
// match it back up even if the AI reorders things.
export interface AiMappedRow {
  index: number;
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: string;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
}

/**
 * Builds the instructions we send to the AI model.
 * Keeping this as its own function makes it easy to tweak the wording
 * later without touching the networking code below.
 */
function buildSystemPrompt(): string {
  return `You are a data-mapping assistant for a CRM system called GrowEasy.

You will be given an array of "rows" taken from a CSV file. The CSV could come
from Facebook Lead Ads, Google Ads, Excel sheets, real-estate CRMs, or a manually
made spreadsheet - so the column names will be inconsistent and sometimes messy
or in a different language/casing than you'd expect.

Your job: for EACH row, extract these exact CRM fields:
${CRM_FIELDS.map((f) => `- ${f}`).join("\n")}

Field rules you MUST follow:

1. crm_status: use ONLY one of these exact values, or leave it as an empty string
   if nothing in the row clearly matches:
   ${ALLOWED_CRM_STATUS.join(", ")}

2. data_source: use ONLY one of these exact values, or leave it as an empty
   string if you are not confident:
   ${ALLOWED_DATA_SOURCE.join(", ")}

3. created_at: must be a date/time string that JavaScript's "new Date(value)"
   can parse correctly (for example "2026-05-13 14:20:48" or a full ISO string).
   If you cannot find any date in the row, leave it as an empty string.

4. crm_note: put here any extra useful information that does not fit another
   field - remarks, follow-up notes, additional comments, or EXTRA phone
   numbers / EXTRA email addresses (see rule 5).

5. Multiple emails or phone numbers in one row:
   - Use only the FIRST email you find for the "email" field.
   - Use only the FIRST mobile number you find for "mobile_without_country_code".
   - Any OTHER emails or numbers in that same row must be appended into
     "crm_note" instead of being dropped.

6. mobile_without_country_code should contain digits only, with no country
   code and no spaces or dashes. If a country code is present, put it
   separately in "country_code" (including the "+" sign, e.g. "+91").

7. Never invent information that is not present in the row. If a field is
   simply not available, return an empty string "" for it - do not guess.

8. Keep every field value as a single line of plain text. If the source data
   contains a real line break inside a field, replace it with the two
   characters backslash-n (\\n) instead of an actual newline, so the value
   stays safe to use inside a CSV file later.

You will receive the rows as a JSON array, where each row also has an "index"
number - you MUST include that same "index" back in your answer for that row,
unchanged, so we can match your answers to the original rows.

Respond with ONLY valid JSON in exactly this shape, and nothing else - no
explanations, no markdown code fences:

{
  "results": [
    {
      "index": 0,
      "created_at": "",
      "name": "",
      "email": "",
      "country_code": "",
      "mobile_without_country_code": "",
      "company": "",
      "city": "",
      "state": "",
      "country": "",
      "lead_owner": "",
      "crm_status": "",
      "crm_note": "",
      "data_source": "",
      "possession_time": "",
      "description": ""
    }
  ]
}

Return exactly one result object per input row, in any order, as long as the
"index" values match up correctly.`;
}

/**
 * Sends ONE batch of raw CSV rows to Groq and returns the AI's best-effort
 * mapping of those rows into CRM fields.
 *
 * Note: we still validate everything again ourselves AFTER this function
 * returns (see validationService.ts). We never fully trust raw AI output,
 * because AI models can occasionally ignore instructions.
 */
export async function mapBatchWithAi(
  batch: RawCsvRow[],
  batchStartIndex: number
): Promise<AiMappedRow[]> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Please set it in your .env file.");
  }

  // We attach an "index" to every row before sending it, so the AI can
  // send that same index back and we always know which output belongs
  // to which original input row - even if the AI shuffles the order.
  const rowsWithIndex = batch.map((row, i) => ({
    index: batchStartIndex + i,
    ...row,
  }));

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0, // 0 = as consistent/deterministic as possible, good for data extraction
      response_format: { type: "json_object" }, // ask Groq to guarantee valid JSON back
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: `Here are the rows to map:\n${JSON.stringify(rowsWithIndex, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (status ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent: string = data.choices?.[0]?.message?.content || "{}";

  let parsed: { results?: AiMappedRow[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    throw new Error("Groq returned content that was not valid JSON.");
  }

  return parsed.results || [];
}

/**
 * Calls mapBatchWithAi but retries once if the first attempt fails.
 * This gives us a bit of resilience against occasional network hiccups
 * or the AI returning slightly malformed JSON.
 */
export async function mapBatchWithRetry(
  batch: RawCsvRow[],
  batchStartIndex: number
): Promise<AiMappedRow[]> {
  try {
    return await mapBatchWithAi(batch, batchStartIndex);
  } catch (firstError) {
    console.warn("First AI batch attempt failed, retrying once...", firstError);
    try {
      return await mapBatchWithAi(batch, batchStartIndex);
    } catch (secondError) {
      console.error("AI batch failed twice, giving up on this batch.", secondError);
      // Return an empty array - the rows in this batch will end up in the
      // "skipped" list because we never got any AI data for them.
      return [];
    }
  }
}
