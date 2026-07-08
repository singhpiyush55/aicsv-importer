// This component shows the FINAL result after the AI has processed
// the CSV: the successfully imported leads, and any rows that had to
// be skipped (with the reason why).

import { ImportResult } from "../lib/types";

// The fixed list of CRM columns we always want to show, in this order.
const CRM_COLUMNS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

interface ResultsTableProps {
  result: ImportResult;
}

export default function ResultsTable({ result }: ResultsTableProps) {
  return (
    <div className="space-y-8">
      {/* Summary counts */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-lg bg-green-50 px-5 py-3 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <span className="text-2xl font-bold">{result.totalImported}</span>
          <span className="ml-2">Imported</span>
        </div>
        <div className="rounded-lg bg-red-50 px-5 py-3 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <span className="text-2xl font-bold">{result.totalSkipped}</span>
          <span className="ml-2">Skipped</span>
        </div>
      </div>

      {/* Imported leads table */}
      <div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100">Imported Leads</h3>
        {result.imported.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No leads were imported.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 bg-gray-100 dark:bg-slate-800">
                  {CRM_COLUMNS.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-gray-200 dark:border-slate-700 px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-100"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.imported.map((lead, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-800/50"}>
                    {CRM_COLUMNS.map((column) => (
                      <td key={column} className="whitespace-nowrap border-b border-gray-100 dark:border-slate-700 px-4 py-2 text-gray-600 dark:text-gray-300">
                        {lead[column] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Skipped rows table */}
      {result.skipped.length > 0 && (
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100">Skipped Rows</h3>
          <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 bg-gray-100 dark:bg-slate-800">
                  <th className="whitespace-nowrap border-b border-gray-200 dark:border-slate-700 px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-100">
                    Reason
                  </th>
                  <th className="whitespace-nowrap border-b border-gray-200 dark:border-slate-700 px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-100">
                    Original Row (raw)
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.skipped.map((skippedRow, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-800/50"}>
                    <td className="border-b border-gray-100 dark:border-slate-700 px-4 py-2 text-red-600 dark:text-red-400">{skippedRow.reason}</td>
                    <td className="border-b border-gray-100 dark:border-slate-700 px-4 py-2 text-gray-500 dark:text-gray-400">
                      {JSON.stringify(skippedRow.originalRow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
