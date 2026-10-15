import {
  getUserClient,
  getAuthUser,
  apiError,
  bearerToken,
} from "./_storageHelper.js";
import { snapshot } from "./_workspace.js";
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
      return res
        .status(401)
        .json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    if (req.method === "GET") {
      const { data: memberships, error } = await client.rpc(
        "no_gov_my_memberships",
      );
      if (error) throw error;
      const allowed = memberships || [];
      const requested = new URL(req.url, "http://localhost").searchParams.get(
        "teamId",
      );
      const selected = requested
        ? allowed.find((m) => m.teamId === requested)
        : allowed.find((m) => m.status === "active") || allowed[0];
      if (requested && !selected)
        return res
          .status(403)
          .json({ error: "Bạn không có quyền truy cập đội này." });
      const profileResult = await client
        .from("profiles")
        .select(
          "id,full_name,username,avatar_url,phone,jersey_number,position,height,weight",
        )
        .eq("id", user.id)
        .single();
      if (profileResult.error) throw profileResult.error;
      if (!selected)
        return res
          .status(200)
          .json({
            success: true,
            team: null,
            userTeams: allowed,
            profile: profileResult.data,
          });
      return res
        .status(200)
        .json({
          ...(await snapshot(client, selected.teamId)),
          userTeams: allowed,
          profile: profileResult.data,
        });
    }
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (body.action === "create-team") {
      const team = body.team || {};
      if (
        !team.id ||
        !/^[\w-]{2,100}$/.test(team.id) ||
        !team.teamName?.trim() ||
        team.teamName.trim().length < 2
      )
        return res
          .status(400)
          .json({ error: "Tên đội và mã yêu cầu tạo đội không hợp lệ." });
      const { data, error } = await client.rpc("no_app_create_team", {
        p_team_id: team.id,
        p_name: team.teamName.trim(),
        p_settings: {
          logo: team.teamLogo || "",
          teamCategory: team.teamCategory || "Sân 7",
          venue: team.stadium || team.venue || "",
        },
      });
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: "Yêu cầu không hợp lệ." });
  } catch (error) {
    return apiError(res, error);
  }
}
