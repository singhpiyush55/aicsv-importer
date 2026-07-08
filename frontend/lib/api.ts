// This file has one job: send the uploaded CSV file to our backend
// and return the AI-mapped result. Keeping this separate from the
// page component keeps the component focused on the UI.

import { ImportResult } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function importCsvFile(file: File): Promise<ImportResult> {
  // We send the file as "multipart/form-data", which is the normal
  // way browsers upload files. FormData handles the encoding for us.
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

  return response.json();
}
