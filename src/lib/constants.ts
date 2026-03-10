export const VIBES = [
  "Home Classic",
  "Comfort Food",
  "< 30 Mins",
  "Meal Prep",
  "Appetizers",
  "Dessert",
] as const;

export type Vibe = (typeof VIBES)[number];

export const TAGS = [
  "Breakfast",
  "Dinner",
  "Vegetarian",
  "Vegan",
  "Healthy",
] as const;

export type Tag = (typeof TAGS)[number];

export const SETUPS = [
  "One-Pot / Slow Cooker",
  "Air Fryer",
  "Toaster Oven",
  "Small Appliance",
  "Full Kitchen",
] as const;

export type Setup = (typeof SETUPS)[number];

