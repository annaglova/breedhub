import { getDatabase, spaceStore, supabase } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import * as PatronIcons from "@shared/icons";
import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { mediaQueries } from "@/config/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CoverTemplate } from "./CoverTemplate";
import { DefaultCover } from "./DefaultCover";
import { PatronAvatar } from "./PatronAvatar";

// Import default cover image as asset (Vite will process this correctly)
import defaultCoverImage from "@/assets/images/background-images/cover_background.png";

// Interface for any entity (breed, pet, kennel, etc.)
interface EntityWithBreed {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  avatar_url?: string;
  Avatar?: string;
  breed_id?: string; // Pet/kennel have this to reference breed
  top_patrons?: Record<string, TopPatron>; // JSONB field in breed table
  measurements?: {
    patron_count?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Patron from top_patrons JSONB (stored as {"1": {...}, "2": {...}})
interface TopPatron {
  name: string;
  avatar?: string;
  contributions?: number;
}

// Display format for PatronAvatar component
interface PatronDisplay {
  Id: string;
  Contact?: {
    Name?: string;
    Url?: string;
    AvatarUrl?: string;
  };
  Place?: number;
  Rating: number;
}

interface BreedDisplayData {
  id: string;
  name: string;
  patrons: PatronDisplay[];
}

interface BreedCoverV1Props {
  entity: EntityWithBreed;
  coverImg?: string;
  isFullscreen?: boolean;
  className?: string;
}

/**
 * BreedCoverV1 - Universal breed cover with top patrons
 *
 * Works with any entity that has breed connection:
 * - Breed: uses entity.name, entity.top_patrons directly
 * - Pet/Kennel: loads breed via entity.breed_id
 *
 * Shows breed name + top 4 patrons OR "Will it be you?" if no patrons
 */
export function BreedCoverV1({
  entity,
  coverImg,
  isFullscreen = false,
  className = "",
}: BreedCoverV1Props) {
  useSignals();

  // Read isFullscreen from store (prop is not passed through CoverOutlet/BlockRenderer chain)
  const isFullscreenFromStore = spaceStore.isFullscreen.value;
  const fullscreen = isFullscreen || isFullscreenFromStore;

  // Compact layout for md drawer (sm-lg viewport, not fullscreen)
  const isSM = useMediaQuery(mediaQueries.sm);
  const isLG = useMediaQuery(mediaQueries.lg);
  const isXL = useMediaQuery(mediaQueries.xl);
  const isMdDrawer = !fullscreen && isSM && !isLG;
  // Reduced layout for lg drawer (1024-1279px, not fullscreen): smaller circle, shorter text
  const isLgDrawer = !fullscreen && isLG && !isXL;

  // Check if entity IS a breed (has top_patrons) or HAS a breed_id reference
  // Note: entities without breed_id AND without top_patrons (like events) should use DefaultCover
  const isBreedEntity = !!entity.top_patrons;
  const breedId = entity.breed_id;

  // State for loaded breed (when entity has breed_id)
  const [loadedBreed, setLoadedBreed] = useState<EntityWithBreed | null>(null);

  // Load breed directly from RxDB when entity has breed_id
  useEffect(() => {
    if (!isBreedEntity && breedId) {
      console.log(
        "[BreedCoverV1] Loading breed from RxDB for breed_id:",
        breedId
      );

      const loadBreed = async () => {
        try {
          // Get RxDB database
          const db = await getDatabase();
          if (!db) {
            console.warn("[BreedCoverV1] Database not initialized");
            return;
          }

          const collections = db.collections as Record<string, any>;
          const breedCollection = collections["breed"];
          if (!breedCollection) {
            console.warn("[BreedCoverV1] Breed collection not found");
            return;
          }

          // Query breed by ID
          const breedDoc = await breedCollection.findOne(breedId).exec();

          if (breedDoc) {
            const breedData = breedDoc.toJSON();
            console.log(
              "[BreedCoverV1] Loaded breed from RxDB:",
              breedData.name
            );
            setLoadedBreed(breedData);
          } else {
            console.log(
              "[BreedCoverV1] Breed not in RxDB, fetching from Supabase..."
            );
            // Fallback to Supabase
            const { data, error } = await supabase
              .from("breed")
              .select("id, name, top_patrons")
              .eq("id", breedId)
              .single();

            if (data && !error) {
              console.log(
                "[BreedCoverV1] Loaded breed from Supabase:",
                data.name
              );
              setLoadedBreed(data);
            }
          }
        } catch (err) {
          console.error("[BreedCoverV1] Error loading breed:", err);
        }
      };

      loadBreed();
    }
  }, [isBreedEntity, breedId]);

  // Transform top_patrons JSONB to display format
  const transformPatrons = (
    topPatrons?: Record<string, TopPatron>
  ): PatronDisplay[] => {
    if (!topPatrons) return [];
    return Object.entries(topPatrons).map(([key, patron], index) => ({
      Id: key,
      Contact: {
        Name: patron.name,
        AvatarUrl: patron.avatar,
      },
      Place: index + 1,
      Rating: patron.contributions || 0,
    }));
  };

  // Calculate breed display data
  const breed: BreedDisplayData = useMemo(() => {
    // Use loaded breed for pet/kennel, or entity itself for breed
    const sourceEntity = isBreedEntity ? entity : loadedBreed;

    if (!sourceEntity) {
      return {
        id: breedId || "",
        name: "Loading...",
        patrons: [],
      };
    }

    return {
      id: sourceEntity.id || sourceEntity.Id || "",
      name: sourceEntity.name || sourceEntity.Name || "Unknown",
      patrons: transformPatrons(sourceEntity.top_patrons),
    };
  }, [entity, isBreedEntity, loadedBreed, breedId]);

  // Cover image: use prop if provided, otherwise default
  // Future: coverImg will come from entity.cover_url via config
  const actualCoverImg = coverImg || defaultCoverImage;

  // Calculate patron length (max 3 on mobile, 4 on desktop)
  const patronLength = useMemo(() => {
    if (!breed?.patrons?.length) return 0;
    const isMobile = typeof window !== "undefined" && window.screen.width < 600;
    return isMobile
      ? Math.min(breed.patrons.length, 3)
      : Math.min(breed.patrons.length, 4);
  }, [breed?.patrons]);

  const handleBecomePatron = () => {
    // TODO: Navigate to become patron page
    console.log("Become patron:", breed.id);
  };

  if (!entity) return null;

  // Fallback to DefaultCover when:
  // - Entity is not a breed AND has no breed_id to load breed from
  // - OR entity has breed_id but breed failed to load (still null after attempt)
  const hasNoBreedData = !isBreedEntity && !breedId;
  const breedFailedToLoad = !isBreedEntity && breedId && !loadedBreed;

  if (hasNoBreedData) {
    return (
      <DefaultCover
        coverImg={actualCoverImg}
        isFullscreen={isFullscreen}
        className={className}
      />
    );
  }

  // Compact layout for md drawer only
  if (isMdDrawer) {
    return (
      <CoverTemplate coverImg={actualCoverImg} className={className}>
        <div className="z-20 flex size-full flex-col justify-between pb-3 ">
          <div className="flex w-full justify-between">
            <div
              className="text-lg uppercase text-white mt-2 max-w-[60%] truncate "
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              {breed.name}
              {patronLength > 0 && " top patrons"}
            </div>
            <div className="ml-auto mr-2 mt-2">
              {patronLength > 0 ? (
                <div
                  className="grid gap-2.5"
                  style={{
                    gridTemplateColumns: `repeat(${patronLength}, minmax(0, 1fr))`,
                  }}
                >
                  {breed.patrons?.slice(0, 4).map((patron, index) => (
                    <PatronAvatar key={patron.Id || index} patron={patron} />
                  ))}
                </div>
              ) : (
                <div className="relative flex items-center space-x-2 ">
                  <span className="text-end text-white text-sm">
                    Be the first<br />patron!
                  </span>
                  <div className="group flex size-11 items-center justify-center overflow-hidden rounded-full border border-white bg-white/30 text-7xl text-white">
                    <svg
                      className="duration-300 group-hover:scale-125"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="rgb(255,255,255)"
                    >
                      <text
                        x="50%"
                        y="52%"
                        dominantBaseline="central"
                        textAnchor="middle"
                        fontSize="20"
                        fontWeight="500"
                        fontFamily="Roboto, sans-serif"
                      >
                        ?
                      </text>
                    </svg>
                    <div className="bg-accent-700 absolute -right-2 top-0 rounded-full p-1">
                      <PatronIcons.PatronPlacesPlace1Icon
                        width={14}
                        height={14}
                        style={{ fill: "rgb(255, 255, 255)" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end z-40 relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="accent"
                  className="ml-auto rounded-full h-[2.25rem] px-3 flex items-center"
                  aria-label="Become a breed patron"
                  onClick={handleBecomePatron}
                  type="button"
                >
                  <Heart size={14} fill="currentColor" />
                  <span className="text-sm font-semibold">Patronate</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Support your breed</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CoverTemplate>
    );
  }

  // Default layout — unchanged
  return (
    <CoverTemplate coverImg={actualCoverImg} className={className}>
      <div className="z-20 ml-auto flex size-full flex-col justify-between pb-3 sm:w-auto sm:pb-2 sm:pt-1  ">
        {/* Patrons */}
        <div className="flex w-full justify-between sm:flex-col sm:space-y-2">
          <div
            className={`text-lg absolute top-3 sm:text-end uppercase text-white max-w-48 sm:max-w-full truncate sm:text-clip text-left sm:static sm:text-xl ${
              fullscreen ? " sm:mt-3" : ""
            }`}
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            {breed.name}
            {patronLength > 0 && " top patrons"}
          </div>
          <div className="ml-auto mr-2 mt-2 sm:mt-0">
            {patronLength > 0 ? (
              <div
                className="grid gap-2.5"
                style={{
                  gridTemplateColumns: `repeat(${patronLength}, minmax(0, 1fr))`,
                }}
              >
                {breed.patrons?.slice(0, 4).map((patron, index) => (
                  <PatronAvatar key={patron.Id || index} patron={patron} />
                ))}
              </div>
            ) : (
              <div className={`relative flex items-center space-x-2  ${!isLgDrawer ? "sm:space-x-3" : ""}`}>
                <span className={`text-end text-white text-sm ${!isLgDrawer ? "sm:hidden" : ""}`}>
                  Be the first<br />patron!
                </span>
                {!isLgDrawer && (
                  <span className="hidden text-end text-white sm:block">
                    This breed needs its first champion. <br />
                    Will it be you?
                  </span>
                )}
                <div className={`group flex size-11 items-center justify-center overflow-hidden rounded-full border border-white bg-white/30 text-7xl text-white ${!isLgDrawer ? "sm:mt-2 sm:size-16" : ""}`}>
                  {/* Question mark icon */}
                  <svg
                    className="duration-300 group-hover:scale-125"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="rgb(255,255,255)"
                  >
                    <text
                      x="50%"
                      y="52%"
                      dominantBaseline="central"
                      textAnchor="middle"
                      fontSize="20"
                      fontWeight="500"
                      fontFamily="Roboto, sans-serif"
                    >
                      ?
                    </text>
                  </svg>
                  <div className="bg-accent-700 absolute -right-2 top-0 rounded-full p-1">
                    {!isLgDrawer ? (
                      <>
                        <PatronIcons.PatronPlacesPlace1Icon
                          width={14}
                          height={14}
                          style={{ fill: "rgb(255, 255, 255)" }}
                          className="sm:hidden"
                        />
                        <PatronIcons.PatronPlacesPlace1Icon
                          width={18}
                          height={18}
                          style={{ fill: "rgb(255, 255, 255)" }}
                          className="hidden sm:block"
                        />
                      </>
                    ) : (
                      <PatronIcons.PatronPlacesPlace1Icon
                        width={14}
                        height={14}
                        style={{ fill: "rgb(255, 255, 255)" }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {fullscreen && (
            <span className="hidden pt-4 text-end text-white md:block">
              Support your favorite breed's future
            </span>
          )}
        </div>

        {/* Call to action */}
        <div className="flex items-end z-40 relative">
          {/* Desktop button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="accent"
                className="hidden ml-auto rounded-full h-[2.25rem] px-4 sm:flex"
                aria-label="Become a breed patron"
                onClick={handleBecomePatron}
                type="button"
              >
                <Heart size={16} fill="currentColor" />
                <span className="hidden text-base font-semibold sm:block">
                  Become a breed patron
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Support your breed</TooltipContent>
          </Tooltip>

          {/* Mobile button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="accent"
                className="ml-auto rounded-full h-[2.25rem] px-3 flex items-center sm:hidden"
                aria-label="Become a breed patron"
                onClick={handleBecomePatron}
                type="button"
              >
                <Heart size={14} fill="currentColor" />
                <span className="text-sm font-semibold">Patronate</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Support your breed</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </CoverTemplate>
  );
}
