import { randomUUID } from "node:crypto";
import {
  getAdminClient,
  getUserClient,
  getAuthUser,
  bearerToken,
  apiError,
  setCorsHeaders,
} from "./_storageHelper.js";
import { validateImage } from "./_imageValidation.js";
export default async function handler(req, res) {
  setCorsHeaders(res);
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  if (!bearerToken(req))
    return res.status(401).json({ error: "Vui lòng đăng nhập lại." });
  try {
    const client = getUserClient(req),
      user = await getAuthUser(req, client);
    if (!user)
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ." });
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { data: state, error } = await client.rpc("no_app_snapshot", {
      p_team_id: body.teamId,
    });
    if (error) throw error;
    if (!["owner", "admin"].includes(state?.role))
      return res
        .status(403)
        .json({ error: "Chỉ ban quản trị được tải QR của đội." });
    if (
      body.kind !== "qr" ||
      typeof body.imageBase64 !== "string" ||
      body.imageBase64.length > 1500000
    )
      return res
        .status(400)
        .json({ error: "Ảnh QR không hợp lệ hoặc lớn hơn 1 MB." });
    const match =
      /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(
        body.imageBase64,
      );
    if (!match)
      return res.status(400).json({ error: "Chọn ảnh PNG, JPG hoặc WebP." });
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 1024 * 1024 || !validateImage(buffer, match[1]))
      return res
        .status(400)
        .json({
          error:
            "Nội dung ảnh QR không đúng định dạng hoặc kích thước cho phép.",
        });
    const ext =
      match[1] === "image/png"
        ? "png"
        : match[1] === "image/jpeg"
          ? "jpg"
          : "webp";
    const path = `${body.teamId}/qr/${randomUUID()}.${ext}`,
      admin = getAdminClient();
    const upload = await admin.storage
      .from("team_assets")
      .upload(path, buffer, {
        contentType: match[1],
        upsert: false,
        cacheControl: "3600",
      });
    if (upload.error) throw upload.error;
    return res.status(200).json({ success: true, path });
  } catch (error) {
    return apiError(res, error);
  }
}
