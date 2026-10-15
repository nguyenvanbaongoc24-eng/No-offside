import { createClient } from "@supabase/supabase-js";
const BUCKET_NAME = "no_offside_data";
let cachedAdmin, testClient;

export function setTestAdminClient(client) {
  if (
    !process.env.NODE_TEST_CONTEXT ||
    process.env.VERCEL ||
    process.env.NODE_ENV === "production"
  )
    throw Error("Test clients require the Node test runner.");
  testClient = client;
}
export function getAdminClient() {
  if (testClient) return testClient;
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "[SENSITIVE]")
    throw Object.assign(
      Error("Máy chủ chưa cấu hình lưu trữ. Vui lòng thử lại sau."),
      { status: 503 },
    );
  cachedAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}
// User RPCs need the caller JWT: service-role requests have no auth.uid().
export function getUserClient(req) {
  if (testClient?.userClient) return testClient.userClient(req);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw Object.assign(Error("Chưa cấu hình kết nối dữ liệu."), {
      status: 503,
    });
  const token = bearerToken(req);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}
export function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  return typeof header === "string" && /^Bearer\s+\S+$/i.test(header)
    ? header.replace(/^Bearer\s+/i, "")
    : "";
}
export async function getAuthUser(req, client) {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    return error ? null : data?.user || null;
  } catch {
    return null;
  }
}
export async function readJson(client, path, fallback = null) {
  const { data, error } = await client.storage.from(BUCKET_NAME).download(path);
  if (error) {
    if (
      [404, "404", "NoSuchKey"].includes(error.statusCode) ||
      error.status === 404 ||
      error.code === "not_found"
    )
      return fallback;
    throw Object.assign(
      Error("Không đọc được dữ liệu đã lưu. Vui lòng thử lại."),
      { status: 503 },
    );
  }
  return data ? JSON.parse(await data.text()) : fallback;
}
export async function writeJson(client, path, content) {
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(path, JSON.stringify(content), {
      upsert: true,
      contentType: "application/json",
    });
  if (error)
    throw Object.assign(Error("Không lưu được dữ liệu. Vui lòng thử lại."), {
      status: 503,
    });
  return data;
}
export function apiError(res, error) {
  const status =
    error.status ||
    {
      42501: 403,
      23505: 409,
      40001: 409,
      22023: 400,
      "22P02": 400,
      23514: 400,
      P0001: 422,
      PGRST202: 503,
      "42P01": 503,
    }[error.code] ||
    500;
  return res
    .status(status)
    .json({
      error:
        status >= 500
          ? "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại."
          : error.message,
    });
}
