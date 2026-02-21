export const customBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px', // custom
} as const;

export type BreakpointKey = keyof typeof customBreakpoints;

// Media queries for use with useMediaQuery hook
export const mediaQueries = {
  sm: `(min-width: ${customBreakpoints.sm})`,
  md: `(min-width: ${customBreakpoints.md})`,
  lg: `(min-width: ${customBreakpoints.lg})`,
  xl: `(min-width: ${customBreakpoints.xl})`,
  '2xl': `(min-width: ${customBreakpoints['2xl']})`,
  '3xl': `(min-width: ${customBreakpoints['3xl']})`,
} as const;