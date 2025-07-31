import { AlertCircle, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@ui/lib/utils";

interface ErrorWithHintsProps {
  error: string;
  hints?: string[];
  className?: string;
}

export function ErrorWithHints({ error, hints, className }: ErrorWithHintsProps) {
  const [showHints, setShowHints] = useState(false);

  return (
    <div 
      className={cn(
        "mt-4 p-3 bg-red-50 border border-red-200 rounded-md animate-fadeIn",
        className
      )}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start">
        <AlertCircle className="w-4 h-4 mr-2 mt-0.5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          
          {hints && hints.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowHints(!showHints)}
                className="mt-1 text-xs text-red-700 hover:text-red-800 flex items-center gap-1 transition-colors"
                aria-expanded={showHints}
              >
                <Info className="w-3 h-3" />
                {showHints ? "Hide" : "Show"} helpful tips
              </button>
              
              {showHints && (
                <ul className="mt-2 space-y-1 animate-slideDown">
                  {hints.map((hint, index) => (
                    <li key={index} className="text-xs text-gray-700 flex items-start">
                      <span className="mr-1">•</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}