import React from 'react';

interface NavigationButtonsProps {
  mode?: 'default' | 'white';
  className?: string;
}

/**
 * NavigationButtons - Back/Forward navigation buttons
 *
 * EXACT COPY from Angular: libs/schema/ui/button-ui/nav-button.component.ts
 *
 * Two buttons in a group:
 * - Left: Back button (arrow-left) - returns to previous page
 * - Right: Navigate button (angle-down) - opens history menu
 *
 * Note: Currently visual only, no navigation functionality
 */
export function NavigationButtons({
  mode = 'white',
  className = ''
}: NavigationButtonsProps) {
  const handleBack = () => {
    console.log('[NavigationButtons] Back clicked');
    // TODO: Implement navigation back logic
  };

  const handleNavigate = () => {
    console.log('[NavigationButtons] Navigate menu clicked');
    // TODO: Implement navigation history menu
  };

  const isWhiteMode = mode === 'white';

  return (
    <div className={`flex shrink-0 ${className}`}>
      {/* Back button */}
      <button
        onClick={handleBack}
        title="Back"
        className={`
          left-button flex items-center justify-center px-2.5 py-0.5 text-xl
          border border-r-[0.5px]
          ${isWhiteMode
            ? 'border-white bg-white/30 text-white hover:bg-white/60'
            : 'border-surface-600 dark:border-surface-400 text-surface-600 dark:text-surface-400 hover:bg-surface-50 hover:dark:bg-surface-700'
          }
        `}
        style={{ borderRadius: '2rem 0 0 2rem' }}
      >
        <i className="pi pi-arrow-left"></i>
      </button>

      {/* Navigate button (history menu) */}
      <button
        onClick={handleNavigate}
        title="Navigate"
        className={`
          right-button flex items-center justify-center px-2.5 py-0.5 text-xl
          border border-l-[0.5px]
          ${isWhiteMode
            ? 'border-white bg-white/30 text-white hover:bg-white/60'
            : 'border-surface-600 dark:border-surface-400 text-surface-600 dark:text-surface-400 hover:bg-surface-50 hover:dark:bg-surface-700'
          }
        `}
        style={{ borderRadius: '0 2rem 2rem 0' }}
      >
        <i className="pi pi-angle-down"></i>
      </button>
    </div>
  );
}
