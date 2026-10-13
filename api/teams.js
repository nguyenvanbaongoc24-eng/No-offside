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

    // GET: Retrieve user team
    if (req.method === "GET") {
      if (!user) {
        return res.status(200).json({ success: true, team: null, error: "Unauthenticated" });
      }

      const userTeams = await readJson(supabaseAdmin, `user_teams/${user.id}.json`, []);
      if (!userTeams || userTeams.length === 0) {
        return res.status(200).json({ success: true, team: null });
      }

      const activeUserTeam = userTeams[0];
      const teamId = activeUserTeam.teamId;
      const team = await readJson(supabaseAdmin, `teams/${teamId}.json`, null);
      const teamData = await readJson(supabaseAdmin, `team_data/${teamId}.json`, {
        funds: { transactions: [], pendingApprovals: [], debtors: [] },
        matches: [],
        attendance: {},
        reports: {},
        notices: [],
      });

      return res.status(200).json({
        success: true,
        team,
        data: teamData,
        role: activeUserTeam.role || "member",
        userTeams,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!user) {
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const action = body?.action || "create-team";

    // 1. CREATE TEAM ACTION
    if (action === "create-team") {
      const teamPayload = body?.team || {};
      const teamName = (teamPayload.teamName || "").trim();

      if (!teamName || teamName.length < 2) {
        return res.status(400).json({ error: "Tên đội bóng phải có ít nhất 2 ký tự." });
      }

      const teamId =
        teamPayload.id ||
        `fc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

      const creatorMember = {
        id: user.id,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0] : "Đội Trưởng"),
        number: Number(user.user_metadata?.jersey_number) || 9,
        role: user.user_metadata?.position || "Tiền Đạo (ST)",
        roleType: "owner",
        customTitle: "Đội Trưởng",
        isCaptain: true,
        joinedDate: "Khởi tạo đội",
        avatar:
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          "",
        email: user.email || "",
        phone: user.phone || user.user_metadata?.phone || "",
      };

      const newTeam = {
        id: teamId,
        teamName,
        teamCategory: teamPayload.teamCategory || "Sân 7",
        venue: teamPayload.stadium || teamPayload.venue || "Sân bóng Sài Gòn",
        logo: teamPayload.teamLogo || teamPayload.logo || "",
        ownerId: user.id,
        members: [creatorMember],
        subAdmins: [],
        pendingAdminRequests: [],
        treasurerQr: {
          bankName: "",
          bankCode: "970422",
          accountNumber: "",
          accountHolder: "",
        },
        appearance: {
          primaryColor: "#047857",
          birthdayReportEnabled: true,
        },
        rules: "Nội quy đội bóng No Offside",
        createdAt: new Date().toISOString(),
      };

      // Atomic save to backend cloud storage
      await writeJson(supabaseAdmin, `teams/${teamId}.json`, newTeam);

      // Link user membership
      const userTeams = await readJson(supabaseAdmin, `user_teams/${user.id}.json`, []);
      const updatedUserTeams = [
        { teamId, role: "owner", teamName, isOwner: true },
        ...userTeams.filter((t) => t.teamId !== teamId),
      ];
      await writeJson(supabaseAdmin, `user_teams/${user.id}.json`, updatedUserTeams);

      // Initialize team data (ledger, matches, attendance)
      const initialTeamData = {
        funds: { transactions: [], pendingApprovals: [], debtors: [] },
        matches: [],
        attendance: {},
        reports: {},
        notices: [],
      };
      await writeJson(supabaseAdmin, `team_data/${teamId}.json`, initialTeamData);

      return res.status(200).json({
        success: true,
        team: newTeam,
        data: initialTeamData,
        role: "owner",
      });
    }

    // 2. UPDATE TEAM SETTINGS ACTION
    if (action === "update-team") {
      const teamId = body?.teamId;
      const updates = body?.updates || {};

      if (!teamId) {
        return res.status(400).json({ error: "Thiếu mã đội bóng (teamId)." });
      }

      const team = await readJson(supabaseAdmin, `teams/${teamId}.json`, null);
      if (!team) {
        return res.status(404).json({ error: "Không tìm thấy đội bóng." });
      }

      if (team.ownerId !== user.id) {
        return res.status(403).json({ error: "Chỉ Chủ đội (Owner) mới có quyền sửa thông tin đội bóng." });
      }

      const updatedTeam = {
        ...team,
        ...updates,
        id: teamId,
        ownerId: team.ownerId, // Preserve owner
      };

      await writeJson(supabaseAdmin, `teams/${teamId}.json`, updatedTeam);

      return res.status(200).json({
        success: true,
        team: updatedTeam,
      });
    }

    return res.status(400).json({ error: `Hành động '${action}' không hợp lệ.` });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ." });
  }
}
