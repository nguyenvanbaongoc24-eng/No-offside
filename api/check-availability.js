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
    const cleanEmail = (body?.email || "").trim().toLowerCase();

    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      "https://xofcoycdndyuuuxtwcwl.supabase.co";
    const secretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !secretKey) {
      return res.status(200).json({ usernameAvailable: true, emailAvailable: true });
    }

    const supabaseAdmin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let usernameAvailable = true;
    let emailAvailable = true;
    let page = 1;

    while (page <= 5) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error || !data?.users?.length) break;

      for (const u of data.users) {
        if (
          cleanUsername &&
          (u.user_metadata?.username || "").toLowerCase() === cleanUsername
        ) {
          usernameAvailable = false;
        }
        if (cleanEmail && (u.email || "").toLowerCase() === cleanEmail) {
          emailAvailable = false;
        }
      }

      if (
        (!cleanUsername || !usernameAvailable) &&
        (!cleanEmail || !emailAvailable)
      ) {
        break;
      }
      if (data.users.length < 100) break;
      page++;
    }

    return res.status(200).json({ usernameAvailable, emailAvailable });
  } catch (err) {
    return res.status(200).json({ usernameAvailable: true, emailAvailable: true });
  }
}
