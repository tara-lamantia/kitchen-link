/**
 * Resize and compress an image file so it stays under Vercel's 4.5 MB body limit.
 * Returns a new JPEG File (max dimension 1200px, quality 0.85), or the original if small enough.
 */
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.85;
const TARGET_MAX_BYTES = 3.5 * 1024 * 1024; // 3.5 MB to stay under 4.5 MB limit

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= TARGET_MAX_BYTES) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size <= TARGET_MAX_BYTES) {
        resolve(file);
        return;
      }
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = JPEG_QUALITY;
      const tryExport = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size <= TARGET_MAX_BYTES || quality <= 0.5) {
              resolve(
                new File([blob], (file.name || "image").replace(/\.[^.]+$/i, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }),
              );
              return;
            }
            quality -= 0.15;
            tryExport();
          },
          "image/jpeg",
          quality,
        );
      };
      tryExport();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
