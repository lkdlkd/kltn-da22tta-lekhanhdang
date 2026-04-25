/**
 * viewHistory.js — localStorage utility for tracking viewed rooms.
 * Stores the last MAX rooms the user has visited.
 */

const STORAGE_KEY = 'pt_viewed_rooms'
const MAX_HISTORY = 10

/**
 * Save a viewed room to localStorage history.
 * Moves existing entry to top if already present.
 * @param {{ _id: string, slug: string, title: string, images: string[], roomType: string }} room
 */
export function saveViewedRoom(room) {
  if (!room?._id) return
  try {
    const prev = getViewedRooms()
    // Remove duplicate, push to front
    const filtered = prev.filter((r) => r._id !== String(room._id))
    const entry = {
      _id:      String(room._id),
      slug:     room.slug     || '',
      title:    room.title    || '',
      image:    room.images?.[0] || null,
      roomType: room.roomType || null,
      savedAt:  Date.now(),
    }
    const next = [entry, ...filtered].slice(0, MAX_HISTORY)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage might be unavailable (private mode, quota, etc.)
  }
}

/**
 * Get the list of recently viewed rooms (newest first).
 * @returns {{ _id: string, slug: string, title: string, image: string|null, roomType: string|null }[]}
 */
export function getViewedRooms() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Get the most recently viewed room, or null.
 */
export function getLastViewedRoom() {
  const rooms = getViewedRooms()
  return rooms[0] || null
}

/**
 * Clear the full history.
 */
export function clearViewedRooms() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
}
