// Safe helper for maintaining pending join state across authentication flows
// Storage key: sessionStorage only (never in query strings, never with passwords or auth tokens)

const PENDING_JOIN_KEY = 'no_offside_pending_join';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function savePendingJoin(data) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    const payload = {
      code: String(data.code || '').trim().toUpperCase(),
      name: String(data.name || '').trim(),
      number: Number(data.number),
      position: String(data.position || 'Tiền đạo').trim(),
      teamName: String(data.teamName || ''),
      teamLogo: String(data.teamLogo || ''),
      teamId: String(data.teamId || ''),
      createdAt: Date.now(),
    };
    window.sessionStorage.setItem(PENDING_JOIN_KEY, JSON.stringify(payload));
  } catch {}
}

export function getPendingJoin() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_JOIN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.code || !data.createdAt) return null;
    if (Date.now() - data.createdAt > TWO_HOURS_MS) {
      clearPendingJoin();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearPendingJoin() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(PENDING_JOIN_KEY);
  } catch {}
}
