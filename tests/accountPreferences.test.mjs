import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url),
  root = fileURLToPath(new URL("../", import.meta.url));
const bundle = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: "js",
    contents: `export {useAuth} from './src/hooks/useAuth.js'; export {usePersonalAppearance} from './src/hooks/usePersonalAppearance.js';`,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  external: ["react"],
  plugins: [
    {
      name: "auth-fixture",
      setup(b) {
        b.onResolve({ filter: /lib\/supabase$/ }, () => ({
          path: "auth-fixture",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: "export const supabase=globalThis.__authFixture;",
          loader: "js",
        }));
      },
    },
  ],
});
let callback,
  session,
  userCheck,
  signoutScopes = [],
  unsubscribed = 0;
const storage = new Map();
let denyStorage = false;
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => {
    if (denyStorage) throw new Error("Quota exceeded");
    storage.set(k, v);
  },
  removeItem: (k) => storage.delete(k),
};
globalThis.sessionStorage = { removeItem: () => {} };
globalThis.window = new EventTarget();
globalThis.CustomEvent = class extends Event {
  constructor(type, options = {}) {
    super(type);
    this.detail = options.detail;
  }
};
globalThis.__authFixture = {
  auth: {
    getSession: async () => ({ data: { session } }),
    getUser: () => userCheck(),
    onAuthStateChange: (cb) => {
      callback = cb;
      return { data: { subscription: { unsubscribe: () => unsubscribed++ } } };
    },
    signOut: async (options) => {
      signoutScopes.push(options.scope);
      callback("SIGNED_OUT", null);
      return { error: null };
    },
  },
};
const compiled = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  require,
  compiled,
  compiled.exports,
);
const { useAuth, usePersonalAppearance } = compiled.exports;
const tick = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
function put(k, v) {
  storage.set(k, JSON.stringify(v));
}
function workspace(id, name) {
  return {
    user: {
      id,
      name,
      number: 9,
      stats: { matches: 0, goals: 0, assists: 0 },
      fundDebt: 0,
    },
    teamSettings: {
      id: "same-team",
      members: [{ id, name, roleType: "member" }],
      appearance: {},
      pendingAdminRequests: [],
      subAdmins: [],
    },
  };
}

test("account transition hides previous data until verified; same-team funds restore per account and subscriptions clean up", async () => {
  storage.clear();
  signoutScopes = [];
  put("no_offside_user", workspace("a", "Alice").user);
  put("no_offside_team_settings", workspace("a", "Alice").teamSettings);
  put("no_offside_workspace_a", workspace("a", "Alice"));
  put("no_offside_workspace_b", workspace("b", "Bob"));
  put("no_offside_teams_v1", {
    "a::same-team": {
      funds: {
        transactions: [{ id: "private-a", type: "income", amount: 123 }],
        pendingApprovals: [],
        debtors: [],
      },
      matches: [],
      attendance: {},
      reports: {},
      notices: [],
    },
    "b::same-team": {
      funds: {
        transactions: [{ id: "private-b", type: "income", amount: 456 }],
        pendingApprovals: [],
        debtors: [],
      },
      matches: [],
      attendance: {},
      reports: {},
      notices: [],
    },
  });
  session = { user: { id: "a", user_metadata: {} } };
  userCheck = async () => ({ data: { user: session.user }, error: null });
  let value;
  const frames = [];
  function Harness() {
    value = useAuth();
    frames.push({
      account: value.accountId,
      loading: value.authLoading,
      user: value.user.id,
      tx: value.funds.transactions.map((t) => t.id),
    });
    return React.createElement(
      "div",
      {},
      value.authLoading
        ? "loading"
        : value.isLoggedIn
          ? value.user.name
          : "login",
    );
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();
  assert.equal(tree.toJSON().children[0], "Alice");
  assert.equal(value.balance, 123);
  let resolve;
  userCheck = () =>
    new Promise((r) => {
      resolve = r;
    });
  session = { user: { id: "b", user_metadata: {} } };
  await act(async () => {
    callback("SIGNED_IN", session);
  });
  assert.equal(tree.toJSON().children[0], "loading");
  assert.ok(
    frames
      .filter((f) => f.account === "b" && !f.loading)
      .every((f) => f.user === "b" && !f.tx.includes("private-a")),
  );
  await act(async () => {
    resolve({ data: { user: session.user }, error: null });
  });
  await tick();
  assert.equal(tree.toJSON().children[0], "Bob");
  assert.equal(value.balance, 456);
  await act(async () => {
    await value.logout();
  });
  assert.equal(tree.toJSON().children[0], "login");
  assert.deepEqual(signoutScopes, ["local"]);
  await act(async () => tree.unmount());
  assert.equal(unsubscribed, 1);
});
test("expired or unverifiable auth session returns to login instead of exposing cached team", async () => {
  storage.clear();
  session = { user: { id: "expired", user_metadata: {} } };
  userCheck = async () => ({
    data: { user: null },
    error: new Error("Expired"),
  });
  let value;
  function Harness() {
    value = useAuth();
    return React.createElement(
      "div",
      {},
      value.authLoading ? "loading" : value.isLoggedIn ? "private" : "login",
    );
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();
  assert.equal(tree.toJSON().children[0], "login");
  assert.equal(value.isLoggedIn, false);
  await act(async () => tree.unmount());
});
test("personal preferences save immediately, survive remount, isolate accounts and roll back on quota failure", async () => {
  storage.clear();
  denyStorage = false;
  let value;
  function Harness({ account }) {
    value = usePersonalAppearance(account);
    return React.createElement("div", {}, value.value.theme);
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness, { account: "a" }));
  });
  await act(async () => value.update({ theme: "dark" }));
  assert.equal(
    JSON.parse(storage.get("no_offside_appearance_a")).theme,
    "dark",
  );
  denyStorage = true;
  await act(async () => value.update({ theme: "light" }));
  assert.equal(value.value.theme, "dark");
  assert.match(value.error, /Không lưu/);
  denyStorage = false;
  await act(async () =>
    tree.update(React.createElement(Harness, { account: "b" })),
  );
  assert.equal(value.value.theme, "system");
  await act(async () => tree.unmount());
  await act(async () => {
    tree = renderer.create(React.createElement(Harness, { account: "a" }));
  });
  assert.equal(value.value.theme, "dark");
  await act(async () => tree.unmount());
});

test("demo team identity is stable from first login through reload", async () => {
  storage.clear();
  session = null;
  userCheck = async () => ({ data: { user: null }, error: null });
  let value;
  function Harness() {
    value = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await act(async () => value.login({ demo: true }));
  const before = value.teamSettings.id;
  assert.equal(before, "fc-no-offside-99");
  await act(async () => tree.unmount());
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  assert.equal(value.teamSettings.id, before);
  await act(async () => tree.unmount());
});

test("a genuine auth session takes priority over a remembered demo session", async () => {
  storage.clear();
  put("no_offside_demo_session", true);
  session = { user: { id: "real", user_metadata: {} } };
  userCheck = async () => ({ data: { user: session.user }, error: null });
  let value;
  function Harness() {
    value = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();
  assert.equal(value.demoSession, false);
  assert.equal(value.user.id, "real");
  assert.equal(value.authLoading, false);
  await act(async () => tree.unmount());
});
test("an unscoped legacy ledger with unknown ownership is never imported into another account", async () => {
  storage.clear();
  const saved = workspace("b", "Bob");
  saved.teamSettings.ownerId = "a";
  put("no_offside_user", saved.user);
  put("no_offside_team_settings", saved.teamSettings);
  put("no_offside_workspace_b", saved);
  put("no_offside_teams_v1", {
    "same-team": {
      funds: {
        transactions: [{ id: "private-a", amount: 999999, type: "income" }],
        pendingApprovals: [],
        debtors: [],
      },
      matches: [],
      attendance: {},
      reports: {},
      notices: [],
    },
  });
  session = { user: { id: "b", user_metadata: {} } };
  userCheck = async () => ({ data: { user: session.user }, error: null });
  let value;
  function Harness() {
    value = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();
  assert.equal(value.balance, 0);
  assert.equal(value.funds.transactions.length, 0);
  await act(async () => tree.unmount());
});

test("a late completion from another account cannot expose or replay its undo snapshot", async () => {
  storage.clear();
  const a = workspace("a", "Alice"),
    b = workspace("b", "Bob");
  a.teamSettings.members[0].roleType = "owner";
  b.teamSettings.members[0].roleType = "owner";
  put("no_offside_user", a.user);
  put("no_offside_team_settings", a.teamSettings);
  put("no_offside_workspace_a", a);
  put("no_offside_workspace_b", b);
  const data = (id) => ({
    funds: { transactions: [], pendingApprovals: [], debtors: [] },
    matches: [{ id, title: id, datetime: "2026-10-24T18:30" }],
    activeMatchId: id,
    attendance: {},
    reports: {},
    notices: [],
  });
  put("no_offside_teams_v1", {
    "a::same-team": data("private-a"),
    "b::same-team": data("private-b"),
  });
  session = { user: { id: "a", user_metadata: {} } };
  userCheck = async () => ({ data: { user: session.user }, error: null });
  let value;
  function Harness() {
    value = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();
  const oldDelete = value.deleteMatch;
  session = { user: { id: "b", user_metadata: {} } };
  await act(async () => callback("SIGNED_IN", session));
  await tick();
  await act(async () => oldDelete("private-a"));
  assert.equal(value.accountId, "b");
  assert.equal(value.deletedMatch, null);
  assert.equal(value.activeMatch.id, "private-b");
  await act(async () =>
    value.undoDeleteMatch({
      accountId: "a",
      teamId: "same-team",
      match: { id: "private-a" },
      index: 0,
    }),
  );
  assert.deepEqual(
    value.matches.map((m) => m.id),
    ["private-b"],
  );
  await act(async () => tree.unmount());
});

test("first-time Google login creates profile from Google metadata and leaves phone unverified and optional", async () => {
  storage.clear();
  session = {
    user: {
      id: "google-new-user-123",
      email: "player.new@gmail.com",
      user_metadata: {
        full_name: "Nguyễn Văn Nam",
        avatar_url: "https://lh3.googleusercontent.com/a/avatar123",
      },
    },
  };
  userCheck = async () => ({ data: { user: session.user }, error: null });
  let value;
  function Harness() {
    value = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();
  assert.equal(value.user.id, "google-new-user-123");
  assert.equal(value.user.name, "Nguyễn Văn Nam");
  assert.equal(value.user.avatar, "https://lh3.googleusercontent.com/a/avatar123");
  assert.equal(value.user.email, "player.new@gmail.com");
  assert.equal(value.user.phoneVerified, false);
  assert.equal(value.currentUserRole, "member");

  // Profile update updates phone as optional unverified contact info
  await act(async () => {
    value.updateProfile({
      name: "Nguyễn Văn Nam",
      number: 10,
      phone: "0912345678",
    });
  });
  assert.equal(value.user.phone, "0912345678");
  assert.equal(value.user.phoneVerified, false);

  // Survives reload
  const saved = JSON.parse(storage.get("no_offside_workspace_google-new-user-123"));
  assert.equal(saved.user.name, "Nguyễn Văn Nam");
  assert.equal(saved.user.phone, "0912345678");
  assert.equal(saved.user.phoneVerified, false);

  await act(async () => tree.unmount());
});

test("returning Google user retains existing custom profile and does not overwrite or link blindly", async () => {
  storage.clear();
  const existing = workspace("google-existing-456", "Trần Minh Đạo");
  existing.user.number = 7;
  existing.user.teamName = "FC Chiến Thắng";
  put("no_offside_workspace_google-existing-456", existing);

  session = {
    user: {
      id: "google-existing-456",
      email: "dao.tran@gmail.com",
      user_metadata: {
        full_name: "Trần Minh Đạo Google Name",
        avatar_url: "https://lh3.googleusercontent.com/a/dao",
      },
    },
  };
  userCheck = async () => ({ data: { user: session.user }, error: null });
  let value;
  function Harness() {
    value = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();
  assert.equal(value.user.id, "google-existing-456");
  assert.equal(value.user.name, "Trần Minh Đạo"); // Retains saved name, not overwritten
  assert.equal(value.user.teamName, "FC Chiến Thắng");
  await act(async () => tree.unmount());
});

test("6-digit numeric password preserves leading zeros as string and never stores password in storage or remembered list", async () => {
  storage.clear();
  // Password with leading zero: "012345"
  const passwordInput = "012345";
  assert.equal(typeof passwordInput, "string");
  assert.equal(passwordInput.length, 6);
  assert.equal(/^\d{6}$/.test(passwordInput), true);
  assert.equal(passwordInput[0], "0");
  // Ensure not cast to number (which would drop '0' to 12345)
  assert.notEqual(String(Number(passwordInput)), passwordInput);

  // Remembered account structure
  const remembered = [
    {
      id: "usr-123",
      username: "Ngocnguyen566",
      name: "Ngọc Nguyễn",
      avatar: "https://example.com/avatar.jpg",
    },
  ];
  storage.set("no_offside_remembered_accounts", JSON.stringify(remembered));

  const parsed = JSON.parse(storage.get("no_offside_remembered_accounts"));
  assert.equal(parsed[0].username, "Ngocnguyen566");
  assert.equal(parsed[0].password, undefined);
  assert.equal(parsed[0].token, undefined);
});

test("auto-login defaults to off, logout disables auto-login for current user, and hasTeam tracks membership", async () => {
  storage.clear();
  const userId = "user-auto-test";
  const userWorkspace = workspace(userId, "Lê Văn Tự");
  userWorkspace.teamSettings = {
    id: "workspace_" + userId,
    ownerId: "",
    members: [],
  };
  put("no_offside_workspace_" + userId, userWorkspace);

  session = {
    user: {
      id: userId,
      email: "tu.le@gmail.com",
      user_metadata: { username: "levantu" },
    },
  };
  userCheck = async () => ({ data: { user: session.user }, error: null });

  let value;
  function Harness() {
    value = useAuth();
    return null;
  }
  let tree;
  await act(async () => {
    tree = renderer.create(React.createElement(Harness));
  });
  await tick();

  assert.equal(value.user.username, "levantu");
  assert.equal(value.hasTeam, false);

  // User creates team
  await act(async () => {
    value.createTeam({
      teamName: "FC Tự Do",
      teamCategory: "Sân 7",
      stadium: "Sân Chuyên Việt",
      teamLogo: "",
    });
  });
  assert.equal(value.hasTeam, true);
  assert.equal(value.currentUserRole, "owner");

  // User logs out: clears session
  await act(async () => {
    await value.logout();
  });
  assert.equal(value.isLoggedIn, false);
  await act(async () => tree.unmount());
});

