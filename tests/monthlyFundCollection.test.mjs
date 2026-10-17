import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  getMonthFundSummary,
  getMembersMonthStatus,
  getMemberMonthHistory,
} from "../src/lib/fundCollections.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: "jsx",
    contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import MonthlyFundCollection from './src/components/MonthlyFundCollection.jsx';
    import FundManagement from './src/pages/FundManagement.jsx';
    export const render = (name, props) => renderToStaticMarkup(React.createElement({MonthlyFundCollection, FundManagement}[name], props));
  `,
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
const { render } = compiled.exports;
const noop = () => {};

test("getMonthFundSummary: properly computes 4 metrics when collection exists", () => {
  const collections = [
    { id: "col-10", period: "2026-10", title: "Quỹ tháng 10/2026", status: "open", due_date: "2026-10-15" },
  ];
  const charges = [
    { id: "ch-1", collection_id: "col-10", subject: "user-1", amount: 100000, paid_amount: 100000, kind: "fund", status: "paid" },
    { id: "ch-2", collection_id: "col-10", subject: "user-2", amount: 100000, paid_amount: 40000, kind: "fund", status: "owed" },
    { id: "ch-3", collection_id: "col-10", subject: "user-3", amount: 100000, paid_amount: 0, kind: "fund", status: "owed" },
  ];
  const pendingRequests = [
    { id: "req-1", chargeId: "ch-3", playerId: "user-3", amount: 100000, status: "pending" },
  ];

  const summary = getMonthFundSummary("2026-10", collections, charges, pendingRequests, []);
  assert.equal(summary.hasCollection, true);
  assert.equal(summary.totalRequired, 300000); // 3 people x 100k
  assert.equal(summary.totalPaid, 140000);     // 100k + 40k
  assert.equal(summary.totalPending, 100000);  // 100k pending for user-3
  assert.equal(summary.totalRemaining, 160000);// 60k (user-2) + 100k (user-3)
  assert.equal(summary.paidCount, 1);
  assert.equal(summary.partialCount, 1);
  assert.equal(summary.unpaidCount, 1);
});

test("FC 21 scenario: unlinked income exists but no collection created -> warns and flags unlinked income", () => {
  const collections = []; // Mục đợt thu bằng 0
  const charges = [];
  const transactions = [
    { id: "tx-1", title: "Tiền Quỹ Tháng 10", amount: 200000, type: "income", date: "2026-10-05" },
  ];

  const summary = getMonthFundSummary("2026-10", collections, charges, [], transactions);
  assert.equal(summary.hasCollection, false);
  assert.equal(summary.totalRequired, null); // Chưa tạo nghĩa vụ
  assert.equal(summary.totalRemaining, 0);
  assert.equal(summary.unlinkedTransactions.length, 1);
  assert.equal(summary.unlinkedIncomeTotal, 200000);
});

test("getMemberMonthHistory identifies backpay (paying Sep dues in Oct)", () => {
  const collections = [
    { id: "col-09", period: "2026-09", title: "Quỹ tháng 9/2026", status: "open", due_date: "2026-09-15" },
    { id: "col-10", period: "2026-10", title: "Quỹ tháng 10/2026", status: "open", due_date: "2026-10-15" },
  ];
  const charges = [
    { id: "ch-sep", collection_id: "col-09", subject: "user-1", amount: 100000, paid_amount: 100000, kind: "fund", status: "paid" },
    { id: "ch-oct", collection_id: "col-10", subject: "user-1", amount: 100000, paid_amount: 0, kind: "fund", status: "owed" },
  ];
  const transactions = [
    // Paid Sep dues on October 5th
    { id: "tx-backpay", chargeId: "ch-sep", title: "Nộp bù quỹ T9", amount: 100000, type: "income", occurredAt: "2026-10-05T09:00:00Z" },
  ];

  const history = getMemberMonthHistory("user-1", collections, charges, transactions, []);
  assert.equal(history.length, 2);

  const sepRecord = history.find((h) => h.period === "2026-09");
  assert.ok(sepRecord);
  assert.equal(sepRecord.isBackpay, true);
  assert.equal(sepRecord.backpayMonth, "2026-10");
  assert.equal(sepRecord.status, "paid");

  const octRecord = history.find((h) => h.period === "2026-10");
  assert.ok(octRecord);
  assert.equal(octRecord.isBackpay, false);
  assert.equal(octRecord.status, "unpaid");
});

test("MonthlyFundCollection renders overview, member list, and warning when collection is absent", () => {
  const teamMembers = [
    { id: "m-1", name: "Nguyễn Văn A", number: 7, role: "owner" },
    { id: "m-2", name: "Trần Văn B", number: 10, role: "member" },
  ];
  const htmlWithoutCollection = render("MonthlyFundCollection", {
    fund: { data: { collections: [], charges: [], pendingRequests: [] } },
    funds: {
      transactions: [{ id: "tx-fc21", title: "Tiền Quỹ Tháng 10", amount: 200000, type: "income", date: "2026-10-02" }],
      pendingApprovals: [],
    },
    teamMembers,
    canManage: true,
  });

  // Verify warning banner and FC 21 detection
  assert.match(htmlWithoutCollection, /Chưa tạo nghĩa vụ thu/);
  assert.match(htmlWithoutCollection, /200\.000 đ/);
  assert.match(htmlWithoutCollection, /Tạo đợt thu/);
  assert.match(htmlWithoutCollection, /Nguyễn Văn A/);
  assert.match(htmlWithoutCollection, /Trần Văn B/);
});
