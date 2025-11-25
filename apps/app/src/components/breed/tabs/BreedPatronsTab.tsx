import { useState, useEffect } from "react";
import { AvatarCard } from "@/components/shared/AvatarCard";

/**
 * Patron data structure
 */
interface Patron {
  id: string;
  name: string;
  avatarUrl: string;
  place?: number; // Placement badge (1-20)
  url: string; // Link to patron profile
}

/**
 * BreedPatronsTab component
 * Displays a grid of patron avatars with placement badges
 *
 * Similar to Angular breed-patrons.component.ts
 */
export function BreedPatronsTab() {
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Load patrons from SpaceStore child records
    // For now, using mock data
    const mockPatrons: Patron[] = [
      {
        id: "1",
        name: "John Smith",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
        place: 1,
        url: "/contact/1"
      },
      {
        id: "2",
        name: "Emma Johnson",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
        place: 2,
        url: "/contact/2"
      },
      {
        id: "3",
        name: "Michael Brown",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
        place: 3,
        url: "/contact/3"
      },
      {
        id: "4",
        name: "Sarah Davis",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        place: 4,
        url: "/contact/4"
      },
      {
        id: "5",
        name: "David Wilson",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        place: 5,
        url: "/contact/5"
      },
      {
        id: "6",
        name: "Lisa Anderson",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
        place: 6,
        url: "/contact/6"
      },
      {
        id: "7",
        name: "Robert Taylor",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
        place: 10,
        url: "/contact/7"
      },
      {
        id: "8",
        name: "Jennifer Martinez",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer",
        place: 15,
        url: "/contact/8"
      },
      {
        id: "9",
        name: "James Garcia",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
        url: "/contact/9"
      },
      {
        id: "10",
        name: "Patricia Miller",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia",
        url: "/contact/10"
      },
      {
        id: "11",
        name: "Christopher Rodriguez",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Christopher",
        url: "/contact/11"
      },
      {
        id: "12",
        name: "Mary Martinez",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mary",
        url: "/contact/12"
      }
    ];

    setPatrons(mockPatrons);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading patrons...</div>
      </div>
    );
  }

  if (patrons.length === 0) {
    return (
      <div className="card mt-5 flex flex-auto flex-col p-6 lg:px-8">
        <span className="text-muted-foreground p-8 text-center font-medium">
          There are no patrons in Breed!
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xxl:grid-cols-5">
      {patrons.map((patron) => (
        <AvatarCard
          key={patron.id}
          entity={patron}
          model="contact"
        />
      ))}
    </div>
  );
}
