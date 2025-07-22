export type TierValue = boolean | string | null;

export interface FeatureTierProps {
  featureTier: TierValue;
}

export default function FeatureTier({ featureTier }: FeatureTierProps) {
  // If featureTier is true, show checkmark
  if (featureTier === true) {
    return (
      <div className="flex justify-center">
        <svg
          className="w-5 h-5 text-green-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    );
  }

  // If featureTier is a string (like "100 MB/50 photos"), show the text
  if (typeof featureTier === "string" && featureTier.length > 0) {
    return (
      <div className="text-center">
        <span className="text-sm font-medium text-gray-700">{featureTier}</span>
      </div>
    );
  }

  // If featureTier is false or null, show minus sign
  return (
    <div className="flex justify-center">
      <svg
        className="w-5 h-5 text-gray-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 12H4"
        />
      </svg>
    </div>
  );
}
