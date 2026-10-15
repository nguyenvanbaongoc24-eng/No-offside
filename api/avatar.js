import { getAdminClient, getAuthUser, readJson, writeJson } from "./_storageHelper.js";

const BUCKET_NAME = "avatars";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Chỉ hỗ trợ phương thức POST." });
  }

  try {
    const supabaseAdmin = getAdminClient();
    const user = await getAuthUser(req, supabaseAdmin);

    if (!user) {
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." });
      }
    }

    const { imageBase64, mimeType = "image/webp" } = body || {};

    if (!imageBase64) {
      return res.status(400).json({ error: "Thiếu dữ liệu ảnh (imageBase64)." });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: "Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận PNG, JPG, WebP." });
    }

    // Strip data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "Dung lượng ảnh vượt quá 2 MB." });
    }

    const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
    const fileName = `avatar_${Date.now()}.${ext}`;
    const filePath = `${user.id}/${fileName}`;

    // 1. Upload to Supabase Storage "avatars" bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadErr) {
      return res.status(500).json({ error: `Lỗi tải ảnh lên Storage: ${uploadErr.message}` });
    }

    // 2. Obtain permanent public URL
    const { data: pubData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = pubData?.publicUrl;
    if (!publicUrl) {
      return res.status(500).json({ error: "Không tạo được đường dẫn ảnh đại diện." });
    }

    // 3. Update public.profiles table in PostgreSQL
    try {
      await supabaseAdmin
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch {}

    // 4. Update JSON profile in no_offside_data storage
    try {
      const existingProfile = await readJson(supabaseAdmin, `profiles/${user.id}.json`, {});
      await writeJson(supabaseAdmin, `profiles/${user.id}.json`, {
        ...existingProfile,
        avatar: publicUrl,
        avatar_url: publicUrl,
        updatedAt: new Date().toISOString(),
      });
    } catch {}

    // 5. Update Auth user_metadata
    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          avatar_url: publicUrl,
        },
      });
    } catch {}

    // 6. Clean up old avatar files belonging to this user
    try {
      const { data: files } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .list(user.id);
      if (files && files.length > 0) {
        const toDelete = files
          .filter((f) => f.name !== fileName && f.name.startsWith("avatar_"))
          .map((f) => `${user.id}/${f.name}`);
        if (toDelete.length > 0) {
          await supabaseAdmin.storage.from(BUCKET_NAME).remove(toDelete);
        }
      }
    } catch {}

    return res.status(200).json({
      success: true,
      avatarUrl: publicUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Lỗi xử lý ảnh đại diện." });
  }
}
