import { PetCard, type Pet } from "@/components/shared/PetCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Calendar, Dog, Home } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Link entity (Kennel, Breed, etc.)
 */
interface LinkEntity {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * Breeder career data
 */
interface BreederData {
  kennel?: LinkEntity;
  foundationYear?: number;
  breeds?: LinkEntity[];
  offspringPets?: Pet[];
}

// Mock data for visual development
const MOCK_DATA: BreederData = {
  kennel: {
    id: "kennel-1",
    name: "Sunshine Kennel",
    slug: "sunshine-kennel",
  },
  foundationYear: 2015,
  breeds: [
    { id: "breed-1", name: "German Shepherd", slug: "german-shepherd" },
    { id: "breed-2", name: "Belgian Malinois", slug: "belgian-malinois" },
    { id: "breed-3", name: "Dutch Shepherd", slug: "dutch-shepherd" },
  ],
  offspringPets: [
    {
      id: "offspring-1",
      name: "Max vom Sunshine",
      avatarUrl: "",
      url: "/pet/max-vom-sunshine",
      sex: "male",
      countryOfBirth: "UA",
      dateOfBirth: "2024-03-15",
      father: {
        id: "father-1",
        name: "Champion Rex von Berlin",
        url: "/pet/champion-rex-von-berlin",
      },
      mother: {
        id: "mother-1",
        name: "Luna vom Sunshine",
        url: "/pet/luna-vom-sunshine",
      },
    },
    {
      id: "offspring-2",
      name: "Bella vom Sunshine",
      avatarUrl: "",
      url: "/pet/bella-vom-sunshine",
      sex: "female",
      countryOfBirth: "UA",
      dateOfBirth: "2024-03-15",
      father: {
        id: "father-1",
        name: "Champion Rex von Berlin",
        url: "/pet/champion-rex-von-berlin",
      },
      mother: {
        id: "mother-1",
        name: "Luna vom Sunshine",
        url: "/pet/luna-vom-sunshine",
      },
    },
    {
      id: "offspring-3",
      name: "Rocky vom Sunshine",
      avatarUrl: "",
      url: "/pet/rocky-vom-sunshine",
      sex: "male",
      countryOfBirth: "UA",
      dateOfBirth: "2023-08-20",
      father: {
        id: "father-2",
        name: "Bruno vom München",
        url: "/pet/bruno-vom-munchen",
      },
      mother: {
        id: "mother-2",
        name: "Stella vom Sunshine",
        url: "/pet/stella-vom-sunshine",
      },
    },
    {
      id: "offspring-4",
      name: "Aria vom Sunshine",
      avatarUrl: "",
      url: "/pet/aria-vom-sunshine",
      sex: "female",
      countryOfBirth: "UA",
      dateOfBirth: "2023-05-10",
      father: {
        id: "father-1",
        name: "Champion Rex von Berlin",
        url: "/pet/champion-rex-von-berlin",
      },
      mother: {
        id: "mother-1",
        name: "Luna vom Sunshine",
        url: "/pet/luna-vom-sunshine",
      },
    },
  ],
};

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({
  entity,
  entityRole,
}: {
  entity?: LinkEntity;
  entityRole?: string;
}) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <Link
        to={url}
        className={cn(
          "hover:underline",
          entityRole === "kennel" && "text-kennel",
          entityRole === "breed" && "text-breed",
          !entityRole && "text-primary"
        )}
      >
        {entity.name}
      </Link>
    );
  }

  return <span>{entity.name}</span>;
}

/**
 * BreedLinks - Renders list of breed links with bullets
 */
function BreedLinks({ breeds }: { breeds?: LinkEntity[] }) {
  if (!breeds || breeds.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap space-x-1">
      <EntityLink entity={breeds[0]} entityRole="breed" />
      {breeds.slice(1).map((breed) => (
        <div key={breed.id || breed.name} className="flex space-x-1">
          <span className="text-primary">&bull;</span>
          <EntityLink entity={breed} entityRole="breed" />
        </div>
      ))}
    </div>
  );
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
 * SectionHeader - Section title with horizontal line
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center space-x-2">
      <span className="font-bold text-secondary whitespace-nowrap">{title}</span>
      <div className="bg-secondary-200 h-[1px] w-full"></div>
    </div>
  );
}

interface ContactBreederTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * ContactBreederTab - Contact's breeder career information
 *
 * Displays:
 * 1. Info - Kennel, Since (foundation year), Breeds
 * 2. Offsprings - Grid of pet cards
 *
 * Based on Angular: contact-breeder.component.ts
 */
export function ContactBreederTab({ onLoadedCount }: ContactBreederTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity when available
  // For now always using mock data for visual development
  const data: BreederData = MOCK_DATA;

  const offspringPets = data.offspringPets || [];

  // Report loaded count (offspring pets count)
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(offspringPets.length);
    }
  }, [onLoadedCount, offspringPets.length]);

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
          <div className="grid grid-cols-[16px_50px_1fr] sm:grid-cols-[22px_60px_1fr] items-center gap-3 px-4 pb-2 flex-1">
            <InfoRow icon={<Home size={iconSize} />} label="Kennel">
              <EntityLink entity={data.kennel} entityRole="kennel" />
            </InfoRow>
            <InfoRow icon={<Calendar size={iconSize} />} label="Since">
              <span>{data.foundationYear || "—"}</span>
            </InfoRow>
            <InfoRow icon={<Dog size={iconSize} />} label="Breeds">
              <BreedLinks breeds={data.breeds} />
            </InfoRow>
          </div>
        </div>
      </Fieldset>

      {/* Offsprings */}
      <SectionHeader title="Offsprings" />

      {offspringPets.length > 0 ? (
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4"
          )}
        >
          {offspringPets.map((pet) => (
            <PetCard key={pet.id} pet={pet} mode="default" />
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center block">
          No offspring pets
        </span>
      )}
    </div>
  );
}
