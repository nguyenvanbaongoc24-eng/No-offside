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

    // 1. GET: Resolve invite code across devices
    if (req.method === "GET") {
      const url = new URL(req.url, "http://localhost");
      const rawCode = url.searchParams.get("code") || req.query?.code || "";
      const code = String(rawCode).trim().toUpperCase();

      if (!code) {
        return res.status(400).json({ valid: false, error: "Thiếu mã lời mời (code)." });
      }

      // Check storage first (supports all teams, including demo/guest teams)
      const storedInvite = await readJson(supabaseAdmin, `invites/${code}.json`, null);
      if (storedInvite) {
        if (storedInvite.status === "revoked") {
          return res.status(200).json({
            valid: false,
            error: "Lời mời đã bị thu hồi hoặc không còn hiệu lực.",
            status: "revoked",
          });
        }
        return res.status(200).json({
          valid: true,
          code: storedInvite.code || code,
          teamId: storedInvite.teamId,
          teamName: storedInvite.teamName,
          logo: storedInvite.logo || "",
          category: storedInvite.category || "Sân 7",
          venue: storedInvite.venue || "",
          captain: storedInvite.captain || "Đội trưởng",
          membersCount: storedInvite.membersCount || 1,
          takenNumbers: storedInvite.takenNumbers || [],
          status: "active",
        });
      }

      // Fallback: Check Supabase DB RPC if configured
      try {
        if (supabaseAdmin && typeof supabaseAdmin.rpc === "function") {
          const { data, error } = await supabaseAdmin.rpc("no_gov_get_invite", {
            p_code: code,
          });
          if (!error && data && data.valid) {
            const result = {
              valid: true,
              code: data.code,
              teamId: data.teamId,
              teamName: data.teamName,
              logo: data.logo || "",
              category: data.category || "Sân 7",
              venue: data.venue || "",
              captain: data.captain || "Đội trưởng",
              membersCount: data.memberCount || 1,
              takenNumbers: data.takenNumbers || [],
              status: "active",
            };
            // Cache in storage for instant subsequent lookups
            try {
              await writeJson(supabaseAdmin, `invites/${code}.json`, result);
            } catch {}
            return res.status(200).json(result);
          }
        }
      } catch {}

      return res.status(404).json({
        valid: false,
        error: "Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi.",
      });
    }

    // 2. POST: Create, sync, revoke, or join invite
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }

      const action = body?.action || "sync";
      const rawCode = body?.code || "";
      const code = String(rawCode).trim().toUpperCase();

      if (!code) {
        return res.status(400).json({ error: "Thiếu mã lời mời (code)." });
      }

      // ACTION A: Revoke invite
      if (action === "revoke") {
        const existing = await readJson(supabaseAdmin, `invites/${code}.json`, null);
        if (existing) {
          existing.status = "revoked";
          existing.revokedAt = new Date().toISOString();
          await writeJson(supabaseAdmin, `invites/${code}.json`, existing);
        }
        if (body?.teamId) {
          try {
            await supabaseAdmin.rpc("no_gov_revoke_invite", { p_team_id: body.teamId });
          } catch {}
        }
        return res.status(200).json({ success: true, revoked: true, code });
      }

      // ACTION B: Join team via invite
      if (action === "join") {
        const memberProfile = body?.memberProfile || {};
        const fullName = String(memberProfile.name || "").trim();
        const jerseyNumber = Number(memberProfile.number);
        const position = String(memberProfile.position || memberProfile.role || "Tiền đạo").trim();

        if (!fullName || fullName.length < 2) {
          return res.status(400).json({ error: "Vui lòng nhập họ và tên của bạn." });
        }
        if (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99) {
          return res.status(400).json({ error: "Số áo phải là số nguyên từ 0 đến 99." });
        }

        const invite = await readJson(supabaseAdmin, `invites/${code}.json`, null);
        if (!invite || invite.status === "revoked") {
          return res.status(404).json({ error: "Mã Club không hợp lệ hoặc lời mời đã hết hạn / bị thu hồi." });
        }

        if (invite.takenNumbers && invite.takenNumbers.includes(jerseyNumber)) {
          return res.status(400).json({
            error: `Số áo ${jerseyNumber} đã có thành viên sử dụng. Vui lòng chọn số khác.`,
          });
        }

        const newMember = {
          id: `usr-inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: fullName,
          number: jerseyNumber,
          role: position,
          roleType: "member",
          customTitle: "Cầu thủ",
          isManual: false,
          joinedDate: new Date().toLocaleDateString("vi-VN"),
          avatar:
            memberProfile.avatar ||
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
          createdAt: new Date().toISOString(),
        };

        // Update invite cache
        invite.takenNumbers = [...(invite.takenNumbers || []), jerseyNumber];
        invite.membersCount = (invite.membersCount || 1) + 1;
        await writeJson(supabaseAdmin, `invites/${code}.json`, invite);

        // Update full team in storage if available
        let teamData = await readJson(supabaseAdmin, `teams/${invite.teamId}.json`, null);
        if (teamData) {
          teamData.members = [...(teamData.members || []), newMember];
          await writeJson(supabaseAdmin, `teams/${invite.teamId}.json`, teamData);
        }

        return res.status(200).json({
          success: true,
          team: teamData || {
            id: invite.teamId,
            teamName: invite.teamName,
            logo: invite.logo,
            category: invite.category,
            members: [newMember],
          },
          me: newMember,
        });
      }

      // ACTION C: Sync/Publish invite
      const team = body?.team || {};
      const teamId = body?.teamId || team?.id || `fc-${code.toLowerCase()}`;
      const teamName = (body?.teamName || team?.teamName || "FC No Offside").trim();
      const logo = body?.logo || team?.logo || "";
      const category = body?.category || team?.teamCategory || "Sân 7";
      const venue = body?.venue || team?.venue || "";
      const captain =
        body?.captain ||
        (team?.members || []).find((m) => m.roleType === "owner")?.name ||
        "Đội trưởng";
      const membersCount = body?.membersCount || (team?.members || []).length || 1;
      const takenNumbers =
        body?.takenNumbers ||
        (team?.members || [])
          .map((m) => Number(m.number))
          .filter((n) => Number.isInteger(n));

      const inviteRecord = {
        code,
        teamId,
        teamName,
        logo,
        category,
        venue,
        captain,
        membersCount,
        takenNumbers,
        status: "active",
        updatedAt: new Date().toISOString(),
      };

      await writeJson(supabaseAdmin, `invites/${code}.json`, inviteRecord);

      // If team object was supplied, also preserve/update the team in storage
      if (team && team.id) {
        const existingTeam = await readJson(supabaseAdmin, `teams/${teamId}.json`, {});
        await writeJson(supabaseAdmin, `teams/${teamId}.json`, {
          ...existingTeam,
          ...team,
          id: teamId,
          inviteCode: code,
          inviteStatus: "active",
        });
      }

      return res.status(200).json({ success: true, invite: inviteRecord });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ." });
  }
}
