import { getAdminClient, getAuthUser, readJson, writeJson } from "./_storageHelper.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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
        body = {};
      }
    }

    const { teamId, action = "add-member" } = body;
    if (!teamId) {
      return res.status(400).json({ error: "Thiếu mã đội bóng (teamId)." });
    }

    const team = await readJson(supabaseAdmin, `teams/${teamId}.json`, null);
    if (!team) {
      return res.status(404).json({ error: "Không tìm thấy thông tin đội bóng." });
    }

    // Check caller permission: Must be Owner or Admin of this team
    const isOwner = team.ownerId === user.id;
    const callerMember = (team.members || []).find((m) => m.id === user.id);
    const isLeader = isOwner || callerMember?.roleType === "owner" || callerMember?.roleType === "admin";

    if (!isLeader) {
      return res.status(403).json({ error: "Chỉ Ban quản trị (Owner/Admin) mới có quyền quản lý thành viên." });
    }

    // 1. ADD MEMBER MANUALLY
    if (action === "add-member") {
      const memberInput = body.member || {};
      const fullName = (memberInput.name || "").trim();
      const rawNumber = memberInput.number;
      const jerseyNumber = Number(rawNumber);
      const position = (memberInput.role || memberInput.position || "Tiền Đạo (ST)").trim();
      const phone = (memberInput.phone || "").trim();

      // Field validation
      if (!fullName || fullName.length < 2) {
        return res.status(400).json({ error: "Họ và tên thành viên phải có ít nhất 2 ký tự." });
      }

      if (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
        return res.status(400).json({ error: "Số áo thi đấu không hợp lệ. Vui lòng nhập số áo từ 1 đến 99." });
      }

      // Check unique jersey number in active team members
      const activeMembers = (team.members || []).filter((m) => m.membershipStatus !== "removed");
      const duplicateJersey = activeMembers.find(
        (m) => Number(m.number) === jerseyNumber,
      );

      if (duplicateJersey) {
        return res.status(400).json({
          error: `Số áo #${jerseyNumber} đã được sử dụng bởi ${duplicateJersey.name}. Vui lòng chọn số áo khác.`,
        });
      }

      const newMember = {
        id: `usr-man-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: fullName,
        number: jerseyNumber,
        role: position,
        roleType: "member",
        customTitle: "Cầu thủ",
        phone: phone || "",
        joinedDate: "Thủ công",
        isManual: true,
        linkedUserId: null,
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
        createdAt: new Date().toISOString(),
      };

      const updatedMembers = [...(team.members || []), newMember];
      team.members = updatedMembers;

      await writeJson(supabaseAdmin, `teams/${teamId}.json`, team);

      return res.status(200).json({
        success: true,
        member: newMember,
        members: updatedMembers,
        count: updatedMembers.filter((m) => m.membershipStatus !== "removed").length,
      });
    }

    // 2. REMOVE MEMBER
    if (action === "remove-member") {
      const memberId = body.memberId;
      if (!memberId) {
        return res.status(400).json({ error: "Thiếu ID thành viên cần xóa." });
      }

      const target = (team.members || []).find((m) => m.id === memberId);
      if (!target) {
        return res.status(404).json({ error: "Thành viên không tồn tại trong đội." });
      }

      if (target.roleType === "owner" || target.id === team.ownerId) {
        return res.status(400).json({ error: "Không thể xóa Đội trưởng (Owner) khỏi đội bóng." });
      }

      const updatedMembers = (team.members || []).map((m) =>
        m.id === memberId
          ? {
              ...m,
              membershipStatus: "removed",
              removedAt: new Date().toISOString(),
              removedBy: user.id,
            }
          : m,
      );

      team.members = updatedMembers;
      await writeJson(supabaseAdmin, `teams/${teamId}.json`, team);

      return res.status(200).json({
        success: true,
        members: updatedMembers,
        count: updatedMembers.filter((m) => m.membershipStatus !== "removed").length,
      });
    }

    return res.status(400).json({ error: `Hành động '${action}' không hợp lệ.` });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ." });
  }
}
