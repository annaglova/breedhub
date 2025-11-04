import coverBackground from "@/assets/images/background-images/cover_background.png";
import { useCoverDimensions } from "@/hooks/useCoverDimensions";
import { cn } from "@ui/lib/utils";
import { Expand, CheckCircle, Heart, Image } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { AvatarOutlet } from "./AvatarOutlet";
import { BreedName } from "../breed/BreedName";
import { BreedAchievements } from "../breed/BreedAchievements";
import { NameContainerOutlet } from "./NameContainerOutlet";
import { CoverTypeIDs, getCoverComponent, NavigationButtons } from "./cover";
import { TabsContainer, Tab } from "../tabs/TabsContainer";
import { BreedAchievementsTab } from "../breed/tabs/BreedAchievementsTab";
import { PageMenu } from "../tabs/PageMenu";
import { useTabNavigation } from "@/hooks/useTabNavigation";

interface PublicPageTemplateProps {
  className?: string;
  isDrawerMode?: boolean;
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
}: PublicPageTemplateProps) {
  // Ref to content container for cover dimension calculation
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const pageMenuRef = useRef<HTMLDivElement>(null);

  // Calculate cover dimensions based on content container width
  const coverDimensions = useCoverDimensions(contentContainerRef);

  // Track if name container is stuck to top
  const [nameOnTop, setNameOnTop] = useState(false);
  const [nameBlockHeight, setNameBlockHeight] = useState(0);
  const [pageMenuHeight, setPageMenuHeight] = useState(0);

  // Constants for sticky positioning
  const NAME_CONTAINER_TOP = 0;
  const PAGE_MENU_TOP = nameBlockHeight > 0 ? nameBlockHeight : 0;
  const TAB_HEADER_TOP = nameOnTop ? nameBlockHeight + pageMenuHeight : pageMenuHeight;


  useEffect(() => {
    if (!nameContainerRef.current) return;

    // Find the scrollable container (overflow-auto parent)
    let scrollContainer: HTMLElement | null = nameContainerRef.current.parentElement;
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
    scrollContainer.addEventListener('scroll', checkSticky);
    // Check initially
    checkSticky();

    return () => {
      scrollContainer?.removeEventListener('scroll', checkSticky);
    };
  }, []);

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

  // Track PageMenu height
  useEffect(() => {
    if (!pageMenuRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPageMenuHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(pageMenuRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // MOCK DATA for cover testing
  // TODO: Remove when real entity.Cover data is available
  const mockCover = {
    Type: {
      Id: CoverTypeIDs.BreedCoverV1,
    },
    AvatarUrl: coverBackground,
  };

  // MOCK DATA for achievements
  const mockAchievements = {
    topKennel: {
      name: "Golden Paws Kennel",
      url: "golden-paws-kennel",
    },
    majorPatron: {
      name: "Anna Maliyenko",
      url: "anna-maliyenko",
    },
    topPet: {
      name: "Max von der Stadtrand",
      url: "max-von-der-stadtrand",
    },
  };

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

  // MOCK DATA for tabs - 6 test tabs with content
  const mockTabs: Tab[] = [
    {
      id: "achievements",
      fragment: "achievements",
      label: "Breed achievements",
      icon: <CheckCircle size={20} />,
      component: () => (
        <div className="mt-3 px-6 space-y-4">
          <p className="text-lg font-semibold">Achievement History</p>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold text-lg">Achievement {i + 1}</h3>
              <p className="text-primary font-bold">${(i + 1) * 1000}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Achievement description for item {i + 1}. Lorem ipsum dolor sit amet.
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "patrons",
      fragment: "patrons",
      label: "Patrons",
      icon: <Heart size={20} />,
      component: () => (
        <div className="mt-3 px-6 space-y-3">
          <p className="text-lg font-semibold">Top Patrons List</p>
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                {i + 1}
              </div>
              <div>
                <p className="font-semibold">Patron Name {i + 1}</p>
                <p className="text-sm text-muted-foreground">Rating: {100 - i * 5}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "moments",
      fragment: "moments",
      label: "Moments",
      icon: <Image size={20} />,
      component: () => (
        <div className="mt-3 px-6">
          <p className="text-lg font-semibold mb-4">Photo Gallery</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center"
              >
                <Image size={32} className="text-primary/40" />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "kennels",
      fragment: "kennels",
      label: "Top Kennels",
      icon: <Heart size={20} />,
      component: () => (
        <div className="mt-3 px-6 space-y-4">
          <p className="text-lg font-semibold">Featured Kennels</p>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold">Kennel Name {i + 1}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Location: City {i + 1}, Country
              </p>
              <p className="text-sm text-primary mt-2">
                Established: {2000 + i} • Dogs: {(i + 1) * 10}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "pets",
      fragment: "pets",
      label: "Top Pets",
      icon: <CheckCircle size={20} />,
      component: () => (
        <div className="mt-3 px-6 space-y-3">
          <p className="text-lg font-semibold">Champion Pets</p>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border border-border rounded-lg">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                🐕
              </div>
              <div className="flex-1">
                <p className="font-semibold">Pet Name {i + 1}</p>
                <p className="text-sm text-muted-foreground">
                  Title: Champion • Age: {i + 2} years
                </p>
              </div>
              <div className="text-right">
                <p className="text-primary font-bold">#{i + 1}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "statistics",
      fragment: "statistics",
      label: "Statistics",
      icon: <Image size={20} />,
      component: () => (
        <div className="mt-3 px-6 space-y-6">
          <p className="text-lg font-semibold">Breed Statistics</p>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Metric {i + 1}</span>
                <span className="text-primary font-bold">{(i + 1) * 123}</span>
              </div>
              <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(i + 1) * 15}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Description for metric {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "health",
      fragment: "health",
      label: "Health Info",
      icon: <CheckCircle size={20} />,
      component: () => (
        <div className="mt-3 px-6 space-y-4">
          <p className="text-lg font-semibold">Health & Genetics</p>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold text-lg">Health Topic {i + 1}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Information about health topic {i + 1}. Important genetic and health considerations for this breed.
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "training",
      fragment: "training",
      label: "Training Tips",
      icon: <Heart size={20} />,
      component: () => (
        <div className="mt-3 px-6 space-y-4">
          <p className="text-lg font-semibold">Training & Behavior</p>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold text-lg">Training Tip {i + 1}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Detailed training advice for topic {i + 1}. Best practices and behavioral insights.
              </p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  // Get cover component based on type
  const coverTypeId = mockCover?.Type?.Id;
  const CoverComponent = getCoverComponent(coverTypeId);

  // Tab navigation hook
  const { activeTab, handleTabChange, handleVisibilityChange } =
    useTabNavigation({
      tabs: mockTabs,
      mode: "scroll",
    });

  return (
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
          {/* Cover Section */}
          <div
            className="relative flex size-full justify-center overflow-hidden rounded-lg border border-gray-200 px-6 pt-4 shadow-sm sm:pb-3 sm:pt-6 mb-6"
            style={{
              width: `${coverDimensions.width}px`,
              maxWidth: `${coverDimensions.width}px`,
              height: `${coverDimensions.height}px`,
              maxHeight: `${coverDimensions.height}px`,
            }}
          >
            {/* Top gradient overlay */}
            <div className="absolute top-0 z-10 h-28 w-full bg-gradient-to-b from-[#200e4c]/40 to-transparent"></div>

            {/* Cover component */}
            <div className="flex w-full max-w-3xl flex-col lg:max-w-4xl xxl:max-w-5xl">
              {/* Navigation buttons - on template level, above cover content */}
              <div className="z-40 flex w-full pb-2">
                {/* Expand button (fullscreen) - show IN drawer mode to allow expanding */}
                {isDrawerMode && (
                  <button
                    onClick={() => console.log("[TODO] Expand to fullscreen")}
                    title="Expand"
                    className="mr-auto hidden md:block"
                  >
                    <Expand size={22} className="text-white" />
                  </button>
                )}

                {/* Back/Navigate buttons */}
                <NavigationButtons
                  mode="white"
                  className="sticky top-0 ml-auto"
                />
              </div>

              {/* Gradient overlay - positioned below buttons, above cover content */}
              <div className="absolute inset-0 size-full bg-gradient-to-r from-primary-50/10 to-primary-400/85 z-10" />

              {/* Cover content */}
              <CoverComponent
                coverImg={mockCover.AvatarUrl}
                isFullscreen={!isDrawerMode}
                breed={mockBreed}
              />
            </div>
          </div>

          {/* Avatar Section */}
          <AvatarOutlet
            avatarSize={176}
            onEdit={() => console.log("[TODO] Edit avatar")}
            onMoreOptions={() => console.log("[TODO] More options")}
          />

          {/* Name Container - Sticky */}
          <div ref={nameContainerRef} className="sticky top-0 z-30">
            <NameContainerOutlet
              onTop={nameOnTop}
              onSupport={() => console.log("[TODO] Support")}
              onMoreOptions={() => console.log("[TODO] More options")}
            >
              <BreedName
                hasNotes={true}
                onNotesClick={() => console.log("[TODO] Show notes")}
              />
            </NameContainerOutlet>
          </div>

          {/* Achievements Section */}
          <BreedAchievements
            topKennel={mockAchievements.topKennel}
            majorPatron={mockAchievements.majorPatron}
            topPet={mockAchievements.topPet}
          />

          {/* PageMenu - Sticky horizontal tab bar */}
          <div
            ref={pageMenuRef}
            className="sticky z-30 mb-6 -mt-px"
            style={{ top: `${PAGE_MENU_TOP}px` }}
          >
            <PageMenu
              tabs={mockTabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              mode="scroll"
            />
          </div>

          {/* Tabs Section - Scroll mode with all tabs rendered */}
          <TabsContainer
            tabs={mockTabs}
            mode="scroll"
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onVisibilityChange={handleVisibilityChange}
            tabHeaderTop={TAB_HEADER_TOP}
          />
        </div>
      </div>
    </div>
  );
}
