const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const ASSETS_BUCKET = (import.meta.env.VITE_ASSETS_BUCKET as string | undefined) || 'jersey-images'

/**
 * Normalizes a path segment to match how files were stored in Supabase Storage.
 * The upload script sanitized filenames: spaces and special chars (& ( ) ' ` ,)
 * were replaced with hyphens, and consecutive hyphens collapsed.
 */
function normalizeSegment(segment: string): string {
  return segment
    .replace(/[&()',`]/g, '-')   // special chars → hyphen
    .replace(/\s+/g, '-')        // spaces → hyphen
    .replace(/-{2,}/g, '-')      // collapse consecutive hyphens
    .replace(/^-|-$/g, '')       // trim leading/trailing hyphens
}

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(normalizeSegment(segment)))
    .join('/')
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) return ''

  const trimmedUrl = url.trim()
  if (!trimmedUrl) return ''

  // Already an absolute URL — return as-is
  if (/^(https?:|data:|blob:)/i.test(trimmedUrl)) {
    return trimmedUrl
  }

  const normalized = trimmedUrl.startsWith('/') ? trimmedUrl : `/${trimmedUrl}`
  const isLegacyLocalAsset = normalized.startsWith('/jersey/') || normalized.startsWith('/logos/')

  if (!isLegacyLocalAsset || !SUPABASE_URL) {
    return normalized
  }

  const encodedPath = encodeStoragePath(normalized)
  return `${SUPABASE_URL}/storage/v1/object/public/${ASSETS_BUCKET}/${encodedPath}`
}