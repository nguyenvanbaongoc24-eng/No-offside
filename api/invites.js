import { getUserClient, getAuthUser, apiError, setCorsHeaders } from "./_storageHelper.js";
export default async function handler(req, res) {
  setCorsHeaders(res);
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!["GET", "POST"].includes(req.method))
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const client = getUserClient(req);
    if (req.method === "GET") {
      const code = String(
        req.query?.code ||
          new URL(req.url, "http://localhost").searchParams.get("code") ||
          "",
      )
        .trim()
        .toUpperCase();
      if (!/^[A-Z0-9]{6,12}$/.test(code))
        return res
          .status(400)
          .json({ valid: false, error: "Mã Club không hợp lệ." });
      const { data, error } = await client.rpc("no_gov_get_invite", {
        p_code: code,
      });
      if (error) throw error;
      return res
        .status(data?.valid ? 200 : 404)
        .json({ ...data, membersCount: data?.memberCount });
    }
    const user = await getAuthUser(req, client);
    if (!user)
      return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    let name, args;
    if (body.action === "join") {
      const profile = body.memberProfile || {};
      name = "no_gov_join_via_invite";
      args = {
        p_code: String(body.code || "")
          .trim()
          .toUpperCase(),
        p_name: profile.name,
        p_number: Number(profile.number),
        p_position: profile.position || profile.role || "Tiền đạo",
      };
    } else if (body.action === "create" || body.action === "revoke") {
      name =
        body.action === "create"
          ? "no_gov_create_invite"
          : "no_gov_revoke_invite";
      args = { p_team_id: body.teamId };
    } else
      return res
        .status(400)
        .json({ error: "Hãy tạo mã mời bằng chức năng của đội." });
    const { data, error } = await client.rpc(name, args);
    if (error) throw error;
    return res.status(200).json(data);
  } catch (error) {
    return apiError(res, error);
  }
}
