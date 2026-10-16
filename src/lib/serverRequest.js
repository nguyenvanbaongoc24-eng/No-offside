export async function serverRequest(url, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json();
    return { response, data };
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted)
      throw Error("Kết nối quá lâu. Kiểm tra mạng rồi thử lại.");
    if (
      error?.name === "TypeError" &&
      (error?.message?.toLowerCase().includes("load failed") ||
        error?.message?.toLowerCase().includes("failed to fetch") ||
        error?.message?.toLowerCase().includes("network error"))
    ) {
      throw Error("Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng rồi thử lại.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
