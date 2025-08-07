export const customBreakpoints = {
  sm: '640px',    // Native Tailwind
  md: '768px',    // Native Tailwind
  lg: '1280px',   // Custom from Angular
  xl: '1440px',   // Custom from Angular
  xxl: '1536px',  // Custom from Angular
  xxxl: '1920px', // Custom from Angular
} as const;

export type BreakpointKey = keyof typeof customBreakpoints;

// Media queries for use with useMediaQuery hook
export const mediaQueries = {
  sm: `(min-width: ${customBreakpoints.sm})`,
  md: `(min-width: ${customBreakpoints.md})`,
  lg: `(min-width: ${customBreakpoints.lg})`,
  xl: `(min-width: ${customBreakpoints.xl})`,
  xxl: `(min-width: ${customBreakpoints.xxl})`,
  xxxl: `(min-width: ${customBreakpoints.xxxl})`,
} as const;