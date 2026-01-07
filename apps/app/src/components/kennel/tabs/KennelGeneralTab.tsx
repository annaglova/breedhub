import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import {
  Building2,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Link entity (Owner, etc.)
 */
interface LinkEntity {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * Dictionary value (Country, City, Federation, etc.)
 */
interface DictionaryValue {
  id?: string;
  name: string;
}

/**
 * Kennel general data
 */
interface KennelGeneralData {
  owner?: LinkEntity;
  federation?: DictionaryValue;
  country?: DictionaryValue;
  city?: DictionaryValue;
  phoneNumbers?: string[];
  emails?: string[];
  facebookLinks?: string[];
  instagramLinks?: string[];
}

// Mock data for visual development
const MOCK_DATA: KennelGeneralData = {
  owner: {
    id: "1",
    name: "Klaus Bergmann",
    slug: "klaus-bergmann",
  },
  federation: { id: "fci", name: "VDH / FCI" },
  country: { id: "de", name: "Germany" },
  city: { id: "berlin", name: "Berlin" },
  phoneNumbers: ["+49 123 456 7890", "+49 987 654 3210"],
  emails: ["info@haus-wunderbar.de", "breeding@haus-wunderbar.de"],
  facebookLinks: ["facebook.com/hauswunderbar"],
  instagramLinks: ["@hauswunderbar_gsd"],
};

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({ entity }: { entity?: LinkEntity }) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <Link to={url} className="text-primary hover:underline">
        {entity.name}
      </Link>
    );
  }

  return <span>{entity.name}</span>;
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

interface KennelGeneralTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * KennelGeneralTab - Kennel general information
 *
 * Displays:
 * 1. Info - Owner, Federation, Country, City
 * 2. Contact - Phone, Email
 * 3. Social network - Facebook, Instagram
 *
 * Based on Angular: kennel-info.component.ts
 */
export function KennelGeneralTab({ onLoadedCount }: KennelGeneralTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // Check if entity has actual data
  const hasEntityData = selectedEntity && selectedEntity.name;

  // TODO: Load real data from entity
  // For now using mock data when no entity data
  const data: KennelGeneralData = hasEntityData
    ? {
        owner: selectedEntity.owner,
        federation: selectedEntity.federation,
        country: selectedEntity.country,
        city: selectedEntity.city,
        phoneNumbers: selectedEntity.phone_numbers || selectedEntity.phoneNumbers,
        emails: selectedEntity.emails,
        facebookLinks: selectedEntity.facebook_links || selectedEntity.facebookLinks,
        instagramLinks: selectedEntity.instagram_links || selectedEntity.instagramLinks,
      }
    : MOCK_DATA;

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
          {/* Owner, Federation */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<User size={iconSize} />} label="Owner">
              <EntityLink entity={data.owner} />
            </InfoRow>
            <InfoRow icon={<Globe size={iconSize} />} label="Federation">
              <span>{data.federation?.name || "—"}</span>
            </InfoRow>
          </div>

          {/* Country, City */}
          <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<MapPin size={iconSize} />} label="Country">
              <span>{data.country?.name || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Building2 size={iconSize} />} label="City">
              <span>{data.city?.name || "—"}</span>
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Contact */}
      <Fieldset legend="Contact">
        <div className="grid grid-cols-[16px_70px_1fr] sm:grid-cols-[22px_80px_1fr] items-center gap-3 px-4 pb-2">
          <InfoRow icon={<Phone size={iconSize} />} label="Phone">
            <ListValue values={data.phoneNumbers} />
          </InfoRow>
          <InfoRow icon={<Mail size={iconSize} />} label="Email">
            <ListValue values={data.emails} />
          </InfoRow>
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
    </div>
  );
}
