// A small, reusable loading spinner with a message and progress stages.
// Shown while the backend is busy calling the AI (Step 3 -> Step 4).

// interface LoaderProps {
//   message: string;
// } // old loader, staic one, no comm with be;

import { ImportStage } from "../lib/types";

interface LoaderProps {
  currentStage: ImportStage;
  batchProgress?: { batchesDone: number; totalBatches: number };
}

// export default function Loader({ message }: LoaderProps) {
//   // Progress stages during AI processing
//   const stages = [
//     "Parsing CSV",
//     "Processing with AI",
//     "Generating results",
//   ];

//   return (
//     <div className="flex flex-col items-center justify-center gap-6 py-16">
//       {/* This div is just a circle with one colored border side,
//           spun forever with Tailwind's "animate-spin" utility. */}
//       <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />
//       <p className="text-center text-gray-600 dark:text-gray-300">{message}</p>
      
//       {/* Progress indicators */}
//       <div className="space-y-2">
//         {stages.map((stage, index) => (
//           <div key={index} className="flex items-center gap-2">
//             <div className={`h-2 w-2 rounded-full transition-colors ${
//               index === 0 ? 'bg-blue-600 dark:bg-blue-400 animate-pulse' : 'bg-gray-300 dark:bg-slate-600'
//             }`} />
//             <span className={`text-sm ${
//               index === 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'
//             }`}>
//               {stage}
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

const STAGES: { key: ImportStage; label: string }[] = [
  { key: "parsing", label: "Parsing CSV" },
  { key: "ai_processing", label: "Processing with AI" },
  { key: "generating_results", label: "Generating results" },
];

export default function Loader({ currentStage, batchProgress }: LoaderProps) {
  const currentIndex = STAGES.findIndex((stage) => stage.key === currentStage);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />

      <div className="space-y-2">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          const label =
            isActive && stage.key === "ai_processing" && batchProgress
              ? `${stage.label} (${batchProgress.batchesDone} of ${batchProgress.totalBatches} batches)`
              : stage.label;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full transition-colors ${
                  isActive
                    ? "bg-blue-600 dark:bg-blue-400 animate-pulse"
                    : isCompleted
                    ? "bg-blue-600 dark:bg-blue-400"
                    : "bg-gray-300 dark:bg-slate-600"
                }`}
              />
              <span
                className={`text-sm ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : isCompleted
                    ? "text-gray-500 dark:text-gray-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}