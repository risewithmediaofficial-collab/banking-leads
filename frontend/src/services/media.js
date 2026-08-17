/**
 * media.js — Centralized media URL builder & image fallback handler
 */

/**
 * Returns a browser-accessible URL for a backend media path.
 * Handles strings, photo objects, filenames, and strips host/port prefixes (localhost, IP addresses, etc.).
 * @param {string|object} input - File URL string or photo object containing .url/.path/.filename/.previewUrl
 * @returns {string} - Relative URL safe for both dev and production
 */
export function mediaUrl(input) {
  if (!input) return ''

  // 1. If input is a string
  if (typeof input === 'string') {
    let path = input.trim()
    if (!path) return ''
    if (path.startsWith('data:')) return path
    if (path.startsWith('blob:')) {
      // If someone passed a raw blob string directly, return as-is
      return path
    }
    const uploadsIndex = path.indexOf('/uploads/')
    if (uploadsIndex !== -1) return path.substring(uploadsIndex)
    const generatedIndex = path.indexOf('/generated/')
    if (generatedIndex !== -1) return path.substring(generatedIndex)
    if (/^https?:\/\//i.test(path)) {
      try {
        const urlObj = new URL(path)
        return urlObj.pathname + urlObj.search
      } catch {
        path = path.replace(/^https?:\/\/[^\/]+/, '')
      }
    }
    return path.startsWith('/') ? path : `/${path}`
  }

  // 2. If input is an object (photo, document, file record)
  if (typeof input === 'object') {
    // ALWAYS prefer persistent server upload paths (url, path, src, filename) over temporary local blob: previewUrl
    let path = input.url || input.path || input.src || (input.filename ? `/uploads/${input.filename}` : '')

    // If no server URL is present and previewUrl is provided (active upload in-progress)
    if (!path && input.previewUrl) {
      path = input.previewUrl
    }

    if (!path) return ''

    // If path is data: URI or active local blob: URL
    if (path.startsWith('data:') || path.startsWith('blob:')) {
      return path
    }

    const uploadsIndex = path.indexOf('/uploads/')
    if (uploadsIndex !== -1) return path.substring(uploadsIndex)
    const generatedIndex = path.indexOf('/generated/')
    if (generatedIndex !== -1) return path.substring(generatedIndex)
    if (/^https?:\/\//i.test(path)) {
      try {
        const urlObj = new URL(path)
        return urlObj.pathname + urlObj.search
      } catch {
        path = path.replace(/^https?:\/\/[^\/]+/, '')
      }
    }
    return path.startsWith('/') ? path : `/${path}`
  }

  return ''
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
export const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="12" fill="%23f1f5f9"/><path d="M40 46C40 43.7909 41.7909 42 44 42H76C78.2091 42 80 43.7909 80 46V74C80 76.2091 78.2091 78 76 78H44C41.7909 78 40 76.2091 40 74V46Z" stroke="%2394a3b8" stroke-width="3"/><circle cx="52" cy="52" r="4" fill="%2394a3b8"/><path d="M44 70L54 58L64 68L70 62L76 70H44Z" fill="%2394a3b8"/><text x="50%" y="88%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="%2364748b" font-family="sans-serif" font-weight="bold">Image Unavailable</text></svg>'

/**
 * Handles image load errors gracefully by checking data-fallback before replacing broken source with placeholder.
 * @param {Event} e - Image onError event
 */
export function handleImageError(e) {
  if (e && e.target) {
    const fallback = e.target.getAttribute('data-fallback')
    if (fallback && !e.target.dataset.triedFallback && fallback !== e.target.src) {
      e.target.dataset.triedFallback = 'true'
      e.target.src = fallback
      return
    }
    e.target.onerror = null
    e.target.src = FALLBACK_IMAGE
  }
}
