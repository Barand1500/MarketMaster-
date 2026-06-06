/** Dosya sistemi görsellerini API proxy üzerinden sunar (production nginx uyumu). */
export function resolveGorselUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/uploads/')) return `/api${url}`;
  if (url.startsWith('uploads/')) return `/api/${url}`;
  return url;
}
