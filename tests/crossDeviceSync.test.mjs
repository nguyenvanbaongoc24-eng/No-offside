import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compressAndResizeAvatar, imageDataUrl } from "../src/lib/images.js";

test("version endpoint returns no-store and uncacheable headers", async () => {
  const versionHandler = (await import("../api/version.js")).default;
  const headers = {};
  let statusCode = 200;
  let responseData = null;

  const req = { method: "GET" };
  const res = {
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    end() {},
  };

  await versionHandler(req, res);
  assert.equal(statusCode, 200);
  assert.match(headers["cache-control"], /no-store/);
  assert.match(headers["cache-control"], /no-cache/);
  assert.equal(headers["pragma"], "no-cache");
  assert.ok(responseData.version);
});

test("vercel.json configures no-cache headers for /version.json, /sw.js, and /index.html", () => {
  const vercelConfig = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  assert.ok(Array.isArray(vercelConfig.headers), "vercel.json should have headers array");

  const versionRule = vercelConfig.headers.find((h) => h.source === "/version.json");
  assert.ok(versionRule, "Should have rule for /version.json");
  const versionCacheHeader = versionRule.headers.find((h) => h.key === "Cache-Control");
  assert.match(versionCacheHeader.value, /no-store/);
  assert.match(versionCacheHeader.value, /no-cache/);

  const swRule = vercelConfig.headers.find((h) => h.source.includes("sw"));
  assert.ok(swRule, "Should have rule for sw.js");
  const swCacheHeader = swRule.headers.find((h) => h.key === "Cache-Control");
  assert.match(swCacheHeader.value, /no-store/);

  const htmlRule = vercelConfig.headers.find((h) => h.source === "/index.html");
  assert.ok(htmlRule, "Should have rule for /index.html");
  const htmlCacheHeader = htmlRule.headers.find((h) => h.key === "Cache-Control");
  assert.match(htmlCacheHeader.value, /no-store/);
});

test("chat API rejects unauthenticated requests", async () => {
  const chatHandler = (await import("../api/chat.js")).default;
  let statusCode = 200;
  let responseData = null;

  const req = {
    method: "POST",
    headers: {},
    body: { teamId: "team-123", text: "Hello", clientMsgId: "msg-1" },
  };
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    end() {},
  };

  await chatHandler(req, res);
  assert.equal(statusCode, 401);
  assert.match(responseData.error, /hết hạn|không hợp lệ/i);
});

test("avatar API rejects unauthenticated upload requests", async () => {
  const avatarHandler = (await import("../api/avatar.js")).default;
  let statusCode = 200;
  let responseData = null;

  const req = {
    method: "POST",
    headers: {},
    body: { imageBase64: "dGVzdA==", mimeType: "image/webp" },
  };
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    end() {},
  };

  await avatarHandler(req, res);
  assert.equal(statusCode, 401);
  assert.match(responseData.error, /hết hạn|không hợp lệ/i);
});

test("client image processing validates format and size before uploading", async () => {
  await assert.rejects(
    async () => {
      await compressAndResizeAvatar({ type: "application/pdf", size: 100 });
    },
    /Chọn ảnh JPG, PNG hoặc WebP/
  );

  await assert.rejects(
    async () => {
      await compressAndResizeAvatar({ type: "image/png", size: 3 * 1024 * 1024 });
    },
    /nhỏ hơn 2 MB/
  );
});
