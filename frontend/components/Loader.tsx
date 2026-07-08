// A small, reusable loading spinner with a message.
// Shown while the backend is busy calling the AI (Step 3 -> Step 4).

interface LoaderProps {
  message: string;
}

export default function Loader({ message }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      {/* This div is just a circle with one colored border side,
          spun forever with Tailwind's "animate-spin" utility. */}
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
