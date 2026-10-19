export function notify(message, type = 'success', action = null) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('no-offside-toast', {detail: {message, type, action}}));
  }
}
export function withFeedback(action, message = 'Cập nhật thành công') {
  return async (...args) => {
    try { const result = await action(...args); notify(message); return result; }
    catch (error) { notify(error.message || 'Có lỗi xảy ra, thử lại sau', 'error'); throw error; }
  };
}
