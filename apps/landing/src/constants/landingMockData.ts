import type { Breed } from "@/components/BreedProgress";

export interface AchievementLevel {
  Active: boolean;
  Date: string;
  Description: string;
  IntValue: number;
  Name: string;
  Position: number;
}

export interface LandingStatistic {
  value: string;
  label: string;
  color: string;
  href: string;
}

export const topAchievementBreeds: Breed[] = [
  {
    Name: "Labrador Retriever",
    PetProfileCount: 1240,
    KennelCount: 45,
    PatronCount: 89,
    AchievementProgress: 85,
    LastAchievement: { Name: "Gold Standard" },
  },
  {
    Name: "German Shepherd",
    PetProfileCount: 980,
    KennelCount: 38,
    PatronCount: 72,
    AchievementProgress: 78,
    LastAchievement: { Name: "Silver Elite" },
  },
  {
    Name: "Golden Retriever",
    PetProfileCount: 856,
    KennelCount: 32,
    PatronCount: 65,
    AchievementProgress: 72,
    LastAchievement: { Name: "Silver Elite" },
  },
];

export const topRatingBreeds: Breed[] = [
  {
    Name: "Beagle",
    PetProfileCount: 567,
    KennelCount: 24,
    PatronCount: 41,
    AchievementProgress: 65,
    LastAchievement: { Name: "Bronze Champion" },
  },
  {
    Name: "Boxer",
    PetProfileCount: 445,
    KennelCount: 19,
    PatronCount: 35,
    AchievementProgress: 58,
    LastAchievement: { Name: "Bronze Champion" },
  },
  {
    Name: "Bulldog",
    PetProfileCount: 398,
    KennelCount: 16,
    PatronCount: 28,
    AchievementProgress: 52,
    LastAchievement: { Name: "Rising Star" },
  },
  {
    Name: "Poodle",
    PetProfileCount: 334,
    KennelCount: 14,
    PatronCount: 24,
    AchievementProgress: 45,
    LastAchievement: { Name: "Rising Star" },
  },
  {
    Name: "Rottweiler",
    PetProfileCount: 289,
    KennelCount: 12,
    PatronCount: 19,
    AchievementProgress: 38,
    LastAchievement: { Name: "Newcomer" },
  },
];

export const achievements: AchievementLevel[] = [
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Basic breed support with community access",
    IntValue: 0,
    Name: "Zero support level",
    Position: 0,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Priority bug fixes and basic breed features",
    IntValue: 50,
    Name: "Bronze Support",
    Position: 1,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Enhanced breed features and dedicated support",
    IntValue: 150,
    Name: "Silver Support",
    Position: 2,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Advanced analytics and breeding tools",
    IntValue: 300,
    Name: "Gold Support",
    Position: 3,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Premium features and priority development",
    IntValue: 500,
    Name: "Platinum Support",
    Position: 4,
  },
  {
    Active: true,
    Date: "2024-01-01",
    Description: "Full custom development and white-label options",
    IntValue: 1000,
    Name: "Diamond Support",
    Position: 5,
  },
];

export const specialAchievements: AchievementLevel[] = achievements
  .slice(1)
  .sort((a, b) => (a.Position > b.Position ? -1 : 1));

export const statisticsData: LandingStatistic[] = [
  {
    value: "2,450+",
    label: "Pet profiles",
    color: "from-purple-100",
    href: "/pets",
  },
  {
    value: "180+",
    label: "Kennels",
    color: "from-blue-100",
    href: "/kennels",
  },
  {
    value: "120+",
    label: "Events",
    color: "from-orange-100",
    href: "/events",
  },
];
