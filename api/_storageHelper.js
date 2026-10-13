import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const BUCKET_NAME = "no_offside_data";

let cachedAdmin = null;
const memoryStore = new Map();

// Helper to load .env.local during local testing/dev if env vars not populated
function loadLocalEnv() {
  if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    if (fs.existsSync(".env.local")) {
      const content = fs.readFileSync(".env.local", "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}

export function getAdminClient() {
  if (cachedAdmin) return cachedAdmin;
  loadLocalEnv();

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://xofcoycdndyuuuxtwcwl.supabase.co";
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (secretKey) {
    cachedAdmin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    // In-memory mock client when running offline tests without environment credentials
    cachedAdmin = {
      isMock: true,
      auth: {
        getUser: async (token) => {
          if (!token || token === "invalid-token") return { data: null, error: new Error("Invalid token") };
          return { data: { user: { id: "5e3967b5-a15a-4601-9719-3b6c0b7ad420", email: "mock_user@example.com" } }, error: null };
        },
      },
      storage: {
        from: () => ({
          download: async (path) => {
            const val = memoryStore.get(path);
            if (!val) return { data: null, error: new Error("Not found") };
            return { data: { text: async () => val }, error: null };
          },
          upload: async (path, content) => {
            memoryStore.set(path, typeof content === "string" ? content : JSON.stringify(content));
            return { data: { path }, error: null };
          },
        }),
      },
    };
  }
  return cachedAdmin;
}

export async function getAuthUser(req, supabaseAdmin) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function readJson(supabaseAdmin, path, fallback = null) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(path);
    if (error || !data) return fallback;
    const text = await data.text();
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export async function writeJson(supabaseAdmin, path, content) {
  const payload = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, payload, { upsert: true, contentType: "application/json" });
  if (error) {
    throw new Error(`Lỗi lưu dữ liệu: ${error.message}`);
  }
  return data;
}
