/**
 * Robust clipboard utility for web and mobile browsers (iOS Safari, Android Chrome, WebView).
 * 
 * Provides:
 * 1. Synchronous attempt of navigator.clipboard.writeText when permitted.
 * 2. Automatic fallback using document.execCommand('copy') with an offscreen textarea.
 * 3. Clear, localized Vietnamese guidance if copy permissions are blocked by the OS/browser,
 *    never leaking raw technical English errors (e.g. "The request is not allowed by the user agent...").
 */

export async function copyToClipboard(text) {
  const content = String(text ?? "").trim();
  if (!content) {
    return {
      success: false,
      message: "Không có nội dung để sao chép.",
    };
  }

  // 1. Try modern Clipboard API
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(content);
      return { success: true };
    } catch {
      // Common on iOS Safari when user gesture timer expired or permissions denied.
      // Continue to execCommand fallback.
    }
  }

  // 2. Fallback to document.execCommand('copy')
  if (
    typeof document !== "undefined" &&
    typeof document.createElement === "function" &&
    document.body
  ) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.width = "2em";
      textarea.style.height = "2em";
      textarea.style.padding = "0";
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.boxShadow = "none";
      textarea.style.background = "transparent";
      textarea.style.opacity = "0.01";
      textarea.style.zIndex = "-1";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, content.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (successful) {
        return { success: true };
      }
    } catch {
      // Fallback failed
    }
  }

  return {
    success: false,
    message: "Không sao chép được tự động do trình duyệt hạn chế. Vui lòng nhấn giữ mã hoặc liên kết để sao chép thủ công.",
  };
}
