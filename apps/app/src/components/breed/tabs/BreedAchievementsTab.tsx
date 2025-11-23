import { AlternatingTimeline } from "@ui/components/timeline";
import { Check } from "lucide-react";

/**
 * Achievement data structure
 * Maps to achievement_in_breed child table + achievement dictionary
 */
interface Achievement {
  id: string;
  name: string;
  description: string;
  intValue: number; // Amount in USD
  date?: string; // Date when achieved (null if not yet achieved)
  active: boolean; // Whether this level has been reached
}

// Mock data - will be replaced with real data from achievement_in_breed + achievement dictionary
const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: "1",
    name: "Diamond Patron",
    description:
      "Elite supporter level - maximum contribution to breed development and health research",
    intValue: 10000,
    date: undefined,
    active: false,
  },
  {
    id: "2",
    name: "Platinum Patron",
    description:
      "Premium supporter level with exclusive access to breeding insights and health data",
    intValue: 5000,
    date: undefined,
    active: false,
  },
  {
    id: "3",
    name: "Gold Patron",
    description:
      "Advanced supporter level - contributes to breed health initiatives and education",
    intValue: 2500,
    date: "2024-08-15",
    active: true,
  },
  {
    id: "4",
    name: "Silver Patron",
    description:
      "Intermediate supporter level - helps maintain breed registry and standards",
    intValue: 1000,
    date: "2024-03-22",
    active: true,
  },
  {
    id: "5",
    name: "Bronze Patron",
    description:
      "Entry supporter level - supports basic breed community operations",
    intValue: 500,
    date: "2023-11-10",
    active: true,
  },
  {
    id: "6",
    name: "Breed Supporter",
    description: "Foundation level - welcome to the breed community!",
    intValue: 100,
    date: "2023-06-01",
    active: true,
  },
];

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date to locale string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * BreedAchievementsTab - Support levels timeline
 *
 * Displays breed achievement/support levels in a timeline format.
 * Shows which levels have been achieved and when.
 *
 * REFERENCE: /Users/annaglova/projects/org/.../breed-support-levels.component.ts
 *
 * Data flow (future):
 * 1. Load achievement_in_breed records for current breed
 * 2. Load achievement dictionary (virtual loading - only used achievements)
 * 3. Merge and display in timeline
 */
export function BreedAchievementsTab() {
  // Convert mock achievements to timeline items format
  const timelineItems = MOCK_ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    title: achievement.name,
    description: achievement.description,
    date: achievement.date ? formatDate(achievement.date) : undefined,
    icon: achievement.active ? <Check className="h-4 w-4" /> : undefined,
    variant: achievement.active ? ("success" as const) : ("inactive" as const),
    content: (
      <div className="">
        <span className="text-xl font-bold text-primary">
          {formatCurrency(achievement.intValue)}
        </span>
      </div>
    ),
  }));

  return (
    <div className="py-4 px-6">
      <AlternatingTimeline
        items={timelineItems}
        layout="right"
        showCards={true}
        connectorVariant="primary"
        size="default"
      />
    </div>
  );
}
