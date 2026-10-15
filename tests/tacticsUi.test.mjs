import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Tactics UI: title, buttons, badges, and preservation of player coordinates", () => {
  const tacticsSrc = fs.readFileSync("src/pages/LineupBuilder.jsx", "utf8");

  // Title follows the current Sa bàn navigation
  assert.ok(tacticsSrc.includes("<h1>Sa bàn</h1>"), "Must have <h1>Sa bàn</h1>");

  // Buttons: Tạo sơ đồ, Lưu sơ đồ
  assert.ok(tacticsSrc.includes("Tạo sơ đồ"), "Must have Tạo sơ đồ button");
  assert.ok(tacticsSrc.includes("Lưu sơ đồ") || tacticsSrc.includes("Lưu"), "Must have Lưu button");

  // Status badges: Đang chọn and Đang sử dụng
  assert.ok(tacticsSrc.includes("Đang chọn"), "Must have Đang chọn badge");
  assert.ok(tacticsSrc.includes("Đang sử dụng"), "Must have Đang sử dụng badge");

  // Must not have decorative emojis
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const hasEmoji = emojiRegex.test(tacticsSrc);
  assert.equal(hasEmoji, false, "Must not have decorative emojis");

  // Player coordinates intact
  assert.ok(tacticsSrc.includes('top: "88%"'), "Must keep Văn Lâm coordinates");
  assert.ok(tacticsSrc.includes('left: "50%"'), "Must keep field center coordinate");
  assert.ok(tacticsSrc.includes("dragConstraints"), "Must keep drag constraints");
});
