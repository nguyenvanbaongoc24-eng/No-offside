import {
  getUserClient,
  getAuthUser,
  apiError,
  bearerToken,
  getAdminClient,
  readJson,
} from "./_storageHelper.js";
export const presentMessage = (m) => ({
  id: m.id,
  teamId: m.team_id,
  senderId: m.sender_id,
  clientMsgId: m.client_msg_id,
  text: m.text,
  createdAt: m.created_at,
  sender: m.legacy_sender_name || undefined,
  legacyUnverified: m.legacy_unverified || undefined,
  status: "sent",
});
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!bearerToken(req))
    return res
      .status(401)
      .json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  try {
    const client = getUserClient(req),
      user = await getAuthUser(req, client);
    if (!user)
      return res.status(401).json({ error: "Vui lòng đăng nhập lại." });
    if (req.method === "GET") {
      const params = new URL(req.url, "http://localhost").searchParams;
      const teamId = params.get("teamId"),
        before = params.get("before"),
        beforeId = params.get("beforeId");
      if (!teamId) return res.status(400).json({ error: "Thiếu teamId." });
      const membership = await client.rpc("no_app_is_member", {
        p_team_id: teamId,
      });
      if (membership.error) throw membership.error;
      if (!membership.data)
        return res
          .status(403)
          .json({ error: "Bạn không có quyền đọc tin nhắn đội này." });
      const ready = await client.rpc("no_app_chat_ready", {
        p_team_id: teamId,
      });
      if (ready.error) throw ready.error;
      if (!ready.data) {
        const admin = getAdminClient(),
          messages = await readJson(admin, `team_messages/${teamId}.json`, []);
        const imported = await admin.rpc("no_app_import_chat", {
          p_team_id: teamId,
          p_messages: messages,
        });
        if (imported.error) throw imported.error;
      }

      const limit = Math.max(
        1,
        Math.min(Number(params.get("limit")) || 50, 100),
      );
      let query = client
        .from("no_team_messages")
        .select(
          "id,team_id,sender_id,client_msg_id,text,created_at,legacy_sender_name,legacy_unverified",
        )
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (before) {
        if (
          !Number.isFinite(Date.parse(before)) ||
          !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(before) ||
          !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
            beforeId || "",
          )
        )
          return res
            .status(400)
            .json({ error: "Mốc phân trang không hợp lệ." });
        query = query.or(
          `created_at.lt.${new Date(before).toISOString()},and(created_at.eq.${new Date(before).toISOString()},id.lt.${beforeId})`,
        );
      }
      const { data, error } = await query.limit(limit + 1);
      if (error) throw error;
      const archive = await client.rpc("no_app_chat_archive_info", {
        p_team_id: teamId,
      });
      if (archive.error) throw archive.error;
      const page = (data || []).slice(0, limit),
        last = page.at(-1);
      return res.status(200).json({
        success: true,
        messages: page.reverse().map(presentMessage),
        hasMore: (data || []).length > limit,
        preservedUnparsedMessages: archive.data?.unreadableCount || 0,
        cursor: last ? { before: last.created_at, beforeId: last.id } : null,
      });
    }
    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (
        typeof body.teamId !== "string" ||
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 2000 ||
        typeof body.clientMsgId !== "string" ||
        !body.clientMsgId ||
        body.clientMsgId.length > 128
      )
        return res.status(400).json({ error: "Tin nhắn không hợp lệ." });
      const { data, error } = await client.rpc("no_app_send_message", {
        p_team_id: body.teamId,
        p_client_id: body.clientMsgId,
        p_text: body.text,
      });
      if (error) throw error;
      if (!data?.id) throw Error("Server did not acknowledge message");
      return res
        .status(200)
        .json({ success: true, message: presentMessage(data) });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return apiError(res, error);
  }
}
