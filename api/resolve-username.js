import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const cleanUsername = (body?.username || "").trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ error: "Username is required" });
    }

    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://xofcoycdndyuuuxtwcwl.supabase.co";
    const secretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !secretKey) {
      return res.status(500).json({ error: "Server configuration missing" });
    }

    const supabaseAdmin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let page = 1;
    let foundUser = null;

    while (page <= 5) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error || !data?.users?.length) break;

      foundUser = data.users.find((u) => {
        const uName = (u.user_metadata?.username || "").toLowerCase();
        return uName === cleanUsername;
      });

      if (foundUser) break;
      if (data.users.length < 100) break;
      page++;
    }

    if (!foundUser) {
      return res.status(404).json({ error: "Tên đăng nhập hoặc mật khẩu không chính xác." });
    }

    return res.status(200).json({
      email: foundUser.email,
      id: foundUser.id,
      name:
        foundUser.user_metadata?.full_name ||
        foundUser.user_metadata?.name ||
        foundUser.email,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
