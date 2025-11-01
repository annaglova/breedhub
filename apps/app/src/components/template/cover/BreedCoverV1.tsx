import * as PatronIcons from "@shared/icons";
import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { Heart } from "lucide-react";
import { useMemo } from "react";
import { CoverTemplate } from "./CoverTemplate";
import { PatronAvatar } from "./PatronAvatar";

interface Breed {
  Id: string;
  Name: string;
  TopPatrons?: Array<{
    Id: string;
    Contact?: {
      Name?: string;
      Url?: string;
      AvatarUrl?: string;
    };
    Place?: number;
    Rating: number;
  }>;
}

interface BreedCoverV1Props {
  coverImg: string;
  breed: Breed;
  isFullscreen?: boolean;
  className?: string;
}

/**
 * BreedCoverV1 - Breed cover with top patrons
 *
 * EXACT COPY from Angular: libs/schema/ui/template/page-header/ui/breed-cover-v1.component.ts
 * Shows breed name + top 4 patrons OR "You may be the first one!" if no patrons
 */
export function BreedCoverV1({
  coverImg,
  breed,
  isFullscreen = false,
  className = "",
}: BreedCoverV1Props) {
  // Calculate patron length (max 3 on mobile, 4 on desktop)
  const patronLength = useMemo(() => {
    if (!breed?.TopPatrons) return 0;
    const isMobile = typeof window !== "undefined" && window.screen.width < 600;
    return isMobile
      ? Math.min(breed.TopPatrons.length, 3)
      : breed.TopPatrons.length;
  }, [breed?.TopPatrons]);

  const handleBecomePatron = () => {
    // TODO: Navigate to become patron page
    console.log("Become patron:", breed.Id);
  };

  if (!breed) return null;

  return (
    <CoverTemplate coverImg={coverImg} className={`relateve ${className}`}>
      <div className="z-20 ml-auto flex size-full flex-col justify-between pb-3 sm:w-auto sm:pb-2 sm:pt-1 pt-10">
        {/* Patrons */}
        <div className="flex w-full justify-between sm:flex-col sm:space-y-2">
          <div
            className={`text-md absolute top-5 sm:text-end font-medium uppercase text-white max-w-64 text-left sm:max-w-full sm:static sm:text-xl ${
              isFullscreen ? "sm:mt-3" : ""
            }`}
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {breed.Name}
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
                {breed.TopPatrons?.slice(0, 4).map((patron, index) => (
                  <PatronAvatar key={patron.Id || index} patron={patron} />
                ))}
              </div>
            ) : (
              <div className="relative flex items-center space-x-3">
                <span className="hidden text-end text-white sm:block">
                  There are no patrons in the breed <br />
                  You may be the first one!
                </span>
                <div className="group mt-2 flex size-11 items-center justify-center overflow-hidden rounded-full border border-white bg-white/30 text-7xl text-white sm:size-16">
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
                    {/* Place 1 badge - small screens */}
                    <PatronIcons.PatronPlacesPlace1Icon
                      width={14}
                      height={14}
                      style={{ fill: "rgb(255, 255, 255)" }}
                      className="sm:hidden"
                    />
                    {/* Place 1 badge - large screens */}
                    <PatronIcons.PatronPlacesPlace1Icon
                      width={18}
                      height={18}
                      style={{ fill: "rgb(255, 255, 255)" }}
                      className="hidden sm:block"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          {isFullscreen && (
            <span className="hidden pt-4 text-end text-white md:block">
              Make a contribution to the development of your favorite breed
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
                className="hidden ml-auto rounded-full h-[2.6rem] px-4 sm:flex"
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
                className="ml-auto rounded-full h-[2.6rem] w-[2.6rem] flex items-center justify-center sm:hidden"
                aria-label="Become a breed patron"
                onClick={handleBecomePatron}
                type="button"
              >
                <Heart size={16} fill="currentColor" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Support your breed</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </CoverTemplate>
  );
}
