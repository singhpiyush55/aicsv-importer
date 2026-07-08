// This controller is the "traffic controller" for one import request.
// It doesn't do any parsing or AI work itself - it just calls the
// right service functions in the right order and sends back the result.

import { Request, Response } from "express";
import { parseCsvText, splitIntoBatches } from "../services/csvService";
import { mapBatchWithRetry, AiMappedRow } from "../services/groqService";
import { validateAndBuildResult } from "../services/validationService";
import { RawCsvRow } from "../types/lead";

export async function handleCsvImport(req: Request, res: Response): Promise<void> {
  try {
    // "multer" (our file upload middleware) puts the uploaded file on req.file
    if (!req.file) {
      res.status(400).json({ error: "No CSV file was uploaded. Please attach a file." });
      return;
    }

    const csvText = req.file.buffer.toString("utf-8");
    if (!csvText.trim()) {
      res.status(400).json({ error: "The uploaded CSV file is empty." });
      return;
    }

    // Step 1: turn the raw CSV text into an array of row objects.
    const rows: RawCsvRow[] = parseCsvText(csvText);

    if (rows.length === 0) {
      res.status(400).json({ error: "No data rows were found in the CSV." });
      return;
    }

    // Step 2: split the rows into smaller batches so each AI request
    // stays fast and small. Batch size is configurable via .env.
    const batchSize = Number(process.env.BATCH_SIZE) || 15;
    const batches = splitIntoBatches(rows, batchSize);

    // Step 3: send every batch to the AI, one batch at a time.
    // We go one-by-one (instead of all at once) to stay well within
    // Groq's free-tier rate limits.
    const allAiResults: AiMappedRow[] = [];
    let rowsProcessedSoFar = 0;

    for (const batch of batches) {
      const batchResults = await mapBatchWithRetry(batch, rowsProcessedSoFar);
      allAiResults.push(...batchResults);
      rowsProcessedSoFar += batch.length;
    }

    // Step 4: validate everything the AI gave us, and build the final,
    // clean result: imported leads + skipped rows with reasons.
    const result = validateAndBuildResult(rows, allAiResults);

    res.status(200).json(result);
  } catch (error) {
    console.error("Import failed:", error);
    const message = error instanceof Error ? error.message : "Unknown server error.";
    res.status(500).json({ error: `Import failed: ${message}` });
  }
}
