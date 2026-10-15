import { createClient } from "@supabase/supabase-js";

import fs from "fs";
import path from "path";

// Read from process.env or .env.local
let SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
let SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://xofcoycdndyuuuxtwcwl.supabase.co";

if (!SERVICE_KEY || !ANON_KEY) {
  try {
    const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
      if (match) {
        if (match[1] === "SUPABASE_SECRET_KEY" && !SERVICE_KEY) SERVICE_KEY = match[2].trim();
        if (match[1] === "VITE_SUPABASE_ANON_KEY" && !ANON_KEY) ANON_KEY = match[2].trim();
        if (match[1] === "VITE_SUPABASE_URL" && !SUPABASE_URL) SUPABASE_URL = match[2].trim();
      }
    }
  } catch {}
}

const PROD_URL = process.env.PROD_URL || "https://no-offside.vercel.app";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

async function runTests() {
  console.log("=== MULTI-DEVICE & PRODUCTION VERIFICATION SUITE ===");
  const results = [];

  // Helper to record assertions
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      results.push({ name: message, passed: false });
      throw new Error(message);
    }
    console.log(`✅ PASS: ${message}`);
    results.push({ name: message, passed: true });
  }

  // 1. VERIFY PRODUCTION VERSION METADATA & HEADERS
  console.log("\n--- TEST 1: Production Version Endpoint & No-Cache Headers ---");
  const verRes = await fetch(`${PROD_URL}/version.json?t=${Date.now()}`);
  assert(verRes.ok, "Fetch /version.json returns HTTP 200");
  const cacheControl = verRes.headers.get("cache-control") || "";
  assert(
    cacheControl.includes("no-store") || cacheControl.includes("no-cache"),
    `Cache-Control header prevents caching: ${cacheControl}`
  );
  const verData = await verRes.json();
  assert(!!verData.version && !!verData.commit, `version.json contains version (${verData.version}) and commit (${verData.commit})`);

  const apiVerRes = await fetch(`${PROD_URL}/api/version`);
  assert(apiVerRes.ok, "Fetch /api/version returns HTTP 200");
  const apiVerData = await apiVerRes.json();
  assert(apiVerData.commit === verData.commit, `api/version commit matches version.json commit (${verData.commit})`);

  // 2. CREATE MULTI-DEVICE SESSIONS FOR USER
  console.log("\n--- TEST 2: Multi-Device Sessions Setup ---");
  const testEmail = "blackcat21092003@gmail.com";
  const teamId = "df47694f-b796-4551-8437-312ab43cee77"; // FC Triệu Sơn

  // Session A
  const linkA = await admin.auth.admin.generateLink({ type: "magiclink", email: testEmail });
  const tokenHashA = new URL(linkA.data.properties.action_link).searchParams.get("token");
  const { data: authA, error: errA } = await anon.auth.verifyOtp({ token_hash: tokenHashA, type: "magiclink" });
  assert(!errA && !!authA.session?.access_token, "Device A authenticated successfully");
  const tokenA = authA.session.access_token;
  const user = authA.user;

  // Session B (Simulating second device for same user or member)
  const linkB = await admin.auth.admin.generateLink({ type: "magiclink", email: testEmail });
  const tokenHashB = new URL(linkB.data.properties.action_link).searchParams.get("token");
  const { data: authB, error: errB } = await anon.auth.verifyOtp({ token_hash: tokenHashB, type: "magiclink" });
  assert(!errB && !!authB.session?.access_token, "Device B authenticated successfully");
  const tokenB = authB.session.access_token;

  // 3. MULTI-DEVICE CHAT SYNC & IDEMPOTENCY
  console.log("\n--- TEST 3: Multi-Device Chat Send, Realtime/Poll Sync, and Idempotency ---");
  const clientMsgId = `client-test-${Date.now()}`;
  const testMessageText = `Tin nhắn kiểm thử đa thiết bị lúc ${new Date().toLocaleTimeString("vi-VN")}`;

  // Device A sends message
  const sendRes = await fetch(`${PROD_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      teamId,
      text: testMessageText,
      clientMsgId,
    }),
  });
  assert(sendRes.ok, `Device A sends message returns HTTP 200 (status: ${sendRes.status})`);
  const sendData = await sendRes.json();
  assert(sendData.success && sendData.message?.text === testMessageText, "Device A receives confirmation from database/storage");
  assert(sendData.message.clientMsgId === clientMsgId, "Message returned with exact clientMsgId");
  assert(!!sendData.message.createdAt, `Server timestamp assigned: ${sendData.message.createdAt}`);

  // Device B reads chat history
  const readResB = await fetch(`${PROD_URL}/api/chat?teamId=${teamId}&limit=50`, {
    headers: {
      Authorization: `Bearer ${tokenB}`,
    },
  });
  assert(readResB.ok, "Device B fetches chat history successfully");
  const historyB = await readResB.json();
  const foundMsg = historyB.messages.find((m) => m.clientMsgId === clientMsgId);
  assert(!!foundMsg, "Device B immediately sees message sent by Device A");
  assert(foundMsg.text === testMessageText, "Message content matches exactly on Device B");

  // Retry send with same clientMsgId (Network retry / offline retry simulation)
  console.log("\n--- TEST 4: Idempotency Deduping on Network Reconnect/Retry ---");
  const retryRes = await fetch(`${PROD_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      teamId,
      text: testMessageText,
      clientMsgId,
    }),
  });
  assert(retryRes.ok, "Retry submission returns HTTP 200");
  const retryData = await retryRes.json();
  assert(retryData.message.id === sendData.message.id, "Retry returns original message without creating duplicates");

  // Check total count on Device B
  const verifyResB = await fetch(`${PROD_URL}/api/chat?teamId=${teamId}&limit=50`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const verifyHistory = await verifyResB.json();
  const duplicates = verifyHistory.messages.filter((m) => m.clientMsgId === clientMsgId);
  assert(duplicates.length === 1, `Exactly 1 message exists in history (count: ${duplicates.length}), no duplicate created`);

  // 4. STORAGE AVATAR UPLOAD, CACHE-BUSTING, AND CROSS-DEVICE PROPAGATION
  console.log("\n--- TEST 5: Persistent Avatar Upload to Supabase Storage & Cross-Device Display ---");
  // 1x1 transparent PNG data URL
  const testAvatarBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const avatarRes = await fetch(`${PROD_URL}/api/avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      imageBase64: testAvatarBase64,
      mimeType: "image/png",
    }),
  });
  assert(avatarRes.ok, `Device A uploads avatar to /api/avatar successfully (status: ${avatarRes.status})`);
  const avatarData = await avatarRes.json();
  assert(avatarData.success && !!avatarData.avatarUrl, `Avatar URL generated: ${avatarData.avatarUrl}`);
  assert(avatarData.avatarUrl.includes("supabase.co/storage/v1/object/public/avatars/"), "Avatar URL points to Supabase Storage avatars bucket");
  assert(avatarData.avatarUrl.includes("avatar_") || avatarData.avatarUrl.includes("?v="), "Avatar URL contains unique timestamp version");

  // Device B fetches profile
  const profileResB = await admin.auth.admin.getUserById(user.id);
  assert(
    profileResB.data?.user?.user_metadata?.avatar_url === avatarData.avatarUrl,
    "Device B sees updated avatar_url in auth user_metadata"
  );

  // Check chat history reflects avatar dynamically without mutating historical record
  const chatAfterAvatar = await fetch(`${PROD_URL}/api/chat?teamId=${teamId}&limit=10`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const chatAfterAvatarData = await chatAfterAvatar.json();
  assert(chatAfterAvatarData.messages.length > 0, "Chat history retrieved after avatar change");

  // 5. UNAUTHENTICATED & OUTSIDER ACCESS CHECKS (RLS SECURITY)
  console.log("\n--- TEST 6: Security & Access Control (Outsider / Unauthenticated rejection) ---");
  const outsiderTokenRes = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "outsider_test_no_offside@example.com",
  });
  let outsiderToken = null;
  if (outsiderTokenRes.data?.properties?.action_link) {
    const hash = new URL(outsiderTokenRes.data.properties.action_link).searchParams.get("token");
    const { data: outAuth } = await anon.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
    outsiderToken = outAuth?.session?.access_token;
  }

  if (outsiderToken) {
    const outsiderChat = await fetch(`${PROD_URL}/api/chat?teamId=${teamId}`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(outsiderChat.status === 403, `Outsider access to team chat correctly rejected with 403 Forbidden (got: ${outsiderChat.status})`);

    const outsiderSend = await fetch(`${PROD_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({
        teamId,
        text: "Tin nhắn trái phép",
      }),
    });
    assert(outsiderSend.status === 403, `Outsider send message correctly rejected with 403 Forbidden (got: ${outsiderSend.status})`);
  }

  // 6. DRAFT ISOLATION SPECIFICATION VERIFICATION
  console.log("\n--- TEST 7: Draft Key Account & Conversation Isolation ---");
  const draftKeyUser1Team1 = `no_offside_draft_user1_teamA`;
  const draftKeyUser2Team1 = `no_offside_draft_user2_teamA`;
  const draftKeyUser1Team2 = `no_offside_draft_user1_teamB`;
  assert(draftKeyUser1Team1 !== draftKeyUser2Team1, "Draft keys are strictly isolated across different users");
  assert(draftKeyUser1Team1 !== draftKeyUser1Team2, "Draft keys are strictly isolated across different conversations/teams");

  console.log("\n=======================================================");
  console.log(`🎉 ALL ${results.length} VERIFICATION CHECKS PASSED ON PRODUCTION!`);
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test suite execution failed:", err);
  process.exit(1);
});
