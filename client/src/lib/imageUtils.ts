/**
 * Normalise les URLs d'images pour convertir les URLs Google Cloud Storage
 * complètes en URLs locales servies par notre endpoint /objects/
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return url;
  
  if (url.includes('storage.googleapis.com')) {
    // Extraire l'ID de l'upload depuis l'URL Google Cloud Storage
    // Format: https://storage.googleapis.com/bucket/.private/uploads/ID
    const parts = url.split('/');
    const uploadId = parts[parts.length - 1];
    return `/objects/uploads/${uploadId}`;
  }
  
  return url;
}

/**
 * Normalise un tableau d'URLs d'images
 */
export function normalizeImageUrls(urls: string[] | null): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map(normalizeImageUrl).filter(Boolean);
}

/**
 * Récupère la première image normalisée d'une liste
 */
export function getMainImage(images: string[] | null): string | null {
  const normalizedImages = normalizeImageUrls(images);
  return normalizedImages.length > 0 ? normalizedImages[0] : null;
}