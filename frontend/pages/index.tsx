// This is the ONE page our app needs. It walks the user through all
// four steps from the assignment:
//   1. Upload a CSV
//   2. Preview the raw rows (no AI yet)
//   3. Confirm import (this is when we call the backend/AI)
//   4. Show the AI-mapped results

import { useState } from "react";
import Papa from "papaparse";
import UploadBox from "../components/UploadBox";
import PreviewTable from "../components/PreviewTable";
import ResultsTable from "../components/ResultsTable";
import Loader from "../components/Loader";

// import { importCsvFile } from "../lib/api";
// import { ImportResult, RawCsvRow } from "../lib/types";

// NEW
import { importCsvFile } from "../lib/api";
import { ImportResult, ImportStage, RawCsvRow, StreamEvent } from "../lib/types";

import { useTheme } from "../lib/ThemeContext";

// The different "screens" the user can be on. Using a simple string
// union like this instead of separate boolean flags avoids ending up
// with confusing states like "isLoading=true AND showResults=true".
type Step = "upload" | "preview" | "processing" | "results";

export default function HomePage() {
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState<Step>("upload");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<RawCsvRow[]>([]);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // New state for loader.

  const [currentStage, setCurrentStage] = useState<ImportStage>("parsing");
  const [batchProgress, setBatchProgress] = useState<
      { batchesDone: number; totalBatches: number } | undefined
    >(undefined);
  // Step 1 -> Step 2: user picked a file. We parse it right here in
  // the browser just to SHOW a preview - no AI call happens yet.
  function handleFileSelected(file: File) {
    setSelectedFile(file);
    setErrorMessage(null);

    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields || [];
        setPreviewHeaders(headers);
        setPreviewRows(result.data);
        setStep("preview");
      },
      error: (err) => {
        setErrorMessage(`Could not read this CSV file: ${err.message}`);
      },
    });
  }

  // Step 3: user clicked "Confirm Import". NOW we actually send the
  // file to our backend, which will call the AI and return mapped leads.
  // async function handleConfirmImport() {
  //   if (!selectedFile) return;

  //   setStep("processing");
  //   setErrorMessage(null);

  //   try {
  //     const result = await importCsvFile(selectedFile);
  //     setImportResult(result);
  //     setStep("results");
  //   } catch (err) {
  //     const message = err instanceof Error ? err.message : "Something went wrong.";
  //     setErrorMessage(message);
  //     setStep("preview"); // send the user back so they can retry
  //   }
  // }

  async function handleConfirmImport() {
    if (!selectedFile) return;

    setStep("processing");
    setErrorMessage(null);
    setCurrentStage("parsing");
    setBatchProgress(undefined);

    function handleStreamEvent(event: StreamEvent) {
      if (event.type === "stage") {
        setCurrentStage(event.stage);
        if (event.stage === "ai_processing") {
          setBatchProgress({ batchesDone: 0, totalBatches: event.totalBatches });
        } else {
          setBatchProgress(undefined);
        }
      } else if (event.type === "progress") {
        setBatchProgress({ batchesDone: event.batchesDone, totalBatches: event.totalBatches });
      }
    }

    try {
      const result = await importCsvFile(selectedFile, handleStreamEvent);
      setImportResult(result);
      setStep("results");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(message);
      setStep("preview");
    }
  }

  // Lets the user start over with a brand new file.
  function handleStartOver() {
    setStep("upload");
    setSelectedFile(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setImportResult(null);
    setErrorMessage(null);

    // Reset loader state when starting over
    setCurrentStage("parsing"); 
    setBatchProgress(undefined);  
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI CSV Importer</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Upload a CSV in any layout - our AI will map it into desired CRM format.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "dark" ? (
              "☀️"
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {step === "upload" && <UploadBox onFileSelected={handleFileSelected} />}

      {step === "preview" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
              Preview: {selectedFile?.name} ({previewRows.length} rows)
            </h2>
            <PreviewTable headers={previewHeaders} rows={previewRows} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirmImport}
              className="rounded-lg bg-blue-600 dark:bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
            >
              Confirm Import
            </button>
            <button
              onClick={handleStartOver}
              className="rounded-lg border border-gray-300 dark:border-slate-600 px-5 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Choose a Different File
            </button>
          </div>
        </div>
      )}

      {/* {step === "processing" && <Loader message="AI is mapping your CSV into CRM leads. This can take a moment..." />} */}

      {step === "processing" && <Loader currentStage={currentStage} batchProgress={batchProgress} />}

      {step === "results" && importResult && (
        <div className="space-y-6">
          <ResultsTable result={importResult} />
          <button
            onClick={handleStartOver}
            className="rounded-lg border border-gray-300 dark:border-slate-600 px-5 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Import Another CSV
          </button>
        </div>
      )}
    </main>
  );
}
