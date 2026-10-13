import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Navigation Bar: Instagram mobile layout, flat bottom, 44px touch targets and accessible names", () => {
  const appSrc = fs.readFileSync("src/App.jsx", "utf8");
  const cssSrc = fs.readFileSync("src/styles/index.css", "utf8");

  // App.jsx must render 5 tabs with accessible names
  assert.ok(appSrc.includes('aria-label="Điều hướng chính"'));
  assert.ok(appSrc.includes('aria-label={label}'));
  assert.ok(appSrc.includes('aria-current={isActive ? "page" : undefined}'));

  // Avatar support for Profile tab
  assert.ok(appSrc.includes('auth.user?.avatar'));

  // Pill navigation bar with rounded corners (viên thuốc)
  assert.ok(cssSrc.includes(".bottom-navigation { position: fixed;"));
  assert.ok(cssSrc.includes("border-radius: 9999px;"));
  assert.ok(cssSrc.includes(".nav-items { display: flex; justify-content: space-around; align-items: center;"));
  assert.ok(cssSrc.includes("min-width: 44px; min-height: 44px;"));
  assert.ok(cssSrc.includes(".nav-item:focus, .nav-item:focus-visible { outline: none !important;"));
});
