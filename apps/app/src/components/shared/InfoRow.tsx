import type React from "react";
import { SmartLink } from "./SmartLink";

/**
 * InfoRow - Single row in an info grid (icon + label + value)
 * Used across all GeneralTab components.
 *
 * Parent should use CSS grid: grid-cols-[16px_60px_1fr] or similar
 */
export function InfoRow({
  icon,
  label,
  subLabel,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="text-secondary-400">{icon}</span>
      {subLabel ? (
        <div className="flex flex-col leading-tight">
          <span className="text-secondary">{label}</span>
          <span className="text-secondary text-sm">{subLabel}</span>
        </div>
      ) : (
        <span className="text-secondary">{label}</span>
      )}
      <div>{children}</div>
    </>
  );
}

/**
 * Fieldset - Section wrapper with legend border
 * Used across all GeneralTab components.
 */
export function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border border-border rounded-lg">
      <legend className="ml-4 px-2 text-sm text-muted-foreground">
        {legend}
      </legend>
      <div className="p-4 pt-2">{children}</div>
    </fieldset>
  );
}

/**
 * LinkEntity - Interface for linked entities (Father, Mother, Breeder, etc.)
 */
export interface LinkEntity {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * EntityLink - Renders entity name as SmartLink or plain text.
 * Used across GeneralTab components for father, mother, breeder, kennel links.
 */
export function EntityLink({ entity }: { entity?: LinkEntity }) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return <SmartLink to={url}>{entity.name}</SmartLink>;
  }

  return <span>{entity.name}</span>;
}
