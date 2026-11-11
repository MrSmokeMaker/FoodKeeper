/**
 * Client-side image compression utility.
 * Resizes large smartphone camera photos (e.g. 12-48MP) to maximum 1024x1024,
 * converting them to JPEG (quality ~0.8) to reduce payload size by ~95%
 * and speed up vision AI / OCR requests.
 */

export async function compressImage(
  dataUrl: string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.8
): Promise<string> {
  // If not running in a browser environment or canvas is not supported, return original
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;

        if (width <= maxWidth && height <= maxHeight) {
          // If already small enough, still re-encode with specified quality if it's very large
          if (dataUrl.length < 300 * 1024) {
            return resolve(dataUrl);
          }
        }

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(dataUrl);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Image compression fallback to original:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
