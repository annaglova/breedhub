import React from "react";

export interface FeatureStatus {
  id: string;
  name: string;
  url: string;
}

export interface FeatureProps {
  iconName?: string;
  bgColor?: string;
  featureName?: string;
  featureDescription?: string;
  featureStatus: FeatureStatus;
}

export default function Feature({
  iconName,
  bgColor = "#6366f1",
  featureName,
  featureDescription,
  featureStatus,
}: FeatureProps) {
  return (
    <div className="flex space-x-4">
      <div
        className="flex h-12 w-12 min-w-[3rem] items-center justify-center rounded-full text-white"
        style={{ backgroundColor: bgColor }}
      >
        {iconName && (
          <i className={`pi pi-${iconName}`} style={{ fontSize: "1.25rem" }} />
        )}
      </div>
      <div className="space-y-1">
        <div className="text-lg font-semibold">{featureName}</div>
        {featureStatus?.name === "Coming soon" && (
          <div
            className="max-w-[7rem] rounded-full px-1.5 py-1 text-center text-sm font-bold uppercase text-white"
            style={{ backgroundColor: bgColor }}
          >
            Coming soon
          </div>
        )}
        <div className="text-gray-600">{featureDescription}</div>
      </div>
    </div>
  );
}