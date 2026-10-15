import { getUserClient, apiError } from "./_storageHelper.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    if (!/^[a-z0-9_-]{3,20}$/.test(username))
      return res.status(400).json({ error: "Invalid username" });
    const { data, error } = await getUserClient(req).rpc(
      "no_auth_resolve_username",
      { p_username: username, p_client_id: "web" },
    );
    if (error) {
      if (error.code === "42501")
        return res.status(404).json({ error: "Invalid username or password" });
      throw error;
    }
    if (!data?.email)
      return res.status(404).json({ error: "Invalid username or password" });
    return res.status(200).json({ email: data.email });
  } catch (error) {
    return apiError(res, error);
  }
}
