import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  Building2,
  Facebook,
  Instagram,
  Languages,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useEffect } from "react";

/**
 * Dictionary value (Country, City, Language, etc.)
 */
interface DictionaryValue {
  id?: string;
  name: string;
}

/**
 * Contact general data
 */
interface ContactGeneralData {
  country?: DictionaryValue;
  city?: DictionaryValue;
  phoneNumbers?: string[];
  emails?: string[];
  facebookLinks?: string[];
  instagramLinks?: string[];
  languages?: DictionaryValue[];
}

// Mock data for visual development
const MOCK_DATA: ContactGeneralData = {
  country: { id: "ua", name: "Ukraine" },
  city: { id: "kyiv", name: "Kyiv" },
  phoneNumbers: ["+380 67 123 4567", "+380 50 987 6543"],
  emails: ["breeder@example.com", "info@kennel-sunshine.com"],
  facebookLinks: ["facebook.com/kennel.sunshine"],
  instagramLinks: ["@kennel_sunshine", "@dog_breeder_ua"],
  languages: [
    { id: "uk", name: "Ukrainian" },
    { id: "en", name: "English" },
    { id: "de", name: "German" },
  ],
};

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
 * ListValue - Renders a list of values with bullets
 */
function ListValue({ values }: { values?: string[] }) {
  if (!values || values.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap space-x-1">
      <span>{values[0]}</span>
      {values.slice(1).map((value, index) => (
        <div key={index} className="flex space-x-1">
          <span className="text-secondary">&bull;</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * LanguageList - Renders a list of languages with bullets
 */
function LanguageList({ languages }: { languages?: DictionaryValue[] }) {
  if (!languages || languages.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap space-x-1">
      <span>{languages[0].name}</span>
      {languages.slice(1).map((language, index) => (
        <div key={language.id || index} className="flex space-x-1">
          <span className="text-secondary">&bull;</span>
          <span>{language.name}</span>
        </div>
      ))}
    </div>
  );
}

interface ContactGeneralTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * ContactGeneralTab - Contact general information
 *
 * Displays:
 * 1. Info - Country, City
 * 2. Contact - Phone, Email
 * 3. Social network - Facebook, Instagram
 * 4. Languages
 *
 * Based on Angular: contact-info.component.ts
 */
export function ContactGeneralTab({ onLoadedCount }: ContactGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity when available
  // For now always using mock data for visual development
  const data: ContactGeneralData = MOCK_DATA;

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
          {/* Country, City */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <span>{data.country?.name || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Building2 size={iconSize} />} label="City">
              <span>{data.city?.name || "—"}</span>
            </InfoRow>
          </div>

          {/* Phone, Email */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Phone size={iconSize} />} label="Phone">
              <ListValue values={data.phoneNumbers} />
            </InfoRow>
            <InfoRow icon={<Mail size={iconSize} />} label="Email">
              <ListValue values={data.emails} />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Social network */}
      <Fieldset legend="Social network">
        <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2">
          <InfoRow icon={<Facebook size={iconSize} />} label="Facebook">
            <ListValue values={data.facebookLinks} />
          </InfoRow>
          <InfoRow icon={<Instagram size={iconSize} />} label="Instagram">
            <ListValue values={data.instagramLinks} />
          </InfoRow>
        </div>
      </Fieldset>

      {/* Languages */}
      <Fieldset legend="Languages">
        <div className="flex items-center space-x-5 px-4 pb-2">
          <Languages size={iconSize} className="text-secondary-400" />
          <LanguageList languages={data.languages} />
        </div>
      </Fieldset>
    </div>
  );
}
