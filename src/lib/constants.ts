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

/** Focus position for recipe image (object-position). Saved on recipe and used in preview + detail view. */
export const IMAGE_POSITION_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
] as const;

export type ImagePosition = (typeof IMAGE_POSITION_OPTIONS)[number]["value"];

export function getImagePositionStyle(position: string | null | undefined): string {
  if (!position || position === "center") return "50% 50%";
  if (position === "top") return "50% 0%";
  if (position === "bottom") return "50% 100%";
  return "50% 50%";
}

