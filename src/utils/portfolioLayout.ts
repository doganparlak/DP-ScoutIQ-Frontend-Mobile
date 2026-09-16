/** Shared maximum table viewport for mobile portfolio frames. */
export const portfolioViewportHeight = (screenHeight: number) =>
  Math.max(280, Math.min(500, screenHeight * 0.49));
