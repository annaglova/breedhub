import { useEffect } from 'react';

export function MobileOptimizations() {
  useEffect(() => {
    // Prevent zoom on input focus for iOS
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Add touch-action CSS to prevent accidental zoom
    document.documentElement.style.touchAction = 'manipulation';

    // Add event listener
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Ensure viewport meta tag is set correctly
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');

    // Clean up
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.documentElement.style.touchAction = '';
    };
  }, []);

  return null;
}