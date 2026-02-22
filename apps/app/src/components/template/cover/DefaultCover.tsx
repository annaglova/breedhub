import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
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
  useSignals();

  // Read isFullscreen from store (prop is not passed through CoverOutlet/BlockRenderer chain)
  const isFullscreenFromStore = spaceStore.isFullscreen.value;
  const fullscreen = isFullscreen || isFullscreenFromStore;

  return (
    <CoverTemplate coverImg={coverImg} className={className}>
      <div className="z-20 flex size-full flex-col justify-between my-2 ml-auto sm:w-2/3">
        {/* Patrons text */}
        <div className={`h-full flex flex-col justify-center mb:0 sm:mb-10 ${!fullscreen ? 'md:mb-5 lg:mb-5 xl:mb-10' : ''}`}>
          <div
            className={`text-md text-end uppercase text-white sm:text-lg ${fullscreen ? 'md:text-xl' : ''} lg:text-2xl`}
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            Become a patron of your
            <br className="hidden md:block" />
            favorite breed
          </div>
          {fullscreen && (
            <div className="mt-5 hidden text-end text-white sm:block">
              Support your favorite breed's future
            </div>
          )}
        </div>

        {/* Call to action */}
        <div className="flex items-end ml-auto z-40 relative">
          <Button
            variant="outline"
            className="rounded-full h-[2.25rem] px-4 bg-white/30 border-white text-white hover:bg-white/60 hover:text-white text-base font-semibold"
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
