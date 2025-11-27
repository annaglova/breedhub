import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { useCoverDimensions } from "@/hooks/useCoverDimensions";
import { getPageConfig } from "@/utils/getPageConfig";
import { spaceStore } from "@breedhub/rxdb-store";
import { Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { useEffect, useRef, useState } from "react";

interface PublicPageTemplateProps {
  className?: string;
  isDrawerMode?: boolean;
  spaceConfigSignal?: Signal<any>; // TODO: Define proper SpaceConfig type from DB structure
  entityType?: string; // Required to get selectedEntity from store
}

/**
 * PublicPageTemplate - Cover template demo
 *
 * Демонстрація каверу з динамічними пропорціями
 * Supports drawer and fullscreen modes
 */
export function PublicPageTemplate({
  className,
  isDrawerMode = false,
  spaceConfigSignal,
  entityType,
}: PublicPageTemplateProps) {
  // Very first log - check if component renders at all
  console.log("[PublicPageTemplate] COMPONENT RENDER START", {
    isDrawerMode,
    entityType,
  });

  useSignals();

  // Use spaceConfig from signal
  const spaceConfig = spaceConfigSignal?.value;

  // Get page config without specifying pageType - will use isDefault or first page
  // pageType is defined IN the page config itself, not passed as prop
  const pageConfig = getPageConfig(spaceConfig);

  // Get space permissions from config
  // TODO: Get real permissions from space config after it's implemented
  const spacePermissions = {
    canEdit: true,
    canDelete: false,
    canAdd: false,
  };

  // Get selectedEntity signal from store using entityType
  // This is called INSIDE the component, after entity store is created
  const selectedEntitySignal = entityType
    ? spaceStore.getSelectedEntity(entityType)
    : null;
  const selectedEntity = selectedEntitySignal?.value;

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("[PublicPageTemplate] State:", {
      hasSpaceConfig: !!spaceConfig,
      hasPageConfig: !!pageConfig,
      hasSelectedEntity: !!selectedEntity,
      pageConfig,
      selectedEntity,
    });
  }

  // Ref to content container for cover dimension calculation
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);

  // Calculate cover dimensions based on content container width
  const coverDimensions = useCoverDimensions(contentContainerRef);

  // Track if name container is stuck to top
  const [nameOnTop, setNameOnTop] = useState(false);
  const [nameBlockHeight, setNameBlockHeight] = useState(0);

  // Constants for sticky positioning
  // PageMenu height is calculated inside TabOutletRenderer
  const PAGE_MENU_TOP = nameBlockHeight > 0 ? nameBlockHeight : 0;
  const TAB_HEADER_TOP = nameOnTop ? nameBlockHeight : 0;

  useEffect(() => {
    if (!nameContainerRef.current) return;

    // Find the scrollable container (overflow-auto parent)
    let scrollContainer: HTMLElement | null =
      nameContainerRef.current.parentElement;
    while (scrollContainer) {
      const overflowY = window.getComputedStyle(scrollContainer).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }

    if (!scrollContainer) return;

    const checkSticky = () => {
      if (!nameContainerRef.current) return;

      const containerTop = scrollContainer!.getBoundingClientRect().top;
      const elementTop = nameContainerRef.current.getBoundingClientRect().top;

      // When element top equals container top, it's stuck
      const isStuck = Math.abs(containerTop - elementTop) === 0;
      setNameOnTop(isStuck);
    };

    // Check on scroll
    scrollContainer.addEventListener("scroll", checkSticky);
    // Check initially
    checkSticky();

    return () => {
      scrollContainer?.removeEventListener("scroll", checkSticky);
    };
  }, [pageConfig, selectedEntity]); // Re-run when config or entity changes

  // Track name container height
  useEffect(() => {
    if (!nameContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setNameBlockHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(nameContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // TODO: mockBreed can be removed when entity data is fully dynamic
  const mockBreed = {
    Id: "mock-breed-1",
    Name: "German Shepherd",
    TopPatrons: [
      {
        Id: "1",
        Contact: {
          Name: "John Doe",
          Url: "john-doe",
          AvatarUrl: "https://i.pravatar.cc/150?img=12",
        },
        Place: 1,
        Rating: 100,
      },
      {
        Id: "2",
        Contact: {
          Name: "Jane Smith",
          Url: "jane-smith",
          AvatarUrl: "https://i.pravatar.cc/150?img=47",
        },
        Place: 2,
        Rating: 90,
      },
      {
        Id: "3",
        Contact: {
          Name: "Bob Johnson",
          Url: "bob-johnson",
          AvatarUrl: "https://i.pravatar.cc/150?img=33",
        },
        Place: 3,
        Rating: 80,
      },
    ], // Top patrons
    // TopPatrons: [
    //   {
    //     Id: "1",
    //     Contact: {
    //       Name: "John Doe",
    //       Url: "john-doe",
    //       AvatarUrl: "https://i.pravatar.cc/150?img=12",
    //     },
    //     Place: 1,
    //     Rating: 100,
    //   },
    //   {
    //     Id: "2",
    //     Contact: {
    //       Name: "Jane Smith",
    //       Url: "jane-smith",
    //       AvatarUrl: "https://i.pravatar.cc/150?img=47",
    //     },
    //     Place: 2,
    //     Rating: 90,
    //   },
    //   {
    //     Id: "3",
    //     Contact: {
    //       Name: "Bob Johnson",
    //       Url: "bob-johnson",
    //       AvatarUrl: "https://i.pravatar.cc/150?img=33",
    //     },
    //     Place: 3,
    //     Rating: 80,
    //   },
    // ],
  };

  return spaceConfigSignal ? (
    <SpaceProvider
      spaceConfigSignal={spaceConfigSignal}
      selectedEntitySignal={selectedEntitySignal}
    >
      <div
        className={cn(
          "size-full flex flex-col content-padding",
          isDrawerMode && "bg-white dark:bg-gray-900",
          className
        )}
      >
        <div className="flex flex-auto flex-col items-center overflow-auto">
          <div
            ref={contentContainerRef}
            className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl"
          >
            {/* Dynamic Blocks Section */}
            {!pageConfig && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-red-700 font-semibold">
                  Page configuration not found
                </p>
                <p className="text-red-600 text-sm mt-1">
                  No pages configured for this space
                </p>
              </div>
            )}

            {!selectedEntity && pageConfig && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                <p className="text-yellow-700 font-semibold">
                  No entity selected
                </p>
                <p className="text-yellow-600 text-sm mt-1">
                  Please select an entity to view
                </p>
              </div>
            )}

            {pageConfig &&
              selectedEntity &&
              (() => {
                // Sort blocks by order
                const sortedBlocks = Object.entries(pageConfig.blocks).sort(
                  ([, a], [, b]) => (a.order || 0) - (b.order || 0)
                );

                if (process.env.NODE_ENV === "development") {
                  console.log("[PublicPageTemplate] Rendering blocks:", {
                    pageConfig,
                    selectedEntity,
                    blocksCount: sortedBlocks.length,
                    sortedBlocks,
                  });
                }

                // Render each block with its appropriate container
                return sortedBlocks.map(([blockId, blockConfig]) => {
                  // CoverOutlet needs dimensions from parent container
                  if (blockConfig.outlet === "CoverOutlet") {
                    return (
                      <BlockRenderer
                        key={blockId}
                        blockConfig={{
                          ...blockConfig,
                          coverWidth: coverDimensions.width,
                          coverHeight: coverDimensions.height,
                          isDrawerMode,
                        }}
                        entity={selectedEntity}
                        pageConfig={pageConfig}
                        spacePermissions={spacePermissions}
                      />
                    );
                  }

                  // AvatarOutlet renders without wrapper (has -mt-32 inside)
                  if (blockConfig.outlet === "AvatarOutlet") {
                    return (
                      <BlockRenderer
                        key={blockId}
                        blockConfig={{
                          ...blockConfig,
                          size: 176, // Avatar size constant
                        }}
                        entity={selectedEntity}
                        pageConfig={pageConfig}
                        spacePermissions={spacePermissions}
                      />
                    );
                  }

                  // NameOutlet needs sticky wrapper and onTop state
                  if (blockConfig.outlet === "NameOutlet") {
                    return (
                      <div
                        key={blockId}
                        ref={nameContainerRef}
                        className="sticky top-0 z-30"
                      >
                        <BlockRenderer
                          blockConfig={{
                            ...blockConfig,
                            onTop: nameOnTop,
                          }}
                          entity={selectedEntity}
                          pageConfig={pageConfig}
                          spacePermissions={spacePermissions}
                        />
                      </div>
                    );
                  }

                  // TabOutlet - Dynamic tabs from config
                  // Now handled by BlockRenderer like other outlets
                  if (blockConfig.outlet === "TabOutlet") {
                    return (
                      <BlockRenderer
                        key={blockId}
                        blockConfig={{
                          ...blockConfig,
                          pageMenuTop: PAGE_MENU_TOP,
                          tabHeaderTop: TAB_HEADER_TOP,
                        }}
                        entity={selectedEntity}
                        pageConfig={pageConfig}
                        spacePermissions={spacePermissions}
                      />
                    );
                  }

                  // Default: simple wrapper with margin
                  return (
                    <BlockRenderer
                      key={blockId}
                      blockConfig={blockConfig}
                      entity={selectedEntity}
                      className="mb-4"
                      pageConfig={pageConfig}
                      spacePermissions={spacePermissions}
                    />
                  );
                });
              })()}
          </div>
        </div>
      </div>
    </SpaceProvider>
  ) : (
    <div className="p-8 text-center">
      <p className="text-red-600">Space configuration signal is required</p>
      <p className="text-sm text-gray-500 mt-2">
        Make sure spaceConfigSignal is passed to PublicPageTemplate
      </p>
    </div>
  );
}
