/**
 * media.js — Centralized media URL builder
 *
 * In development (Vite dev server), the Vite proxy forwards /uploads/ and
 * /generated/ to http://localhost:3000, so relative URLs work fine.
 *
 * In production (Docker + Nginx), Nginx proxies /uploads/ and /generated/ to
 * the backend container, so relative URLs also work fine.
 *
 * Using absolute `http://localhost:3000/...` breaks in any deployed env where
 * the backend is not reachable on that host/port from the browser.
 *
 * This helper always returns a relative URL path so it works everywhere.
 */

/**
 * Returns a browser-accessible URL for a backend media path.
 * @param {string} path - The server path, e.g. "/uploads/abc.jpg"
 * @returns {string} - A relative URL safe for both dev and production
 */
export function mediaUrl(path) {
  if (!path) return ''
  // Already an absolute URL (e.g. blob:, data:, https:) — use as-is
  if (/^(https?|blob|data):/.test(path)) return path
  // Ensure leading slash, return as relative path
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
