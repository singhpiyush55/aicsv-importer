// // This file has one job: send the uploaded CSV file to our backend
// // and return the AI-mapped result. Keeping this separate from the
// // page component keeps the component focused on the UI.

// import { ImportResult } from "./types";

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// export async function importCsvFile(file: File): Promise<ImportResult> {
//   // We send the file as "multipart/form-data", which is the normal
//   // way browsers upload files. FormData handles the encoding for us.
//   const formData = new FormData();
//   formData.append("file", file);

//   const response = await fetch(`${BACKEND_URL}/api/import`, {
//     method: "POST",
//     body: formData,
//   });

//   if (!response.ok) {
//     const errorBody = await response.json().catch(() => ({}));
//     throw new Error(errorBody.error || `Import request failed with status ${response.status}`);
//   }

//   return response.json();
// }


// This file has one job: send the uploaded CSV file to our backend
// and return the AI-mapped result. Keeping this separate from the
// page component keeps the component focused on the UI.
//
// The backend STREAMS progress events instead of sending one final
// response, so instead of `response.json()` we read the response body
// a little at a time and react to each event as it arrives (via the
// onEvent callback), still resolving with the final ImportResult once
// the "result" event shows up.

import { ImportResult, StreamEvent } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function importCsvFile(
  file: File,
  onEvent: (event: StreamEvent) => void
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_URL}/api/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Import request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("This browser doesn't support streaming responses.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let finalResult: ImportResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event: StreamEvent = JSON.parse(line);

      if (event.type === "error") {
        throw new Error(event.message);
      }
      if (event.type === "result") {
        finalResult = event.data;
      }

      onEvent(event);
    }
  }

  if (!finalResult) {
    throw new Error("The import finished without returning a result.");
  }

  return finalResult;
}