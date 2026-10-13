import test from "node:test";
import assert from "node:assert/strict";
import { imageMime, readQrImage } from "../src/lib/qrImage.js";
import { normalizeBanks, searchBanks } from "../src/lib/banks.js";
import {
  localTransactionTime,
  transactionInstant,
  editTransaction,
  transactionLabel,
} from "../src/lib/transactionTime.js";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

test("bank catalog only includes transferable supported BINs and searches Vietnamese without accents", () => {
  const banks = normalizeBanks([
    {
      bin: "970422",
      shortName: "MB",
      name: "Ngân hàng Quân Đội",
      code: "MBB",
      transferSupported: 1,
    },
    { bin: "970422", shortName: "duplicate", transferSupported: 1 },
    { bin: "970400", shortName: "unsupported", transferSupported: 0 },
    { bin: "invalid", transferSupported: 1 },
  ]);
  assert.equal(banks.length, 1);
  assert.equal(searchBanks(banks, "quan doi")[0].bin, "970422");
  assert.equal(searchBanks(banks, "mbb").length, 1);
  assert.equal(searchBanks(banks, "invalid").length, 0);
});
test("QR validation uses signatures, rejects disguised files and oversized files before decoding", async () => {
  assert.equal(
    imageMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(imageMime(new Uint8Array([255, 216, 255])), "image/jpeg");
  assert.equal(
    imageMime(new TextEncoder().encode("RIFFxxxxWEBP")),
    "image/webp",
  );
  assert.equal(imageMime(new TextEncoder().encode("<svg onload")), "");
  await assert.rejects(readQrImage({ size: 2000000 }), /1 MB/);
  await assert.rejects(
    readQrImage({
      size: 200,
      type: "image/png",
      slice: () => ({
        arrayBuffer: async () =>
          new TextEncoder().encode("invalid image").buffer,
      }),
    }),
    /Nội dung tệp/,
  );
});
test("transaction time round-trips team timezone and rejects DST gap without shifting the day", () => {
  const at = "2026-10-12T18:05:00.000Z";
  assert.equal(
    localTransactionTime(at, "Asia/Ho_Chi_Minh"),
    "2026-10-13T01:05",
  );
  assert.equal(transactionInstant("2026-10-13T01:05", "Asia/Ho_Chi_Minh"), at);
  assert.equal(
    transactionInstant("2026-10-13T00:15", "Asia/Tokyo"),
    "2026-10-12T15:15:00.000Z",
  );
  assert.throws(
    () => transactionInstant("2026-03-08T02:30", "America/New_York"),
    /không tồn tại/,
  );
  assert.throws(() => transactionInstant("2026-02-30T12:00"), /không hợp lệ/);
});
test("legacy transaction edits preserve unknown hours, original creation and append adjustment snapshots", () => {
  const original = {
    id: "old",
    title: "Tiền sân",
    amount: 100000,
    type: "expense",
    date: "12/10/2026",
    createdAt: "2026-10-12T00:00Z",
    adjustments: [{ at: "prior" }],
  };
  const next = editTransaction(
    original,
    { amount: 120000 },
    "",
    "Asia/Ho_Chi_Minh",
    "owner",
    "2026-10-13T00:00Z",
  );
  assert.equal(next.occurredAt, undefined);
  assert.equal(next.date, original.date);
  assert.equal(next.createdAt, original.createdAt);
  assert.equal(next.adjustments.length, 2);
  assert.equal(next.adjustments[1].before.amount, 100000);
  assert.equal(next.adjustments[1].after.amount, 120000);
  assert.match(transactionLabel(next), /chưa có giờ/);
  assert.equal(original.adjustments.length, 1);
});

const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: "jsx",
    contents: `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Profile from './src/pages/ProfileMenu.jsx'; export const render=props=>renderToStaticMarkup(<Profile {...props}/>);`,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
});
const compiled = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(
  createRequire(import.meta.url),
  compiled,
  compiled.exports,
);
test("Personal menu keeps forms closed and hides management for member and teamless users", () => {
  const props = {
    user: { name: "Cầu thủ", number: 9, avatar: "avatar" },
    currentUserRole: "member",
    teamSettings: { teamName: "FC" },
    hasTeam: true,
    onNavigate: () => {},
    appearancePanel: "appearance",
    accountPanel: "account",
  };
  const member = compiled.exports.render(props);
  assert.match(member, /Sửa hồ sơ/);
  assert.match(member, /Giao diện/);
  assert.match(member, /Chuyển tài khoản/);
  assert.match(member, /Đăng xuất/);
  assert.doesNotMatch(member, /<form|Phân quyền|Yêu cầu chờ duyệt|Cài đặt đội/);
  const owner = compiled.exports.render({ ...props, currentUserRole: "owner" });
  assert.match(owner, /Phân quyền/);
  assert.match(owner, /Cài đặt đội/);
  const teamless = compiled.exports.render({ ...props, hasTeam: false });
  assert.doesNotMatch(teamless, /Nội quy|Thành viên|Phân quyền/);
});
