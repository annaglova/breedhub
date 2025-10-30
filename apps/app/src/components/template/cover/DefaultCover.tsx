import React from 'react';
import { CoverTemplate } from './CoverTemplate';
import { Button } from 'primereact/button';

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
  className = ''
}: DefaultCoverProps) {
  return (
    <CoverTemplate coverImg={coverImg} needGradient={true} className={className}>
      <div className="z-10 mt-1 mb-3 ml-auto flex size-full flex-col justify-between sm:my-2 sm:w-auto pt-10">
        {/* Patrons text */}
        <div>
          <div className="text-md text-end uppercase text-white sm:text-lg md:text-2xl lg:text-3xl">
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
        <div className="flex items-end">
          <Button
            rounded
            outlined
            severity="secondary"
            size="small"
            className="ml-auto bg-white/30 border-white hover:bg-white/60"
            aria-label="Become a breed patron"
            type="button"
          >
            <span className="text-white">Become a patron</span>
          </Button>
        </div>
      </div>
    </CoverTemplate>
  );
}
