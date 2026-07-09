// // This controller is the "traffic controller" for one import request.
// // It doesn't do any parsing or AI work itself - it just calls the
// // right service functions in the right order and sends back the result.

// import { Request, Response } from "express";
// import { parseCsvText, splitIntoBatches } from "../services/csvService";
// import { mapBatchWithRetry, AiMappedRow } from "../services/groqService";
// import { validateAndBuildResult } from "../services/validationService";
// import { RawCsvRow } from "../types/lead";

// export async function handleCsvImport(req: Request, res: Response): Promise<void> {
//   try {
//     // "multer" (our file upload middleware) puts the uploaded file on req.file
//     if (!req.file) {
//       res.status(400).json({ error: "No CSV file was uploaded. Please attach a file." });
//       return;
//     }

//     const csvText = req.file.buffer.toString("utf-8");
//     if (!csvText.trim()) {
//       res.status(400).json({ error: "The uploaded CSV file is empty." });
//       return;
//     }

//     // Step 1: turn the raw CSV text into an array of row objects.
//     const rows: RawCsvRow[] = parseCsvText(csvText);

//     if (rows.length === 0) {
//       res.status(400).json({ error: "No data rows were found in the CSV." });
//       return;
//     }

//     // Step 2: split the rows into smaller batches so each AI request
//     // stays fast and small. Batch size is configurable via .env.
//     const batchSize = Number(process.env.BATCH_SIZE) || 15;
//     const batches = splitIntoBatches(rows, batchSize);

//     // Step 3: send every batch to the AI, one batch at a time.
//     // We go one-by-one (instead of all at once) to stay well within
//     // Groq's free-tier rate limits.
//     const allAiResults: AiMappedRow[] = [];
//     let rowsProcessedSoFar = 0;

//     for (const batch of batches) {
//       const batchResults = await mapBatchWithRetry(batch, rowsProcessedSoFar);
//       allAiResults.push(...batchResults);
//       rowsProcessedSoFar += batch.length;
//     }

//     // Step 4: validate everything the AI gave us, and build the final,
//     // clean result: imported leads + skipped rows with reasons.
//     const result = validateAndBuildResult(rows, allAiResults);

//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Import failed:", error);
//     const message = error instanceof Error ? error.message : "Unknown server error.";
//     res.status(500).json({ error: `Import failed: ${message}` });
//   }
// }


// This controller is the "traffic controller" for one import request.
// It doesn't do any parsing or AI work itself - it just calls the
// right service functions in the right order.
//
// This controller STREAMS small progress updates to the frontend as it
// works through each stage, using a format called NDJSON
// ("newline-delimited JSON") - one JSON object per line.

import { Request, Response } from "express";
import { parseCsvText, splitIntoBatches } from "../services/csvService";
import { mapBatchWithRetry, AiMappedRow } from "../services/groqService";
import { validateAndBuildResult } from "../services/validationService";
import { RawCsvRow } from "../types/lead";
import { StreamEvent } from "../types/streamEvent";

/**
 * Writes ONE event as a single line of JSON, followed by a newline
 * character. The frontend reads the response one chunk at a time and
 * splits on "\n" to know where one event ends and the next begins.
 */
function writeEvent(res: Response, event: StreamEvent): void {
  res.write(JSON.stringify(event) + "\n");
}

export async function handleCsvImport(req: Request, res: Response): Promise<void> {
  // These first two checks can still fail with a normal, single JSON
  // error response, because nothing has been written to the response
  // yet at this point - we haven't committed to streaming.
  if (!req.file) {
    res.status(400).json({ error: "No CSV file was uploaded. Please attach a file." });
    return;
  }

  const csvText = req.file.buffer.toString("utf-8");
  if (!csvText.trim()) {
    res.status(400).json({ error: "The uploaded CSV file is empty." });
    return;
  }

  // From here on, we commit to a STREAMING response. We set the
  // headers once, up front, and then call res.write() multiple times
  // as we make progress, instead of a single res.json() at the end.
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders(); // send the headers immediately, don't wait

  try {
    // ---- Stage 1: Parsing CSV ----
    writeEvent(res, { type: "stage", stage: "parsing" });
    const rows: RawCsvRow[] = parseCsvText(csvText);

    if (rows.length === 0) {
      writeEvent(res, { type: "error", message: "No data rows were found in the CSV." });
      res.end();
      return;
    }

    const batchSize = Number(process.env.BATCH_SIZE) || 15;
    const batches = splitIntoBatches(rows, batchSize);

    // ---- Stage 2: Processing with AI ----
    // We know the total batch count up front, so we send it once here,
    // then send one "progress" event after each batch completes.
    writeEvent(res, { type: "stage", stage: "ai_processing", totalBatches: batches.length });

    const allAiResults: AiMappedRow[] = [];
    let rowsProcessedSoFar = 0;
    let batchesDone = 0;

    for (const batch of batches) {
      const batchResults = await mapBatchWithRetry(batch, rowsProcessedSoFar);
      allAiResults.push(...batchResults);
      rowsProcessedSoFar += batch.length;
      batchesDone += 1;

      writeEvent(res, {
        type: "progress",
        stage: "ai_processing",
        batchesDone,
        totalBatches: batches.length,
      });
    }

    // ---- Stage 3: Generating results ----
    writeEvent(res, { type: "stage", stage: "generating_results" });
    const result = validateAndBuildResult(rows, allAiResults);

    // ---- Final message: the actual result ----
    writeEvent(res, { type: "result", data: result });
    res.end();
  } catch (error) {
    console.error("Import failed:", error);
    const message = error instanceof Error ? error.message : "Unknown server error.";
    // We can't use res.status(500).json(...) anymore at this point,
    // since headers were already sent above. Instead we send one more
    // "error" event on its own line - the frontend watches for this
    // event type even in the middle of a stream.
    writeEvent(res, { type: "error", message: `Import failed: ${message}` });
    res.end();
  }
}