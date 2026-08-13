/**
 * media.js — Centralized media URL builder & image fallback handler
 */

/**
 * Returns a browser-accessible URL for a backend media path.
 * Handles strings, photo objects, filenames, and strips legacy localhost:3000 prefixes.
 * @param {string|object} input - File URL string or photo object containing .url/.path/.filename
 * @returns {string} - Relative URL safe for both dev and production
 */
export function mediaUrl(input) {
  if (!input) return ''
  let path = typeof input === 'string'
    ? input
    : (input.url || input.path || input.src || (input.filename ? `/uploads/${input.filename}` : ''))
  if (!path) return ''
  
  // If path contains legacy http://localhost:3000 or 127.0.0.1 prefix, strip origin to make relative
  if (/^https?:\/\/(localhost|127\.0\.0\.1):[0-9]+/.test(path)) {
    path = path.replace(/^https?:\/\/(localhost|127\.0\.0\.1):[0-9]+/, '')
  }

  // Already an absolute URL (e.g. blob:, data:, https:) — use as-is
  if (/^(https?|blob|data):/.test(path)) return path
  
  // Ensure leading slash for relative URL path
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * Opens a backend-generated file URL in a new tab.
 * @param {string} path - The server path, e.g. "/generated/report.xlsx"
 */
export function openFileUrl(path) {
  if (!path) return
  window.open(mediaUrl(path), '_blank')
}

/**
 * SVG Data URI Placeholder for broken/missing image URLs (404 fallback)
 */
export const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23f1f5f9" rx="10"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="28">📷</text><text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-size="11" fill="%2364748b" font-family="sans-serif" font-weight="bold">Image Unavailable</text></svg>'

/**
 * Handles image load errors gracefully by replacing broken source with a styled fallback placeholder.
 * @param {Event} e - Image onError event
 */
export function handleImageError(e) {
  if (e && e.target) {
    e.target.onerror = null
    e.target.src = FALLBACK_IMAGE
  }
}
