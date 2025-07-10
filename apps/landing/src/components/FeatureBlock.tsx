import React from "react";
import Feature, { type FeatureStatus } from "./Feature";

export interface PublicConfItem {
  description: string;
  id: string;
  icon: string;
  name: string;
  status: FeatureStatus;
  url: string;
}

export interface PublicProductService {
  confItems: PublicConfItem[];
  color: string;
  id: string;
  name: string;
  url: string;
}

export interface FeatureBlockProps {
  service?: PublicProductService;
}

export default function FeatureBlock({ service }: FeatureBlockProps) {
  if (!service) return null;

  return (
    <div className="flex flex-col">
      <div
        className="rounded-full px-5 py-3 text-xl font-bold uppercase text-white"
        style={{ backgroundColor: service.color }}
      >
        {service.name}
      </div>
      <div className="mt-5 grid gap-10 py-5 md:grid-cols-2 lg:grid-cols-3">
        {service.confItems?.map((feature) => (
          <Feature
            key={feature.id}
            iconName={feature.icon}
            bgColor={service.color}
            featureName={feature.name}
            featureDescription={feature.description}
            featureStatus={feature.status}
          />
        ))}
      </div>
    </div>
  );
}