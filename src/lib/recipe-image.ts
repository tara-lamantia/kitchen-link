/**
 * Returns the URL to use for displaying a recipe image.
 * Private Vercel Blob URLs are proxied through /api/image so they load correctly.
 */
export function getRecipeImageSrc(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  if (imageUrl.includes("blob.vercel-storage.com")) {
    return `/api/image?url=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}
