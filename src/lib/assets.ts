const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const ASSETS_BUCKET = (import.meta.env.VITE_ASSETS_BUCKET as string | undefined) || 'jersey-images'

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) return ''

  const trimmedUrl = url.trim()
  if (!trimmedUrl) return ''

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