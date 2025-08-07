export const customBreakpoints = {
  sm: '600px',
  md: '960px',
  lg: '1280px',
  xl: '1440px',
  xxl: '1536px',
  xxxl: '1920px',
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