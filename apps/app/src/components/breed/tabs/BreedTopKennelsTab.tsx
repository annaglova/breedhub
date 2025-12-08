import { useState, useEffect } from "react";
import { AvatarCard, type AvatarEntity } from "@/components/shared/AvatarCard";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";

interface BreedTopKennelsTabProps {
  recordsCount?: number; // Number of records to display (from config)
}

/**
 * BreedTopKennelsTab component
 * Displays a grid of top kennels in the breed
 *
 * Grid columns:
 * - Default (drawer): 2 cols → sm:3 cols
 * - Fullscreen: 2 cols → sm:3 cols → lg:4 cols → xxl:5 cols
 *
 * Similar to Angular breed-top-kennels.component.ts
 */
export function BreedTopKennelsTab({ recordsCount }: BreedTopKennelsTabProps) {
  useSignals();

  // Read fullscreen state from spaceStore
  // Reference: Angular breed-top-kennels.component.ts - more columns on fullscreen
  const isFullscreen = spaceStore.isFullscreen.value;
  const [kennels, setKennels] = useState<AvatarEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Load kennels from SpaceStore child records using recordsCount
    // recordsCount will be used in API query: { limit: recordsCount }
    console.log('[BreedTopKennelsTab] recordsCount from config:', recordsCount);

    // For now, using mock data
    // Kennels displayed in rating order, no placement badges (badges are for patrons only)
    const mockKennels: AvatarEntity[] = [
      {
        id: "1",
        name: "Golden Heritage Kennels",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Golden Heritage",
        url: "/kennel/1"
      },
      {
        id: "2",
        name: "Royal Crown Breeding",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Royal Crown",
        url: "/kennel/2"
      },
      {
        id: "3",
        name: "Silver Star Kennel",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Silver Star",
        url: "/kennel/3"
      },
      {
        id: "4",
        name: "Diamond Legacy",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Diamond Legacy",
        url: "/kennel/4"
      },
      {
        id: "5",
        name: "Platinum Pride Kennel",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Platinum Pride",
        url: "/kennel/5"
      },
      {
        id: "6",
        name: "Champion's Choice",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Champions Choice",
        url: "/kennel/6"
      },
      {
        id: "7",
        name: "Elite Breeding House",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Elite Breeding",
        url: "/kennel/7"
      },
      {
        id: "8",
        name: "Noble Bloodline Kennel",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Noble Bloodline",
        url: "/kennel/8"
      },
      {
        id: "9",
        name: "Supreme Quality Dogs",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Supreme Quality",
        url: "/kennel/9"
      },
      {
        id: "10",
        name: "Prestige Kennel Club",
        avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Prestige Kennel",
        url: "/kennel/10"
      }
    ];

    setKennels(mockKennels);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading kennels...</div>
      </div>
    );
  }

  if (kennels.length === 0) {
    return (
      <div className="card mt-5 flex flex-auto flex-col p-6 lg:px-8">
        <span className="text-muted-foreground p-8 text-center font-medium">
          There are no kennels in the Breed!
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-3 grid grid-cols-2 gap-y-6 sm:grid-cols-3",
        // In fullscreen mode, show more columns on larger screens
        isFullscreen && "lg:grid-cols-4 xxl:grid-cols-5"
      )}
    >
      {kennels.map((kennel) => (
        <AvatarCard key={kennel.id} entity={kennel} model="kennel" />
      ))}
    </div>
  );
}
