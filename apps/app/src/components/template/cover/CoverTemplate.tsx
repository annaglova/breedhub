import React, { useState, useCallback } from 'react';

// Import default cover image as asset (Vite will process this correctly)
import defaultCoverImage from "@/assets/images/background-images/cover_background.png";

interface CoverTemplateProps {
  coverImg: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * CoverTemplate - Base wrapper for all cover types
 *
 * Provides:
 * - Background image rendering with error fallback
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
  // Track if primary image failed to load
  const [imgSrc, setImgSrc] = useState(coverImg);
  const [hasError, setHasError] = useState(false);

  // Handle image load error - switch to fallback
  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(defaultCoverImage);
    }
  }, [hasError]);

  // Reset error state when coverImg prop changes
  React.useEffect(() => {
    setImgSrc(coverImg);
    setHasError(false);
  }, [coverImg]);

  // Use fallback if no coverImg provided
  const finalSrc = imgSrc || defaultCoverImage;

  return (
    <div className={`flex size-full flex-col ${className}`}>
      {/* Background cover image - positions relative to CoverOutlet container */}
      <img
        className="absolute inset-0 size-full object-cover"
        src={finalSrc}
        alt="Cover image"
        onError={handleError}
      />

      {/* Cover-specific content */}
      {children}
    </div>
  );
}
