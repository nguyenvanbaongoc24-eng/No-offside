import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Render real components without browser APIs; this does not emulate mobile layout.
const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: "jsx",
    contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import Fund from './src/pages/FundManagement.jsx';
    import PersonalFund from './src/pages/PersonalFund.jsx';
    import MatchForm from './src/components/MatchFormSheet.jsx';
    import EmptyTeam from './src/pages/EmptyTeam.jsx';
    import Governance from './src/pages/Governance.jsx';
    import AppearanceSettings from './src/components/AppearanceSettings.jsx';
    import SwipeMatchCard from './src/components/SwipeMatchCard.jsx';
    import TeamManager from './src/pages/TeamManager.jsx';
    import Login from './src/pages/Login.jsx';
    import Dashboard from './src/pages/PlayerDashboard.jsx';
    import MyAttendance from './src/components/MyAttendanceControl.jsx';
    import Countdown from './src/components/MatchCountdown.jsx';
    export const render = (name, props) => renderToStaticMarkup(React.createElement({Fund,PersonalFund,MatchForm,EmptyTeam,Governance,AppearanceSettings,SwipeMatchCard,TeamManager,Login,Dashboard,MyAttendance,Countdown}[name],props));
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

test("expired countdown closes explicitly; completed attendance remains read-only", () => {
  assert.match(render("Countdown", {deadline:"2020-01-01T00:00:00Z", sentence:true}), /Đã chốt điểm danh/);
  const html = render("MyAttendance", {status:"attending", deadline:"2099-01-01T00:00:00Z", completed:true, onChange:noop});
  assert.equal((html.match(/disabled=""/g)||[]).length, 3);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length, 1);
});

test("owner has personal attendance; completed match hides countdown and keeps eligible roster snapshot", () => {
  const owner={id:"owner",name:"Chủ đội",number:1,stats:{matches:0,goals:0,assists:0}};
  const match={id:"m",title:"Trận đã xong",datetime:"2026-01-01T12:00:00Z",deadline:"2026-01-01T10:00:00Z",status:"completed",eligibleMembers:[owner,{id:"historical",name:"Thành viên cũ",number:19}]};
  const html=render("Dashboard", {user:owner,currentUserRole:"owner",teamSettings:{teamName:"Đội",members:[owner],appearance:{}},members:[owner],activeMatch:match,matches:[match],attendance:{owner:"attending"},reports:{},funds:{transactions:[],pendingApprovals:[],debtors:[]},balance:0});
  assert.match(html, /Điểm danh của bạn/);
  assert.doesNotMatch(html, /Hạn chốt điểm danh|Còn .*để chốt/);
  assert.match(html, /title="Có mặt \(1\)"/);
  assert.match(html, /title="Chưa điểm danh \(1\)"/);
  assert.match(html, /2 người/);
});

test("fund overview shows each amount once and retains the full ledger totals", () => {
  const html = render("Fund", {
    funds: {
      transactions: [
        { id: 1, title: "Thu", amount: 100000, type: "income" },
        { id: 2, title: "Chi", amount: 20000, type: "expense" },
      ],
      pendingApprovals: [],
      debtors: [],
    },
    onChangeFunds: noop,
    onApprove: noop,
    currentUserRole: "owner",
    treasurerQr: {},
  });
  assert.equal((html.match(/80\.000 đ/g) || []).length, 1);
  assert.equal((html.match(/100\.000 đ/g) || []).length, 2); // Summary + its transaction.
  assert.match(html, /Xuất báo cáo/);
  assert.match(html, /Thêm giao dịch/);
});

test("member fund screen exposes payment status without management actions", () => {
  const html = render("PersonalFund", {
    user: {
      id: "member",
      name: "Member",
      number: 9,
      fundDebt: 150000,
      fundPaymentPending: true,
    },
    treasurerQr: {
      bankCode: "970422",
      accountNumber: "123456789",
      accountHolder: "Captain",
    },
    onMarkPaid: noop,
  });
  assert.match(html, /Đang chờ duyệt/);
  assert.doesNotMatch(html, /Xuất Excel|Sửa giao dịch|Thêm giao dịch/);
  assert.match(html, /disabled=""/);
});

test("match sheet connects every label and separates match information from attendance", () => {
  const html = render("MatchForm", {
    draft: {
      opponent: "",
      venue: "",
      datetime: "",
      timeoutDatetime: "",
      penaltyEnabled: true,
      penaltyFine: 50000,
    },
    onChange: noop,
    onSubmit: noop,
    onClose: noop,
  });
  const allIds = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const ids = new Set(allIds);
  assert.equal(ids.size, allIds.length, "Each field must have a unique id");
  for (const [, id] of html.matchAll(/for="([^"]+)"/g)) assert.ok(ids.has(id));
  assert.equal((html.match(/type="datetime-local"/g) || []).length, 2);
  assert.match(html, /Thông tin trận/);
  assert.match(html, /Điểm danh/);
  assert.match(html, /Chọn ngày và giờ trên thiết bị/);
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
});

test("empty home keeps the long form closed and hides creation for members", () => {
  const props = {
    teamSettings: { teamName: "FC Test", venue: "Sân test" },
    onSaveMatch: noop,
    onNavigate: noop,
  };
  const owner = render("EmptyTeam", { ...props, leader: true });
  const member = render("EmptyTeam", { ...props, leader: false });
  assert.doesNotMatch(owner, /<form/);
  assert.match(owner, /Tạo trận/);
  assert.match(owner, /Thêm thành viên/);
  assert.match(owner, /Mời vào đội bóng/);
  assert.match(owner, /Mã QR/);
  assert.doesNotMatch(member, /Tạo trận/);
  assert.doesNotMatch(member, /Thêm thành viên/);
  assert.match(member, /Chưa có trận sắp tới/);
  assert.match(member, /Mời vào đội bóng/);
});

test("TeamManager renders member list, filter buttons, and role badges without returning null", () => {
  const members = [
    { id: "1", name: "Nguyễn Văn Toàn", number: 9, role: "Tiền Đạo", roleType: "owner" },
    { id: "2", name: "Quang Hải", number: 19, role: "Tiền Vệ", roleType: "member" },
  ];
  const html = render("TeamManager", {
    isOpen: true,
    members,
    currentUserRole: "owner",
    onClose: noop,
  });
  assert.match(html, /Thành viên đội/);
  assert.match(html, /Nguyễn Văn Toàn/);
  assert.match(html, /Quang Hải/);
  assert.match(html, /Chủ đội/);
  assert.match(html, /Cầu thủ/);
  assert.match(html, /Tất cả \(2\)/);
});

test("governance views use verified server role and gate all actions when backend is absent", () => {
  const snapshot = {
    me: { role: "member", status: "active", user_id: "u" },
    team: {
      timezone: "Asia/Ho_Chi_Minh",
      policy: {
        period: "month",
        threshold: 3,
        types: ["late"],
        mode: "review",
        action: "warning",
      },
    },
    rules: [],
    events: [],
    members: [],
    matches: [],
    periodStart: "2026-09-30T17:00Z",
    periodEnd: "2026-10-31T17:00Z",
  };
  const html = render("Governance", {
    governance: { snapshot, loading: false, refresh: noop },
    onBack: noop,
  });
  assert.doesNotMatch(
    html,
    /Sửa nội quy|Xác nhận giờ đến|Duyệt xử lý|Xử lý thành viên/,
  );
  const gated = render("Governance", {
    governance: {
      snapshot: null,
      loading: false,
      error: "Team not provisioned",
      refresh: noop,
    },
    onBack: noop,
  });
  assert.match(gated, /Chưa kết nối nghiệp vụ/);
  assert.doesNotMatch(gated, /<form/);
});
test("personal appearance has immediate controls and no Save button", () => {
  const html = render("AppearanceSettings", {
    preferences: {
      value: { theme: "dark", fontFamily: "system" },
      update: noop,
      error: "",
    },
  });
  assert.match(html, /Tự lưu|tự lưu/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /Lưu cài đặt|type="submit"/);
});
test("large match card starts with hidden swipe action and has accessible menu alternative", () => {
  const html = render("SwipeMatchCard", {
    match: { id: "m", title: "Large match" },
    canDelete: true,
    onDelete: noop,
    children: "Content",
  });
  assert.match(html, /Thao tác trận đấu/);
  assert.match(html, /tabindex="-1" aria-hidden="true"/);
  assert.doesNotMatch(html, /role="dialog"/);
});

test("login screen renders Google OAuth button and omits SMS and email OTP fields", () => {
  const html = render("Login", { onLoginSuccess: noop });
  assert.match(html, /Tiếp tục với Google/);
  assert.doesNotMatch(html, /Trải nghiệm với dữ liệu mẫu/);
  assert.match(html, /Đăng nhập/);
  assert.match(html, /Tạo tài khoản/);
  assert.doesNotMatch(html, /Gửi mã đăng nhập/);
  assert.doesNotMatch(html, /autoComplete="one-time-code"/);
});
