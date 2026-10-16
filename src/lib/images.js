import { beginPendingWrite } from "./pendingWrites.js";
export async function imageDataUrl(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Chọn ảnh JPG, PNG hoặc WebP.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Ảnh cần nhỏ hơn 2 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Không đọc được ảnh."));
    reader.readAsDataURL(file);
  });
}

export async function compressAndResizeAvatar(
  file,
  maxDim = 400,
  quality = 0.85,
) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Chọn ảnh JPG, PNG hoặc WebP.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ảnh cần nhỏ hơn 2 MB.");
  }

  // If in browser environment with HTMLImageElement and Canvas
  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof Image !== "undefined" &&
    typeof URL !== "undefined" &&
    URL.createObjectURL
  ) {
    return new Promise((resolve) => {
      const img = new Image();
      let url = "";
      try {
        url = URL.createObjectURL(file);
      } catch {
        imageDataUrl(file)
          .then((dataUrl) => resolve({ dataUrl, mimeType: file.type }))
          .catch(() => resolve({ dataUrl: "", mimeType: file.type }));
        return;
      }

      img.onload = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}

        let width = img.width || maxDim;
        let height = img.height || maxDim;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          imageDataUrl(file).then((dataUrl) =>
            resolve({ dataUrl, mimeType: file.type }),
          );
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = "image/webp";

        if (canvas.toBlob) {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                imageDataUrl(file).then((dataUrl) =>
                  resolve({ dataUrl, mimeType: file.type }),
                );
                return;
              }
              const reader = new FileReader();
              reader.onload = () =>
                resolve({ dataUrl: reader.result, mimeType: mime });
              reader.onerror = () =>
                imageDataUrl(file).then((dataUrl) =>
                  resolve({ dataUrl, mimeType: file.type }),
                );
              reader.readAsDataURL(blob);
            },
            mime,
            quality,
          );
        } else {
          try {
            const dataUrl = canvas.toDataURL(mime, quality);
            resolve({ dataUrl, mimeType: mime });
          } catch {
            imageDataUrl(file).then((dataUrl) =>
              resolve({ dataUrl, mimeType: file.type }),
            );
          }
        }
      };

      img.onerror = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        imageDataUrl(file).then((dataUrl) =>
          resolve({ dataUrl, mimeType: file.type }),
        );
      };

      img.src = url;
    });
  }

  const dataUrl = await imageDataUrl(file);
  return { dataUrl, mimeType: file.type };
}

export async function uploadAvatarImage(file, accessToken) {
  const finishWrite = beginPendingWrite();
  try {
    const { dataUrl, mimeType } = await compressAndResizeAvatar(file);

    // If demo or no access token, return dataUrl directly
    if (
      !accessToken ||
      accessToken === "demo" ||
      accessToken.startsWith("demo") ||
      typeof fetch === "undefined"
    ) {
      return dataUrl;
    }

    let res;
    try {
      res = await fetch("/api/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: mimeType || "image/webp",
        }),
      });
    } catch (networkErr) {
      if (
        networkErr?.name === "TypeError" &&
        (networkErr?.message?.toLowerCase().includes("load failed") ||
          networkErr?.message?.toLowerCase().includes("failed to fetch") ||
          networkErr?.message?.toLowerCase().includes("network error"))
      ) {
        throw new Error(
          "Không thể kết nối đến máy chủ để tải ảnh đại diện. Vui lòng kiểm tra mạng rồi thử lại.",
        );
      }
      throw networkErr;
    }

    if (!res.ok) {
      let errorMsg = "Lỗi tải ảnh đại diện lên máy chủ.";
      try {
        const body = await res.json();
        if (body.error) errorMsg = body.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    if (!data.success || !data.avatarUrl)
      throw Error("Server chưa xác nhận ảnh đại diện.");
    return data.avatarUrl;
  } finally {
    finishWrite();
  }
}
