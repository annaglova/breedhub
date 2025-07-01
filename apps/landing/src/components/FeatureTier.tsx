import React from "react";

export type TierValue = boolean | string | null;

export interface FeatureTierProps {
  featureTier: TierValue;
}

export default function FeatureTier({ featureTier }: FeatureTierProps) {
  // If featureTier is true, show checkmark
  if (featureTier === true) {
    return (
      <div className="item">
        <i className="pi pi-check font-bold text-green-500" />
      </div>
    );
  }

  // If featureTier is a string (like "100 MB/50 photos"), show the text
  if (typeof featureTier === "string" && featureTier.length > 0) {
    return (
      <div className="item">
        <span className="text-sm font-medium">{featureTier}</span>
      </div>
    );
  }

  // If featureTier is false or null, show minus sign
  return (
    <div className="item">
      <i className="pi pi-minus font-bold text-gray-400" />
    </div>
  );
}