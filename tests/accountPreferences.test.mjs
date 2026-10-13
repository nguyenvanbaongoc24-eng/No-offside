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
