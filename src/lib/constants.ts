export const VIBES = [
  "Home Classic",
  "Quick Prep",
  "Healthy",
  "Late Night",
  "Meal Prep Sunday",
  "Comfort Food",
  "Snack Attack",
] as const;

export type Vibe = (typeof VIBES)[number];

export const SETUPS = ["One-Pot", "Microwave Only", "Full Kitchen"] as const;

export type Setup = (typeof SETUPS)[number];

