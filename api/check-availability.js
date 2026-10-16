import { getUserClient, apiError, setCorsHeaders } from "./_storageHelper.js";
export default async function handler(req, res) {
  setCorsHeaders(res);
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (
      (body.username != null && typeof body.username !== "string") ||
      (body.email != null && typeof body.email !== "string")
    )
      return res.status(400).json({ error: "Invalid account details" });
    const username = body.username?.trim().toLowerCase() || null,
      email = body.email?.trim().toLowerCase() || null;
    if (
      (!username && !email) ||
      (username && username.length > 20) ||
      (email && email.length > 254)
    )
      return res.status(400).json({ error: "Invalid account details" });
    const { data, error } = await getUserClient(req).rpc(
      "no_auth_check_availability",
      { p_username: username, p_email: email },
    );
    if (error) throw error;
    if (
      typeof data?.usernameAvailable !== "boolean" ||
      typeof data?.emailAvailable !== "boolean"
    )
      throw Object.assign(
        Error("Server did not acknowledge account availability"),
        { status: 503 },
      );
    return res
      .status(200)
      .json({
        usernameAvailable: data.usernameAvailable,
        emailAvailable: data.emailAvailable,
      });
  } catch (error) {
    return apiError(res, error);
  }
}
