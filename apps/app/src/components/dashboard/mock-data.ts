/**
 * Mock data for the breeder Dashboard.
 *
 * Replace with real data sources once the corresponding modules ship:
 * - stats: contact / pet / litter counts from RxDB
 * - events: BREEDING_CYCLE_PLAN + PET_TREATMENTS_PLAN modules
 * - activity: notes / pet updates audit feed
 */

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: "primary" | "champion";
  icon: "pets" | "litters" | "offspring" | "champion";
};

export type EventCategory = "litter" | "health" | "heat" | "show" | "mating";

export type DashboardEvent = {
  id: string;
  date: Date;
  title: string;
  subtitle?: string;
  category: EventCategory;
  imminent?: boolean;
};

export type ActivityEntry = {
  id: string;
  occurredAt: Date;
  kind: "note" | "pet" | "litter" | "health" | "message";
  title: string;
  body?: string;
};

const today = new Date();
const daysFromNow = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d;
};
const hoursAgo = (hours: number) => {
  const d = new Date(today);
  d.setHours(d.getHours() - hours);
  return d;
};

export const mockStats: DashboardStat[] = [
  {
    id: "pets",
    label: "Active pets",
    value: "24",
    hint: "+2 this month",
    tone: "primary",
    icon: "pets",
  },
  {
    id: "litters",
    label: "Active litters",
    value: "03",
    hint: "1 expected in 28 days",
    tone: "primary",
    icon: "litters",
  },
  {
    id: "champions",
    label: "Champions",
    value: "04",
    hint: "Bronze · Silver · 2 Gold",
    tone: "champion",
    icon: "champion",
  },
];

export const mockEvents: DashboardEvent[] = [
  {
    id: "evt-1",
    date: daysFromNow(3),
    title: "Heat expected — Lila",
    subtitle: "Whippet · cycle #4",
    category: "heat",
    imminent: true,
  },
  {
    id: "evt-2",
    date: daysFromNow(7),
    title: "Vaccinations due (3 pets)",
    subtitle: "Bella, Max, Storm — annual booster",
    category: "health",
  },
  {
    id: "evt-3",
    date: daysFromNow(18),
    title: "Show — Krakow Winners",
    subtitle: "2 entries: CH Aurora, Storm",
    category: "show",
  },
  {
    id: "evt-4",
    date: daysFromNow(28),
    title: "Expected whelp — litter «Aurora»",
    subtitle: "French Bulldog · Day 35 of pregnancy",
    category: "litter",
    imminent: true,
  },
  {
    id: "evt-5",
    date: daysFromNow(42),
    title: "Mating planned — Storm × Bella",
    subtitle: "Stud booked, progesterone tracking",
    category: "mating",
  },
];

export const mockActivity: ActivityEntry[] = [
  {
    id: "act-1",
    occurredAt: hoursAgo(2),
    kind: "pet",
    title: "New pet added",
    body: "Bella of the North — registered to your kennel",
  },
  {
    id: "act-2",
    occurredAt: hoursAgo(5),
    kind: "health",
    title: "Health record updated",
    body: "DNA clearance uploaded for Titan Lord",
  },
  {
    id: "act-3",
    occurredAt: hoursAgo(20),
    kind: "note",
    title: "Note added",
    body: "WHIPPET — feeding plan notes from vet visit",
  },
  {
    id: "act-4",
    occurredAt: hoursAgo(28),
    kind: "litter",
    title: "Litter updated",
    body: "Litter «Aurora» — ultrasound confirmed 6 puppies",
  },
  {
    id: "act-5",
    occurredAt: hoursAgo(50),
    kind: "message",
    title: "Inquiry received",
    body: "New stud service inquiry for Titan Lord",
  },
];
