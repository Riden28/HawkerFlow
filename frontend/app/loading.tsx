"use client";

import { useState, useEffect } from "react";

// Custom hook that returns true only after the specified delay (in ms)
function useMinimumDelay(delay: number): boolean {
  const [isDelayElapsed, setIsDelayElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsDelayElapsed(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return isDelayElapsed;
}

export default function Loading() {
  // Ensure that at least 1 second has passed before rendering the full content
  const delayPassed = useMinimumDelay(1000);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600">
      <div className="flex flex-col items-center">
        <svg
          className="animate-spin h-16 w-16 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        {delayPassed ? (
          <p className="mt-4 text-2xl text-white">Loading, please wait...</p>
        ) : (
          // Optionally show a minimal placeholder until the delay is over
          <p className="mt-4 text-2xl text-white">Loading...</p>
        )}
      </div>
    </div>
  );
}
