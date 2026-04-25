import { forwardRef } from "react";
import {
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  Award,
  Baby,
  Blend,
  Bookmark,
  Bug,
  Calendar,
  Cat,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheckBig,
  CircleUserRound,
  Copy,
  CreditCard,
  Expand,
  FileText,
  Gift,
  Globe,
  Grid,
  Grid2x2,
  Heart,
  HeartPulse,
  History,
  Home,
  House,
  HouseHeart,
  Image,
  Link,
  List,
  ListChecks,
  Network,
  PawPrint,
  Pencil,
  Save,
  Scale,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  User,
  UserPlus,
  Users,
  VenusAndMars,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

function toLucideLookupKey(value: string): string {
  return value.trim().replace(/[\s_-]+/g, "").toLowerCase();
}

const lucideIconRegistry: Record<string, LucideIcon> = {
  arrowdownnarrowwide: ArrowDownNarrowWide,
  arrowdownwidenarrow: ArrowDownWideNarrow,
  award: Award,
  baby: Baby,
  blend: Blend,
  bookmark: Bookmark,
  bug: Bug,
  calendar: Calendar,
  cat: Cat,
  chevronleft: ChevronLeft,
  chevronright: ChevronRight,
  circle: Circle,
  circlecheckbig: CircleCheckBig,
  circleuserround: CircleUserRound,
  copy: Copy,
  creditcard: CreditCard,
  expand: Expand,
  filetext: FileText,
  gift: Gift,
  globe: Globe,
  grid: Grid,
  grid2x2: Grid2x2,
  heart: Heart,
  heartpulse: HeartPulse,
  history: History,
  home: Home,
  house: House,
  househeart: HouseHeart,
  image: Image,
  link: Link,
  list: List,
  listchecks: ListChecks,
  network: Network,
  pawprint: PawPrint,
  pencil: Pencil,
  save: Save,
  scale: Scale,
  search: Search,
  settings: Settings,
  shoppingbag: ShoppingBag,
  sparkles: Sparkles,
  tag: Tag,
  trash2: Trash2,
  trophy: Trophy,
  user: User,
  userplus: UserPlus,
  users: Users,
  venusandmars: VenusAndMars,
};

export function resolveLucideIconComponent(
  iconName?: string,
): LucideIcon | undefined {
  if (!iconName) {
    return undefined;
  }

  const lookupKey = toLucideLookupKey(iconName);
  return lucideIconRegistry[lookupKey];
}

export interface LucideIconByNameProps extends LucideProps {
  name?: string;
}

export const LucideIconByName = forwardRef<SVGSVGElement, LucideIconByNameProps>(
  ({ name, ...props }, ref) => {
    const IconComponent = resolveLucideIconComponent(name) ?? List;
    return <IconComponent ref={ref} {...props} />;
  },
);

LucideIconByName.displayName = "LucideIconByName";

export function getIconComponent(iconName?: string): LucideIcon {
  return resolveLucideIconComponent(iconName) ?? List;
}
