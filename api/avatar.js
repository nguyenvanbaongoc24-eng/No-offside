import { randomUUID } from "node:crypto";
import { validateImage, detectMime } from "./_imageValidation.js";
import {
  getAdminClient,
  getUserClient,
  getAuthUser,
  bearerToken,
  setCorsHeaders,
} from "./_storageHelper.js";

const BUCKET_NAME = "avatars";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default async function handler(req, res) {
  setCorsHeaders(res);
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ phương thức POST." });
  }

  if (!bearerToken(req))
    return res
      .status(401)
      .json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });

  try {
    const supabaseAdmin = getAdminClient();
    const user = await getAuthUser(req, supabaseAdmin);

    if (!user) {
      return res
        .status(401)
        .json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." });
      }
    }

    const { imageBase64, mimeType = "image/jpeg" } = body || {};

    if (!imageBase64) {
      return res
        .status(400)
        .json({ error: "Thiếu dữ liệu ảnh (imageBase64)." });
    }

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(
      /^data:image\/[a-zA-Z+]+;base64,/,
      "",
    );
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "Dung lượng ảnh vượt quá 2 MB." });
    }

    // Auto-detect format from magic bytes if possible, falling back to declared/normalized mime
    const detected = detectMime(buffer);
    const normalizedInput = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
    const finalMime = detected || normalizedInput;

    if (!ALLOWED_MIME_TYPES.includes(finalMime)) {
      return res
        .status(400)
        .json({
          error:
            "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận PNG, JPG, WebP.",
        });
    }

    if (!validateImage(buffer, finalMime))
      return res
        .status(400)
        .json({
          error:
            "Nội dung ảnh không đúng định dạng hoặc ảnh vượt giới hạn kích thước.",
        });
    const ext =
      finalMime === "image/png"
        ? "png"
        : finalMime === "image/jpeg"
          ? "jpg"
          : "webp";
    const fileName = `avatar_${randomUUID()}.${ext}`;
    const filePath = `${user.id}/${fileName}`;

    // 1. Upload to Supabase Storage "avatars" bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: finalMime,
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadErr) {
      return res
        .status(500)
        .json({ error: `Lỗi tải ảnh lên Storage: ${uploadErr.message}` });
    }

    // 2. Obtain permanent public URL
    const { data: pubData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = pubData?.publicUrl;
    if (!publicUrl) {
      return res
        .status(500)
        .json({ error: "Không tạo được đường dẫn ảnh đại diện." });
    }

    // A URL is acknowledged only after the account profile has persisted it.
    const { data: profile, error: profileError } = await getUserClient(req)
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("id,avatar_url")
      .single();
    if (profileError || profile?.avatar_url !== publicUrl)
      return res
        .status(503)
        .json({
          error:
            "Ảnh đã tải lên nhưng chưa lưu được vào hồ sơ. Vui lòng thử lại.",
        });

    // Also sync avatar_url into Supabase auth user_metadata if available
    try {
      if (supabaseAdmin?.auth?.admin?.updateUserById) {
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: { avatar_url: publicUrl },
        });
      }
    } catch {}

    // Historical objects are retained; no production deletion during upload.
    return res.status(200).json({
      success: true,
      avatarUrl: publicUrl,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Lỗi xử lý ảnh đại diện." });
  }
}
