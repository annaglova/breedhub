import coverBackground from "@/assets/images/background-images/cover_background.png";
import { useCoverDimensions } from "@/hooks/useCoverDimensions";
import { cn } from "@ui/lib/utils";
import { Expand } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { AvatarOutlet } from "./AvatarOutlet";
import { BreedName } from "./BreedName";
import { NameContainerOutlet } from "./NameContainerOutlet";
import { CoverTypeIDs, getCoverComponent, NavigationButtons } from "./cover";

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

  // Calculate cover dimensions based on content container width
  const coverDimensions = useCoverDimensions(contentContainerRef);

  // Track if name container is stuck to top
  const [nameOnTop, setNameOnTop] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When intersection ratio is < 1, element is stuck
        setNameOnTop(entry.intersectionRatio < 1);
      },
      {
        threshold: [1],
        rootMargin: "-1px 0px 0px 0px",
      }
    );

    if (nameContainerRef.current) {
      observer.observe(nameContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // MOCK DATA for cover testing
  // TODO: Remove when real entity.Cover data is available
  const mockCover = {
    Type: {
      Id: CoverTypeIDs.BreedCoverV1,
    },
    AvatarUrl: coverBackground,
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

  // Get cover component based on type
  const coverTypeId = mockCover?.Type?.Id;
  const CoverComponent = getCoverComponent(coverTypeId);

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
        </div>
      </div>
    </div>
  );
}
