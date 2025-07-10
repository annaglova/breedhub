import AdminPanelSettings from "@shared/icons/features/admin_panel_settings.svg?react";
import AutoStories from "@shared/icons/features/auto_stories.svg?react";
import BugReport from "@shared/icons/features/bug_report.svg?react";
import Cached from "@shared/icons/features/cached.svg?react";
import ConnectWithoutContact from "@shared/icons/features/connect_without_contact.svg?react";
import DashboardCustomize from "@shared/icons/features/dashboard_customize.svg?react";
import DynamicFeed from "@shared/icons/features/dynamic_feed.svg?react";
import EmojiEvents from "@shared/icons/features/emoji_events.svg?react";
import FolderSpecial from "@shared/icons/features/folder_special.svg?react";
import HealthAndSafety from "@shared/icons/features/health_and_safety.svg?react";
import House from "@shared/icons/features/house.svg?react";
import HowToVote from "@shared/icons/features/how_to_vote.svg?react";
import Link from "@shared/icons/features/link.svg?react";
import ManageSearch from "@shared/icons/features/manage_search.svg?react";
import MergeType from "@shared/icons/features/merge_type.svg?react";
import MobileFriendly from "@shared/icons/features/mobile_friendly.svg?react";
import Notifications from "@shared/icons/features/notifications.svg?react";
import NotificationsActive from "@shared/icons/features/notifications_active.svg?react";
import PostAdd from "@shared/icons/features/post_add.svg?react";
import PresentToAll from "@shared/icons/features/present_to_all.svg?react";
import Settings from "@shared/icons/features/settings.svg?react";
import StarHalf from "@shared/icons/features/star_half.svg?react";
import Storefront from "@shared/icons/features/storefront.svg?react";
import TaskAlt from "@shared/icons/features/task_alt.svg?react";
import Timeline from "@shared/icons/features/timeline.svg?react";
import Translate from "@shared/icons/features/translate.svg?react";
import TravelExplore from "@shared/icons/features/travel_explore.svg?react";
import Troubleshoot from "@shared/icons/features/troubleshoot.svg?react";
import UploadFile from "@shared/icons/features/upload_file.svg?react";
import Verified from "@shared/icons/features/verified.svg?react";
import ViewList from "@shared/icons/features/view_list.svg?react";
import ViewTimeline from "@shared/icons/features/view_timeline.svg?react";
import Workspaces from "@shared/icons/features/workspaces.svg?react";

// Mapping between icon names and components
export const featureIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  // Direct mappings
  admin_panel_settings: AdminPanelSettings,
  auto_stories: AutoStories,
  bug_report: BugReport,
  cached: Cached,
  connect_without_contact: ConnectWithoutContact,
  dashboard_customize: DashboardCustomize,
  dynamic_feed: DynamicFeed,
  emoji_events: EmojiEvents,
  folder_special: FolderSpecial,
  health_and_safety: HealthAndSafety,
  house: House,
  how_to_vote: HowToVote,
  link: Link,
  manage_search: ManageSearch,
  merge_type: MergeType,
  mobile_friendly: MobileFriendly,
  notifications: Notifications,
  notifications_active: NotificationsActive,
  post_add: PostAdd,
  present_to_all: PresentToAll,
  settings: Settings,
  star_half: StarHalf,
  storefront: Storefront,
  task_alt: TaskAlt,
  timeline: Timeline,
  translate: Translate,
  travel_explore: TravelExplore,
  troubleshoot: Troubleshoot,
  upload_file: UploadFile,
  verified: Verified,
  view_list: ViewList,
  view_timeline: ViewTimeline,
  workspaces: Workspaces,
  
  // Legacy mappings from PrimeIcons (map to closest equivalent)
  sitemap: MergeType,
  calculator: DashboardCustomize,
  heart: HealthAndSafety,
  globe: TravelExplore,
  users: ConnectWithoutContact,
  comments: DynamicFeed,
  "share-alt": ConnectWithoutContact,
  trophy: EmojiEvents,
  "chart-bar": ViewTimeline,
  wallet: FolderSpecial,
  "chart-line": Timeline,
  shield: Verified,
  mobile: MobileFriendly,
};

export function getFeatureIcon(iconName: string): React.FC<React.SVGProps<SVGSVGElement>> | null {
  if (!iconName) return null;
  
  // Try direct mapping first
  if (featureIcons[iconName]) {
    return featureIcons[iconName];
  }
  
  // Try lowercase
  const lowercaseName = iconName.toLowerCase();
  if (featureIcons[lowercaseName]) {
    return featureIcons[lowercaseName];
  }
  
  // Try replacing common separators
  const normalizedName = iconName.toLowerCase().replace(/[-_]/g, '_');
  if (featureIcons[normalizedName]) {
    return featureIcons[normalizedName];
  }
  
  console.warn(`Icon not found: ${iconName}`);
  return null;
}