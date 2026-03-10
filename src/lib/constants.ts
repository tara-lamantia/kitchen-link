export const VIBES = [
  "Home Classic",
  "Comfort Food",
  "Under 20 Mins",
  "Meal Prep",
] as const;

export type Vibe = (typeof VIBES)[number];

export const SETUPS = [
  "One-Pot / Slow Cooker",
  "Air Fryer",
  "Toaster Oven",
  "Small Appliance",
  "Full Kitchen",
] as const;

export type Setup = (typeof SETUPS)[number];

