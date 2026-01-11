import { PetSelectorModal } from "@/components/pet/PetSelectorModal";
import { HorizontalScrollbar } from "@/components/shared/HorizontalScrollbar";
import { Icon } from "@/components/shared/Icon";
import {
  GenerationCount,
  PedigreeGenerationSelector,
  PedigreeTree,
  type PedigreePet,
} from "@/components/shared/pedigree";
import { PetSexMark } from "@/components/shared/PetSexMark";
import { mediaQueries } from "@/config/breakpoints";
import { usePageActions } from "@/hooks/usePageActions";
import { usePageMenu } from "@/hooks/usePageMenu";
import { ToolPageLayout } from "@/layouts/ToolPageLayout";
import type { PageConfig } from "@/types/page-config.types";
import { routeStore, supabase, toast } from "@breedhub/rxdb-store";
import { Button } from "@ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { MoreVertical, Save, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/** Get default generations based on screen size */
function getDefaultGenerations(): GenerationCount {
  if (window.matchMedia(mediaQueries.xl).matches) return 5;
  if (window.matchMedia(mediaQueries.lg).matches) return 4;
  if (window.matchMedia(mediaQueries.md).matches) return 3;
  return 2;
}

interface WorkspaceConfig {
  id?: string;
  label?: string;
  icon?: { name: string; source: string };
  path?: string;
}

interface MatingPageProps {
  pageConfig?: PageConfig | null;
  workspaceConfig?: WorkspaceConfig | null;
}

/**
 * MatingPage - Test mating calculator
 *
 * Allows users to select father and mother to preview
 * the pedigree of potential offspring.
 *
 * Similar to LitterPedigreeTab but as standalone page
 * with pet selection controls.
 */
export function MatingPage({ pageConfig, workspaceConfig }: MatingPageProps) {
  const { fatherSlug, motherSlug } = useParams<{ fatherSlug?: string; motherSlug?: string }>();
  const navigate = useNavigate();

  const [generations, setGenerations] = useState<GenerationCount>(getDefaultGenerations);

  // Selected pets for mating
  const [father, setFather] = useState<PedigreePet | null>(null);
  const [mother, setMother] = useState<PedigreePet | null>(null);

  // Track if we're currently resolving slugs (to prevent URL update during resolution)
  const isResolvingRef = useRef(false);

  // Modal state
  const [fatherModalOpen, setFatherModalOpen] = useState(false);
  const [motherModalOpen, setMotherModalOpen] = useState(false);

  // Resolve slugs from URL to pets on mount
  useEffect(() => {
    if (!fatherSlug && !motherSlug) return;

    isResolvingRef.current = true;

    const resolveSlugs = async () => {
      try {
        // Ensure RouteStore is initialized
        if (!routeStore.initialized.value) {
          await routeStore.initialize();
        }

        // Resolve father slug
        if (fatherSlug && !father) {
          const route = await routeStore.resolveRoute(fatherSlug);
          if (route && route.entity === 'pet') {
            // Fetch pet data from Supabase
            const { data: petData } = await supabase
              .from('pet')
              .select('id, name, slug, avatar_url, breed_id, pet_type_id, sex_id')
              .eq('id', route.entity_id)
              .single();

            if (petData) {
              setFather({
                id: petData.id,
                name: petData.name || 'Unknown',
                slug: petData.slug,
                avatarUrl: petData.avatar_url,
                breedId: petData.breed_id,
                petTypeId: petData.pet_type_id,
                sexId: petData.sex_id,
              });
            }
          }
        }

        // Resolve mother slug
        if (motherSlug && !mother) {
          const route = await routeStore.resolveRoute(motherSlug);
          if (route && route.entity === 'pet') {
            const { data: petData } = await supabase
              .from('pet')
              .select('id, name, slug, avatar_url, breed_id, pet_type_id, sex_id')
              .eq('id', route.entity_id)
              .single();

            if (petData) {
              setMother({
                id: petData.id,
                name: petData.name || 'Unknown',
                slug: petData.slug,
                avatarUrl: petData.avatar_url,
                breedId: petData.breed_id,
                petTypeId: petData.pet_type_id,
                sexId: petData.sex_id,
              });
            }
          }
        }
      } catch (error) {
        console.error('[MatingPage] Error resolving slugs:', error);
      } finally {
        isResolvingRef.current = false;
      }
    };

    resolveSlugs();
  }, [fatherSlug, motherSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when father/mother change
  useEffect(() => {
    // Don't update URL while resolving slugs from URL
    if (isResolvingRef.current) return;

    const basePath = workspaceConfig?.path || '/mating';
    let newPath = basePath;

    if (father?.slug) {
      newPath = `${basePath}/${father.slug}`;
      if (mother?.slug) {
        newPath = `${basePath}/${father.slug}/${mother.slug}`;
      }
    }

    // Only navigate if path changed
    const currentPath = window.location.pathname;
    if (currentPath !== newPath) {
      navigate(newPath, { replace: true });
    }
  }, [father?.slug, mother?.slug, workspaceConfig?.path, navigate]);

  // Direct drag-to-scroll implementation
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    scrollStartLeft.current = scrollRef.current.scrollLeft;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !scrollRef.current) return;
      e.preventDefault();
      const deltaX = e.clientX - dragStartX.current;
      scrollRef.current.scrollLeft = scrollStartLeft.current - deltaX;
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Build virtual pet from selected parents (always show structure)
  const virtualPet: PedigreePet = {
    id: "mating-preview",
    name: "Offspring",
    father: father || undefined,
    mother: mother || undefined,
  };

  const handleSaveToLitters = () => {
    // TODO: Implement save to litters
    console.log("Save mating to litters", { father, mother });
  };

  // Menu items from config
  const menuItems = usePageMenu({
    pageConfig: pageConfig || null,
    context: "avatar",
    spacePermissions: { canEdit: false, canDelete: false, canAdd: false },
  });

  // Custom copy_link handler for tool page (no entity)
  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  }, []);

  // Action handlers
  const { executeAction } = usePageActions(null, {
    copy_link: handleCopyLink,
  });

  const hasMenuItems = menuItems.length > 0;

  return (
    <ToolPageLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-30">
        {/* Header row */}
        <div className="flex items-center justify-between pb-4 bg-white dark:bg-zinc-900 border-b border-border">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl">{workspaceConfig?.label || "Test Mating"}</h1>
            <PedigreeGenerationSelector
              generations={generations}
              onGenerationsChange={setGenerations}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              onClick={handleSaveToLitters}
              className="rounded-full h-[2.25rem] w-[2.25rem] sm:w-auto sm:px-4 gap-2"
            >
              <Save className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline text-base font-semibold">Save mating to litters</span>
            </Button>

            {/* More options dropdown menu */}
            {hasMenuItems && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost-secondary"
                        className="size-[2.25rem] rounded-full p-0"
                        type="button"
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">More options</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  {menuItems.map((item) => (
                    <>
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => executeAction(item.action, item.actionParams)}
                      >
                        <Icon icon={item.icon} size={16} />
                        {item.label}
                      </DropdownMenuItem>
                      {item.hasDivider && (
                        <DropdownMenuSeparator key={`divider-${item.id}`} />
                      )}
                    </>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Parent selectors */}
        <div className="grid grid-cols-2 gap-3 py-2 bg-header-ground/75 backdrop-blur-sm px-2">
          {/* Father selector chip */}
          <div className="flex justify-center">
            <div
              onClick={() => setFatherModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full cursor-pointer transition-colors border border-gray-400 hover:bg-secondary-200 min-w-[200px]"
            >
              <PetSexMark sex="male" style="round" className="shrink-0" />
              <span className="text-sm font-medium truncate max-w-32">
                {father?.name || "Select father"}
              </span>
              {father && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFather(null);
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Mother selector chip */}
          <div className="flex justify-center">
            <div
              onClick={() => setMotherModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full cursor-pointer transition-colors border border-gray-400 hover:bg-secondary-200 min-w-[200px]"
            >
              <PetSexMark sex="female" style="round" className="shrink-0" />
              <span className="text-sm font-medium truncate max-w-32">
                {mother?.name || "Select mother"}
              </span>
              {mother && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMother(null);
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal scrollbar */}
        <div className="py-4">
          <HorizontalScrollbar
            scrollContainerRef={scrollRef}
            className="mx-auto max-w-52 sm:max-w-md"
          />
        </div>
      </div>

      {/* Pet selector modals */}
      <PetSelectorModal
        open={fatherModalOpen}
        onOpenChange={setFatherModalOpen}
        onSelect={(pet) => {
          setFather({
            id: pet.id,
            name: pet.name || "Unknown",
            slug: pet.slug,
            avatarUrl: pet.avatar_url,
            breedId: pet.breed_id,
            petTypeId: pet.pet_type_id,
            sexId: pet.sex_id,
          });
        }}
        sexFilter="male"
        title="Select Father"
        excludeIds={mother ? [mother.id] : []}
        initialPetTypeId={father?.petTypeId}
        initialBreedId={father?.breedId}
        initialSexId={father?.sexId}
        initialSelectedId={father?.id}
      />

      <PetSelectorModal
        open={motherModalOpen}
        onOpenChange={setMotherModalOpen}
        onSelect={(pet) => {
          setMother({
            id: pet.id,
            name: pet.name || "Unknown",
            slug: pet.slug,
            avatarUrl: pet.avatar_url,
            breedId: pet.breed_id,
            petTypeId: pet.pet_type_id,
            sexId: pet.sex_id,
          });
        }}
        sexFilter="female"
        title="Select Mother"
        excludeIds={father ? [father.id] : []}
        initialPetTypeId={mother?.petTypeId}
        initialBreedId={mother?.breedId}
        initialSexId={mother?.sexId}
        initialSelectedId={mother?.id}
      />

      {/* Pedigree tree */}
      <div>
        {/* Pedigree tree with drag-to-scroll */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="overflow-x-auto scrollbar-hide"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: isDragging ? "none" : "auto",
          }}
        >
          <PedigreeTree
            pet={virtualPet}
            generations={generations}
            hideSubject
            matingMode
            selectedFather={father}
            selectedMother={mother}
            onSelectPet={(sex) => {
              if (sex === "male") {
                setFatherModalOpen(true);
              } else {
                setMotherModalOpen(true);
              }
            }}
          />
        </div>
      </div>
    </ToolPageLayout>
  );
}
