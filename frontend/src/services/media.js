/**
 * media.js — Centralized media URL builder
 *
 * In development (Vite dev server), Vite proxy forwards /uploads/ and /generated/
 * to http://localhost:3000, so relative URLs work fine.
 *
 * In production (Docker + Nginx), Nginx proxies /uploads/ and /generated/
 * directly to the backend container, so relative URLs also work fine.
 *
 * Using absolute `http://localhost:3000/...` breaks in production because the
 * browser on the client machine cannot reach localhost:3000 of the server.
 */

/**
 * Returns a browser-accessible URL for a backend media path.
 * Handles strings, photo objects, and strips legacy localhost:3000 prefixes.
 * @param {string|object} input - File URL string or photo object containing .url/.path
 * @returns {string} - Relative URL safe for both dev and production
 */
export function mediaUrl(input) {
  if (!input) return ''
  let path = typeof input === 'string' ? input : (input.url || input.path || input.src || '')
  if (!path) return ''
  
  // If path contains legacy http://localhost:3000 prefix, strip origin to make relative
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
 * Works correctly in both dev and production environments.
 * @param {string} path - The server path, e.g. "/generated/report.xlsx"
 */
export function openFileUrl(path) {
  if (!path) return
  window.open(mediaUrl(path), '_blank')
}
