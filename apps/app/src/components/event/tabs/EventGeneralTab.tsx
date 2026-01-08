import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Calendar, Flag, MapPin, Trophy } from "lucide-react";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

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

// Mock data for visual development
const MOCK_DATA: EventGeneralData = {
  category: { id: "1", name: "International Show" },
  startDate: "2025-10-15",
  country: { id: "de", name: "Germany" },
  status: { id: "1", name: "Upcoming" },
  judges: [
    {
      id: "judge-1",
      name: "Hans Mueller",
      slug: "hans-mueller",
      avatarUrl: "",
    },
    {
      id: "judge-2",
      name: "Maria Schmidt",
      slug: "maria-schmidt",
      avatarUrl: "",
    },
    {
      id: "judge-3",
      name: "Klaus Weber",
      slug: "klaus-weber",
      avatarUrl: "",
    },
  ],
};

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
    <div className="outline-offset-2.5 flex-0 flex size-10 items-center justify-center overflow-hidden rounded-full border outline outline-2 outline-offset-2 outline-surface-300 dark:outline-surface-400">
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
 * 1. Info - Category, Date, Country, Status
 * 2. Judges - List of judges with avatars
 *
 * Based on Angular: event-info.component.ts
 */
export function EventGeneralTab({ onLoadedCount }: EventGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity when available
  // For now always using mock data for visual development
  const data: EventGeneralData = MOCK_DATA;

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
