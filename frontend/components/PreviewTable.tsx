// A simple, reusable table component.
// We use this to show the RAW uploaded CSV rows before any AI
// processing happens (Step 2 of the assignment).

import { RawCsvRow } from "../lib/types";

interface PreviewTableProps {
  headers: string[];
  rows: RawCsvRow[];
}

export default function PreviewTable({ headers, rows }: PreviewTableProps) {
  return (
    // "max-h-96 overflow-auto" is what gives us both horizontal AND
    // vertical scrolling once the table gets too big for its box.
    <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          {/* "sticky top-0" keeps the header visible while scrolling down */}
          <tr className="sticky top-0 bg-gray-100 dark:bg-slate-800">
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap border-b border-gray-200 dark:border-slate-700 px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-100"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-800/50"}>
              {headers.map((header) => (
                <td key={header} className="whitespace-nowrap border-b border-gray-100 dark:border-slate-700 px-4 py-2 text-gray-600 dark:text-gray-300">
                  {row[header] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
