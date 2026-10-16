import {
  getUserClient,
  getAuthUser,
  apiError,
  bearerToken,
  setCorsHeaders,
} from "./_storageHelper.js";
import { snapshot } from "./_workspace.js";
export default async function handler(req, res) {
  let stage = "authenticate";
  setCorsHeaders(res);
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
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
      stage = "memberships";
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
      stage = "profile";
      const profileResult = await client.rpc("no_app_ensure_profile");
      if (profileResult.error) throw profileResult.error;
      stage = "workspace";
      if (!selected)
        return res.status(200).json({
          success: true,
          team: null,
          userTeams: allowed,
          profile: profileResult.data,
        });
      return res.status(200).json({
        ...(await snapshot(client, selected.teamId)),
        userTeams: allowed,
        profile: profileResult.data,
      });
    }
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
    let body;
    try {body=typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};} catch {return res.status(400).json({error:'Dữ liệu không hợp lệ.'});}
    if(!body || typeof body!=='object' || Array.isArray(body))return res.status(400).json({error:'Dữ liệu không hợp lệ.'});
    if (['leave-team','dissolve-team'].includes(body.action)) {
      if(typeof body.teamId!=='string' || body.teamId.length>100)return res.status(400).json({error:'Đội không hợp lệ.'});
      const {data,error}=await client.rpc('no_app_exit_team',{p_team_id:body.teamId,p_dissolve:body.action==='dissolve-team',p_confirmation:typeof body.confirmation==='string'?body.confirmation:''});
      if(error)throw error;
      return res.status(200).json(data);
    }
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
    // Never log tokens, private profile fields or raw database error details.
    console.error("teams_request_failed", {
      stage,
      code: error.code || error.name || "unknown",
    });
    return apiError(res, error);
  }
}
