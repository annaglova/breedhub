import React from 'react';

interface CoverTemplateProps {
  coverImg: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * CoverTemplate - Base wrapper for all cover types
 *
 * Provides:
 * - Background image rendering
 * - Children content positioned on top
 *
 * Note: Gradient overlay moved to PublicPageTemplate level
 * Used by: DefaultCover, BreedCoverV1, CustomCover, etc.
 */
export function CoverTemplate({
  coverImg,
  children,
  className = ''
}: CoverTemplateProps) {
  return (
    <div className={`flex size-full flex-col ${className}`}>
      {coverImg && (
        <>
          {/* Background cover image */}
          <img
            className="absolute inset-0 size-full object-cover"
            src={coverImg}
            alt="Cover image"
          />

          {/* Cover-specific content */}
          {children}
        </>
      )}
    </div>
  );
}
