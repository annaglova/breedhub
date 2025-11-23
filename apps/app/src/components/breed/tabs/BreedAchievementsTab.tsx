import { useEffect, useState, useMemo } from "react";
import { AlternatingTimeline } from "@ui/components/timeline";
import { Check, Loader2 } from "lucide-react";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useChildRecords } from "@/hooks/useChildRecords";
import { supabase } from "@breedhub/rxdb-store";

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

/**
 * Achievement dictionary entry from Supabase
 */
interface AchievementDictionary {
  id: string;
  name: string;
  description: string;
  int_value: number;
  position: number;
}

/**
 * Achievement in breed record from child table
 */
interface AchievementInBreed {
  id: string;
  achievement_id: string;
  breed_id: string;
  date: string;
}

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
 * Data flow:
 * 1. Load achievement_in_breed records for current breed (via useChildRecords)
 * 2. Load achievement dictionary from Supabase
 * 3. Merge and display in timeline (all levels, with achieved dates marked)
 */
export function BreedAchievementsTab() {
  const selectedEntity = useSelectedEntity();
  const breedId = selectedEntity?.id;

  // Load achievement_in_breed records for this breed
  const {
    data: achievementsInBreed,
    isLoading: isLoadingChildren,
    error: childrenError
  } = useChildRecords<AchievementInBreed>({
    parentId: breedId,
    tableType: 'achievement_in_breed',
    orderBy: 'date',
    orderDirection: 'desc'
  });

  // Load achievement dictionary
  const [achievementDict, setAchievementDict] = useState<AchievementDictionary[]>([]);
  const [isLoadingDict, setIsLoadingDict] = useState(true);

  useEffect(() => {
    async function loadDictionary() {
      try {
        const { data, error } = await supabase
          .from('achievement')
          .select('id, name, description, int_value, position')
          .order('position', { ascending: true });

        if (error) {
          console.error('[BreedAchievementsTab] Failed to load achievement dictionary:', error);
          return;
        }

        setAchievementDict(data || []);
      } catch (err) {
        console.error('[BreedAchievementsTab] Error loading dictionary:', err);
      } finally {
        setIsLoadingDict(false);
      }
    }

    loadDictionary();
  }, []);

  // Merge achievement dictionary with breed's achievements
  const achievements = useMemo<Achievement[]>(() => {
    if (!achievementDict.length) return [];

    // Create a map of achieved achievements by achievement_id
    const achievedMap = new Map<string, AchievementInBreed>();
    achievementsInBreed.forEach(record => {
      achievedMap.set(record.achievement_id, record);
    });

    // Map dictionary entries to Achievement format
    return achievementDict
      .filter(dict => dict.int_value >= 0) // Filter out special entries
      .sort((a, b) => b.int_value - a.int_value) // Sort by value descending (highest first)
      .map(dict => {
        const achieved = achievedMap.get(dict.id);
        return {
          id: dict.id,
          name: dict.name,
          description: dict.description || '',
          intValue: dict.int_value,
          date: achieved?.date,
          active: !!achieved
        };
      });
  }, [achievementDict, achievementsInBreed]);

  // Loading state
  const isLoading = isLoadingChildren || isLoadingDict;

  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading achievements...</span>
      </div>
    );
  }

  // Error state
  if (childrenError) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load achievements</p>
          <p className="text-red-600 text-sm mt-1">{childrenError.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (achievements.length === 0) {
    return (
      <div className="py-4 px-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-gray-600">No achievement levels available</p>
        </div>
      </div>
    );
  }

  // Convert achievements to timeline items format
  const timelineItems = achievements.map((achievement) => ({
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
