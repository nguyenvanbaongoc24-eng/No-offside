import { snapshot } from "./_workspace.js";
import {
  getUserClient,
  getAuthUser,
  bearerToken,
  apiError,
} from "./_storageHelper.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
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
    if (!body.requestKey || !body.teamId)
      return res.status(400).json({ error: "Thiếu mã đội hoặc mã yêu cầu." });
    const { data, error } = await client.rpc("no_app_member_action", {
      p_team_id: body.teamId,
      p_action: body.action,
      p_member: body.memberId || "",
      p_payload: body.member || body.payload || {},
      p_key: body.requestKey,
    });
    if (error) throw error;
    return res
      .status(200)
      .json({ ...(await snapshot(client, body.teamId)), member: data.member });
  } catch (error) {
    return apiError(res, error);
  }
}
