import { getAdminClient, getAuthUser, readJson, writeJson } from "./_storageHelper.js";
import crypto from "node:crypto";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const supabaseAdmin = getAdminClient();
    const user = await getAuthUser(req, supabaseAdmin);

    if (!user) {
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }

    // 1. GET: Fetch messages for a team
    if (req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const teamId = url.searchParams.get("teamId");
      const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 200);
      const since = url.searchParams.get("since");

      if (!teamId) {
        return res.status(400).json({ error: "Thiếu teamId." });
      }

      // Verify membership
      const team = await readJson(supabaseAdmin, `teams/${teamId}.json`, null);
      if (team) {
        const isMember =
          team.ownerId === user.id ||
          (team.members || []).some(
            (m) => m.id === user.id && m.membershipStatus !== "removed"
          );
        if (!isMember) {
          return res.status(403).json({ error: "Bạn không phải thành viên của đội này." });
        }
      }

      let messages = [];

      // Try database table first
      try {
        let query = supabaseAdmin
          .from("no_team_messages")
          .select("id, team_id, sender_id, client_msg_id, text, created_at")
          .eq("team_id", teamId)
          .order("created_at", { ascending: true });

        if (since) {
          query = query.gt("created_at", since);
        }

        const { data, error } = await query.limit(limit);
        if (!error && Array.isArray(data) && data.length > 0) {
          messages = data.map((m) => ({
            id: m.id,
            teamId: m.team_id,
            senderId: m.sender_id,
            clientMsgId: m.client_msg_id,
            text: m.text,
            createdAt: m.created_at,
            status: "sent",
          }));
        }
      } catch {}

      // Fallback / supplement with storage
      if (messages.length === 0) {
        const stored = await readJson(supabaseAdmin, `team_messages/${teamId}.json`, []);
        if (Array.isArray(stored)) {
          let filtered = stored;
          if (since) {
            filtered = filtered.filter((m) => new Date(m.createdAt) > new Date(since));
          }
          messages = filtered.slice(-limit).map((m) => ({ ...m, status: "sent" }));
        }
      }

      // Sort stably by createdAt asc, id asc
      messages.sort((a, b) => {
        const tDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (tDiff !== 0) return tDiff;
        return String(a.id).localeCompare(String(b.id));
      });

      return res.status(200).json({
        success: true,
        messages,
      });
    }

    // 2. POST: Send a message
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      const { teamId, text, clientMsgId } = body || {};

      if (!teamId || typeof teamId !== "string") {
        return res.status(400).json({ error: "Thiếu teamId." });
      }

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Nội dung tin nhắn không được để trống." });
      }

      if (text.length > 2000) {
        return res.status(400).json({ error: "Tin nhắn không được vượt quá 2000 ký tự." });
      }

      const idempotencyKey = String(clientMsgId || crypto.randomUUID());

      // Verify membership
      const team = await readJson(supabaseAdmin, `teams/${teamId}.json`, null);
      if (team) {
        const isMember =
          team.ownerId === user.id ||
          (team.members || []).some(
            (m) => m.id === user.id && m.membershipStatus !== "removed"
          );
        if (!isMember) {
          return res.status(403).json({ error: "Bạn không phải thành viên của đội này." });
        }
      }

      // Check idempotency in storage to avoid duplicates
      const stored = await readJson(supabaseAdmin, `team_messages/${teamId}.json`, []);
      const existing = (stored || []).find(
        (m) => m.senderId === user.id && m.clientMsgId === idempotencyKey
      );
      if (existing) {
        return res.status(200).json({
          success: true,
          message: existing,
          duplicate: true,
        });
      }

      const serverTimestamp = new Date().toISOString();
      const messageId = crypto.randomUUID();
      const senderName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Thành viên";

      const newMessage = {
        id: messageId,
        teamId,
        senderId: user.id,
        sender: senderName,
        text: text.trim().slice(0, 2000),
        clientMsgId: idempotencyKey,
        createdAt: serverTimestamp,
        status: "sent",
      };

      // 1. Persist to Postgres database table if available
      try {
        await supabaseAdmin.from("no_team_messages").insert({
          id: messageId,
          team_id: teamId,
          sender_id: user.id,
          client_msg_id: idempotencyKey,
          text: newMessage.text,
          created_at: serverTimestamp,
        });
      } catch {}

      // 2. Persist to Storage JSON
      try {
        const nextStored = [...(stored || []), newMessage].slice(-1000);
        await writeJson(supabaseAdmin, `team_messages/${teamId}.json`, nextStored);
      } catch (err) {
        return res.status(500).json({ error: "Không lưu được tin nhắn vào cơ sở dữ liệu." });
      }

      // 3. Broadcast to Realtime channel
      try {
        const channel = supabaseAdmin.channel(`team-chat:${teamId}`);
        await channel.send({
          type: "broadcast",
          event: "new-message",
          payload: newMessage,
        });
        await supabaseAdmin.removeChannel(channel);
      } catch {}

      return res.status(200).json({
        success: true,
        message: newMessage,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Lỗi xử lý tin nhắn." });
  }
}
