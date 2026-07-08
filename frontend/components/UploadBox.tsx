// This component shows the "drop your CSV here" box.
// It supports two ways to pick a file:
// 1. Dragging and dropping a file onto the box.
// 2. Clicking the box, which opens the normal file picker.

import { useRef, useState } from "react";

interface UploadBoxProps {
  onFileSelected: (file: File) => void;
}

export default function UploadBox({ onFileSelected }: UploadBoxProps) {
  // "isDraggingOver" just controls a little visual highlight while the
  // user is dragging a file over the box - purely cosmetic.
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // A hidden real <input type="file"> that we trigger by clicking
  // the styled box, so we can make the upload area look nice.
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;

    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      alert("Please upload a .csv file.");
      return;
    }

    onFileSelected(file);
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
        isDraggingOver 
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20" 
          : "border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-800"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <p className="text-lg font-medium text-gray-700 dark:text-gray-200">Drop your CSV file here</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">or click to browse files</p>
      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">Supports any CSV layout - column names don&apos;t need to match.</p>
    </div>
  );
}
