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

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/

/**
 * As fotos originais no Cloudinary têm 1–2 MB. Para URLs do Cloudinary, pede uma
 * versão com a largura dada, em WebP/AVIF e qualidade automática (~120 KB);
 * c_limit nunca amplia além do original. Outras URLs voltam como em resolveAssetUrl.
 */
export function optimizedImageUrl(url: string | null | undefined, width: number) {
  const resolved = resolveAssetUrl(url)
  const match = resolved.match(CLOUDINARY_UPLOAD)
  if (!match) return resolved
  return `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}`
}

/** srcset com as larguras dadas; undefined quando a URL não é do Cloudinary. */
export function optimizedImageSrcSet(url: string | null | undefined, widths: number[]) {
  if (!CLOUDINARY_UPLOAD.test(resolveAssetUrl(url))) return undefined
  return widths.map((width) => `${optimizedImageUrl(url, width)} ${width}w`).join(', ')
}