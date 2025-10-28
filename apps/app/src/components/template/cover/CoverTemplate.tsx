import React from 'react';

interface CoverTemplateProps {
  coverImg: string;
  needGradient?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * CoverTemplate - Base wrapper for all cover types
 *
 * Provides:
 * - Background image rendering
 * - Optional gradient overlay for text readability
 * - Children content positioned on top
 *
 * Used by: DefaultCover, BreedCoverV1, CustomCover, etc.
 */
export function CoverTemplate({
  coverImg,
  needGradient = false,
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

          {/* Optional gradient overlay for better text readability */}
          {needGradient && (
            <div className="absolute inset-0 size-full bg-gradient-to-r from-primary-50/10 to-primary-400/85" />
          )}

          {/* Cover-specific content */}
          {children}
        </>
      )}
    </div>
  );
}
