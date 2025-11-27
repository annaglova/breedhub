import { PetCard, type Pet } from "@/components/shared/PetCard";
import { cn } from "@ui/lib/utils";
import { useEffect, useState } from "react";

interface BreedTopPetsTabProps {
  isFullscreen?: boolean; // Fullscreen/drawer mode - shows more columns
}

/**
 * BreedTopPetsTab component
 * Displays a grid of top pets in the breed
 *
 * Grid columns:
 * - Default (drawer): 1 col → sm:2 cols
 * - Fullscreen: 1 col → sm:2 cols → lg:3 cols → xxl:4 cols
 *
 * Similar to Angular breed-top-pets.component.ts
 */
export function BreedTopPetsTab({
  isFullscreen = false,
}: BreedTopPetsTabProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Load pets from SpaceStore child records
    // For now, using mock data
    const mockPets: Pet[] = [
      {
        id: "1",
        name: "Champion Golden Thunder",
        avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=pet1",
        url: "/pet/1",
        sex: "male",
        countryOfBirth: "USA",
        dateOfBirth: "2020-05-15",
        titles:
          "Ch. Int. Ch. Grand Ch. World Winner 2023, European Winner 2023, National Winner 2022",
        father: { name: "Supreme Gold Star", url: "/pet/father1" },
        mother: { name: "Royal Diamond Lady", url: "/pet/mother1" },
      },
      {
        id: "2",
        name: "Princess Silver Moon",
        avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=pet2",
        url: "/pet/2",
        sex: "female",
        countryOfBirth: "UK",
        dateOfBirth: "2019-08-22",
        titles:
          "Int. Ch. Multi Ch. Best in Show Winner, Westminster Winner 2023",
        father: { name: "Moonlight Shadow", url: "/pet/father2" },
        mother: { name: "Silver Belle", url: "/pet/mother2" },
      },
      {
        id: "3",
        name: "Duke Copper Crown",
        avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=pet3",
        url: "/pet/3",
        sex: "male",
        countryOfBirth: "Germany",
        dateOfBirth: "2021-03-10",
        father: { name: "Bronze King", url: "/pet/father3" },
        mother: { name: "Crown Jewel", url: "/pet/mother3" },
      },
      {
        id: "4",
        name: "Lady Amber Rose",
        avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=pet4",
        url: "/pet/4",
        sex: "female",
        countryOfBirth: "France",
        dateOfBirth: "2020-11-05",
        titles: "Junior Champion, Young Champion, Club Winner 2022",
        father: { name: "Royal Rose", url: "/pet/father4" },
        mother: { name: "Amber Dream", url: "/pet/mother4" },
      },
      {
        id: "5",
        name: "Baron Black Knight",
        avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=pet5",
        url: "/pet/5",
        sex: "male",
        countryOfBirth: "Canada",
        dateOfBirth: "2019-06-18",
        father: { name: "Dark Shadow", url: "/pet/father5" },
        mother: { name: "Knight's Lady", url: "/pet/mother5" },
      },
      {
        id: "6",
        name: "Queen Velvet Star",
        avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=pet6",
        url: "/pet/6",
        sex: "female",
        countryOfBirth: "Australia",
        dateOfBirth: "2021-09-30",
        titles: "Ch. National Winner 2023, Best of Breed Multiple Times",
        father: { name: "Starlight Express", url: "/pet/father6" },
        mother: { name: "Velvet Touch", url: "/pet/mother6" },
      },
    ];

    setPets(mockPets);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading pets...</div>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="card mt-5 flex flex-auto flex-col p-6 lg:px-8">
        <span className="text-muted-foreground p-8 text-center font-medium">
          There are no pets in the Breed!
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 px-6",
        // In fullscreen mode, show more columns on larger screens
        isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4"
      )}
    >
      {pets.map((pet) => (
        <PetCard key={pet.id} pet={pet} mode="default" />
      ))}
    </div>
  );
}
