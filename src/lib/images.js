import { beginPendingWrite } from "./pendingWrites.js";
import { supabase } from "./supabase.js";
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
    typeof Image !== "undefined"
  ) {
    return new Promise((resolve) => {
      const img = new Image();
      let url = "";
      try {
        if (typeof URL !== "undefined" && URL.createObjectURL) {
          url = URL.createObjectURL(file);
        }
      } catch {}

      const cleanup = () => {
        if (url) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
      };

      img.onload = () => {
        cleanup();
        try {
          let width = img.naturalWidth || img.width || maxDim;
          let height = img.naturalHeight || img.height || maxDim;

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
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            imageDataUrl(file)
              .then((dataUrl) => resolve({ dataUrl, mimeType: file.type }))
              .catch(() => resolve({ dataUrl: "", mimeType: file.type }));
            return;
          }

          // Fill white background for clean rendering across all formats
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Use image/jpeg for avatars: universal compatibility on all iOS/Safari/Android, tiny size (~30KB)
          let dataUrl = "";
          try {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          } catch {
            dataUrl = canvas.toDataURL();
          }

          const mimeMatch = dataUrl.match(/^data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          resolve({ dataUrl, mimeType });
        } catch {
          imageDataUrl(file)
            .then((dataUrl) => resolve({ dataUrl, mimeType: file.type }))
            .catch(() => resolve({ dataUrl: "", mimeType: file.type }));
        }
      };

      img.onerror = () => {
        cleanup();
        imageDataUrl(file)
          .then((dataUrl) => resolve({ dataUrl, mimeType: file.type }))
          .catch(() => resolve({ dataUrl: "", mimeType: file.type }));
      };

      if (url) {
        img.src = url;
      } else {
        imageDataUrl(file)
          .then((dataUrl) => {
            img.src = dataUrl;
          })
          .catch(() => {
            resolve({ dataUrl: "", mimeType: file.type });
          });
      }
    });
  }

  const dataUrl = await imageDataUrl(file);
  return { dataUrl, mimeType: file.type };
}

export async function uploadAvatarImage(file, accessToken) {
  const finishWrite = beginPendingWrite();
  try {
    const { dataUrl, mimeType } = await compressAndResizeAvatar(file);

    // Refresh or obtain token if available
    let token = accessToken;
    if (supabase?.auth?.getSession) {
      try {
        const { data: sData } = await supabase.auth.getSession();
        if (sData?.session?.access_token) {
          token = sData.session.access_token;
        }
      } catch {}
    }

    // If demo or no access token, return dataUrl directly
    if (
      !token ||
      token === "demo" ||
      token.startsWith("demo") ||
      typeof fetch === "undefined"
    ) {
      return dataUrl;
    }

    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType: mimeType || "image/jpeg",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.avatarUrl) {
          return data.avatarUrl;
        }
      } else {
        let errorMsg = "";
        try {
          const body = await res.json();
          if (body?.error) errorMsg = body.error;
        } catch {}
        console.warn(
          "Avatar upload responded with error status:",
          res.status,
          errorMsg,
        );
        // Fall back to dataUrl so profile save never breaks
        return dataUrl;
      }
    } catch (networkErr) {
      console.warn(
        "Avatar server upload failed (network/CORS/timeout), falling back to dataUrl:",
        networkErr,
      );
      // Graceful fallback to dataUrl so user profile update is not blocked
      return dataUrl;
    }

    return dataUrl;
  } finally {
    finishWrite();
  }
}
