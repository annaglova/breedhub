import { Button } from "@ui/components/button";
import { CoverTemplate } from "./CoverTemplate";

interface DefaultCoverProps {
  coverImg: string;
  isFullscreen?: boolean;
  className?: string;
}

/**
 * DefaultCover - Generic cover for non-breed entities
 *
 * EXACT COPY from Angular: libs/schema/ui/template/page-header/ui/default-cover.component.ts
 * Used when breed is NOT defined (generic patron call-to-action)
 */
export function DefaultCover({
  coverImg,
  isFullscreen = false,
  className = "",
}: DefaultCoverProps) {
  return (
    <CoverTemplate coverImg={coverImg} className={className}>
      <div className="z-20 mt-1 mb-3 ml-auto flex size-full flex-col justify-between sm:my-2 sm:w-auto pt-10">
        {/* Patrons text */}
        <div>
          <div
            className="text-md text-end uppercase text-white sm:text-lg md:text-2xl lg:text-3xl"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Become a patron of your
            <br className="hidden md:block" />
            favorite breed
          </div>
          {isFullscreen && (
            <div className="mt-5 hidden text-end text-white sm:block">
              Make a contribution to the development of your favorite breed
            </div>
          )}
        </div>

        {/* Call to action */}
        <div className="flex items-end z-40 relative">
          <Button
            variant="outline"
            className="ml-auto rounded-full h-[2.25rem] px-4 bg-white/30 border-white text-white hover:bg-white/60 hover:text-white text-base font-semibold"
            aria-label="Become a breed patron"
            type="button"
          >
            Become a patron
          </Button>
        </div>
      </div>
    </CoverTemplate>
  );
}
