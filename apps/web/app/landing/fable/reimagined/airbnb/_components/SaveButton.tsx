"use client";

import { useState } from "react";

/** The heart in the top-right corner of every card. */
export function SaveButton({ name }: { name: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={() => setSaved((s) => !s)}
      className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/80 backdrop-blur hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          d="M12 20.3 4.6 13a4.7 4.7 0 0 1 6.6-6.6l.8.8.8-.8a4.7 4.7 0 0 1 6.6 6.6z"
          fill={saved ? "#e4a93c" : "rgba(16,32,31,0.45)"}
          stroke={saved ? "#e4a93c" : "#ffffff"}
          strokeWidth="1.5"
        />
      </svg>
    </button>
  );
}
