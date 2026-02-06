import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Calendar, Flag, MapPin, Trophy } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

/**
 * DataSource config for loading judges
 */
const JUDGES_DATA_SOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "judge_in_program_with_details",
    parentField: "program_id",
  },
};

/**
 * Dictionary value (Country, Category, Status, etc.)
 */
interface DictionaryValue {
  id?: string;
  name: string;
}

/**
 * Judge reference
 */
interface Judge {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
  avatarUrl?: string;
}

/**
 * Event general data
 */
interface EventGeneralData {
  category?: DictionaryValue;
  startDate?: string;
  country?: DictionaryValue;
  status?: DictionaryValue;
  judges?: Judge[];
}


/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * InfoRow - Single row in the info grid
 */
function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="text-secondary-400">{icon}</span>
      <span className="text-secondary">{label}</span>
      <div>{children}</div>
    </>
  );
}

/**
 * Fieldset - Section wrapper with legend
 */
function Fieldset({
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
 * JudgeAvatar - Avatar with initial fallback
 */
function JudgeAvatar({ judge }: { judge: Judge }) {
  const initial = judge.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="flex-0 flex size-10 items-center justify-center overflow-hidden rounded-full border outline outline-2 outline-offset-2 outline-secondary-300 dark:outline-secondary-400">
      {judge.avatarUrl ? (
        <img
          className="size-full object-cover"
          src={judge.avatarUrl}
          alt={judge.name}
        />
      ) : (
        <div className="flex size-full items-center justify-center rounded-full bg-gray-200 text-lg uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-200">
          {initial}
        </div>
      )}
    </div>
  );
}

/**
 * JudgeLink - Link to judge profile
 */
function JudgeLink({ judge }: { judge: Judge }) {
  const url = judge.slug ? `/${judge.slug}` : judge.url;

  if (url) {
    return (
      <Link to={url} className="text-contact hover:underline">
        {judge.name}
      </Link>
    );
  }

  return <span>{judge.name}</span>;
}

interface EventGeneralTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * EventGeneralTab - Event general information
 *
 * Displays:
 * 1. Info - Type, Date, Country, Status (from program entity + dictionary enrichment)
 * 2. Judges - List of judges with avatars (TODO: implement with VIEW)
 *
 * Based on Angular: event-info.component.ts
 */
export function EventGeneralTab({ onLoadedCount }: EventGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const programId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Enrichment from dictionaries
  const typeName = useDictionaryValue("program_type", selectedEntity?.type_id);
  const statusName = useDictionaryValue("program_status", selectedEntity?.status_id);
  const countryName = useDictionaryValue("country", selectedEntity?.country_id);

  // Load judges from VIEW
  const { data: judgesRaw } = useTabData({
    parentId: programId,
    dataSource: JUDGES_DATA_SOURCE,
    enabled: !!programId,
  });

  // Transform judges data
  const judges = useMemo<Judge[]>(() => {
    if (!judgesRaw || judgesRaw.length === 0) return [];
    return judgesRaw.map((item: any) => ({
      id: item.contact_id || item.additional?.contact_id,
      name: item.contact_name || item.additional?.contact_name || "Unknown",
      slug: item.contact_slug || item.additional?.contact_slug,
    }));
  }, [judgesRaw]);

  // Build data from entity + enrichment
  const data: EventGeneralData = {
    category: typeName ? { name: typeName } : undefined,
    startDate: selectedEntity?.start_date,
    country: countryName ? { name: countryName } : undefined,
    status: statusName ? { name: statusName } : undefined,
    judges,
  };

  // Report count after render (always 1 for general info)
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(1);
    }
  }, [onLoadedCount]);

  const iconSize = 16;

  return (
    <div className="flex flex-col space-y-5 px-6 cursor-default">
      {/* Info */}
      <Fieldset legend="Info">
        <div
          className={cn(
            "flex flex-col",
            isFullscreen && "lg:flex-row lg:divide-x divide-border"
          )}
        >
          {/* Category, Date */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Trophy size={iconSize} />} label="Category">
              <span>{data.category?.name || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Calendar size={iconSize} />} label="Date">
              <span>{formatDate(data.startDate)}</span>
            </InfoRow>
          </div>

          {/* Country, Status */}
          <div className="grid grid-cols-[16px_60px_1fr] sm:grid-cols-[22px_70px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <span>{data.country?.name || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Flag size={iconSize} />} label="Status">
              <span>{data.status?.name || "—"}</span>
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Judges */}
      <Fieldset legend="Judges">
        {data.judges && data.judges.length > 0 ? (
          <div className="grid grid-cols-[42px_1fr] items-center gap-5 px-4 pb-2">
            {data.judges.map((judge) => (
              <React.Fragment key={judge.id || judge.name}>
                <JudgeAvatar judge={judge} />
                <JudgeLink judge={judge} />
              </React.Fragment>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground px-4 pb-2">No judges</span>
        )}
      </Fieldset>
    </div>
  );
}
