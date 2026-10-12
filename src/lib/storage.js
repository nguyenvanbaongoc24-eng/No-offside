export function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : fallback;
    if (parsed == null) return fallback;
    if (fallback !== null && (typeof parsed !== typeof fallback || Array.isArray(parsed) !== Array.isArray(fallback))) return fallback;
    return parsed;
  } catch { return fallback; }
}

export function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent('storage-error', { detail: 'Không thể lưu dữ liệu trên thiết bị. Vui lòng kiểm tra dung lượng lưu trữ.' }));
    return false;
  }
}
