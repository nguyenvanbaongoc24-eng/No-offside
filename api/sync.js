import { getAdminClient, getAuthUser, readJson, writeJson } from "./_storageHelper.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const supabaseAdmin = getAdminClient();
    const user = await getAuthUser(req, supabaseAdmin);

    if (!user) {
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    }

    if (req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const teamId = url.searchParams.get("teamId");

      if (!teamId) {
        return res.status(400).json({ error: "Thiếu teamId." });
      }

      const teamData = await readJson(supabaseAdmin, `team_data/${teamId}.json`, {
        funds: { transactions: [], pendingApprovals: [], debtors: [] },
        matches: [],
        attendance: {},
        reports: {},
        notices: [],
      });

      return res.status(200).json({ success: true, data: teamData });
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      const { action = "sync-data", teamId, data: payloadData, profile } = body;

      // 1. SYNC USER PROFILE
      if (action === "save-profile" && profile) {
        await writeJson(supabaseAdmin, `profiles/${user.id}.json`, profile);
        // Also update Supabase user_metadata
        try {
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...(user.user_metadata || {}),
              full_name: profile.name,
              jersey_number: profile.number,
              position: profile.role,
              avatar_url: profile.avatar,
              phone: profile.phone,
            },
          });
        } catch {}
        return res.status(200).json({ success: true, profile });
      }

      // 2. SYNC TEAM DATA (Funds, Matches, Tactics, Attendance)
      if (teamId) {
        const team = await readJson(supabaseAdmin, `teams/${teamId}.json`, null);
        if (!team) {
          return res.status(404).json({ error: "Không tìm thấy đội bóng." });
        }

        const isMember =
          team.ownerId === user.id ||
          (team.members || []).some((m) => m.id === user.id && m.membershipStatus !== "removed");

        if (!isMember) {
          return res.status(403).json({ error: "Bạn không phải thành viên của đội này." });
        }

        if (payloadData) {
          const currentData = await readJson(supabaseAdmin, `team_data/${teamId}.json`, {});
          const mergedData = {
            ...currentData,
            ...payloadData,
          };
          await writeJson(supabaseAdmin, `team_data/${teamId}.json`, mergedData);
        }

        // If teamSettings properties like treasurerQr were included, update team
        if (body.teamSettingsUpdates) {
          const callerMember = (team.members || []).find((m) => m.id === user.id);
          const isLeader = team.ownerId === user.id || callerMember?.roleType === "owner" || callerMember?.roleType === "admin";
          if (isLeader) {
            const updatedTeam = { ...team, ...body.teamSettingsUpdates };
            await writeJson(supabaseAdmin, `teams/${teamId}.json`, updatedTeam);
          }
        }

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "Yêu cầu không hợp lệ." });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ." });
  }
}
