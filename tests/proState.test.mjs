import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import renderer, { act } from "react-test-renderer";
import { build } from "esbuild";
import { createRequire } from "node:module";
const events = new Map();
globalThis.window = {
  location: { origin: "http://test.local" },
  addEventListener: (n, fn) => events.set(n, fn),
  removeEventListener: (n) => events.delete(n),
  dispatchEvent() {},
};
globalThis.document = { hidden: false };
const bundle = await build({
  stdin: {
    contents: "export {usePro} from './src/hooks/usePro';",
    resolveDir: process.cwd(),
    loader: "js",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  external: ["react"],
});
const m = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url),
  m,
  m.exports,
);
const { usePro } = m.exports;
let current;
function Harness(props) {
  current = usePro(props);
  return null;
}
const response = (data) => ({
  ok: true,
  status: 200,
  json: async () => data,
  headers: { get: () => null },
});
const data = (id) => ({
  success: true,
  offers: [],
  charges: [{ id, subject: id, status: "owed", label: "Private " + id }],
});
test("Pro state cannot flash previous-account finances and cleans its polling listener", async () => {
  let tree, oldReply, newReply;
  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.teamId === "a" && oldReply === undefined)
      return response(data("a"));
    return new Promise((resolve) =>
      body.teamId === "a" ? (oldReply = resolve) : (newReply = resolve),
    );
  };
  await act(async () => {
    tree = renderer.create(
      React.createElement(Harness, {
        teamId: "a",
        accountId: "a",
        token: "token-a",
      }),
    );
  });
  assert.equal(current.state.charges[0].subject, "a");
  globalThis.fetch = async (url, opts) =>
    new Promise((resolve) =>
      JSON.parse(opts.body).teamId === "a"
        ? (oldReply = resolve)
        : (newReply = resolve),
    );
  let pending;
  act(() => {
    pending = current.refresh();
  });
  await act(async () => {
    tree.update(
      React.createElement(Harness, {
        teamId: "b",
        accountId: "b",
        token: "token-b",
      }),
    );
  });
  assert.deepEqual(current.state.charges, []);
  await act(async () => {
    oldReply(response(data("a")));
    await pending;
  });
  assert.deepEqual(current.state.charges, []);
  await act(async () => newReply(response(data("b"))));
  assert.equal(current.state.charges[0].subject, "b");
  act(() => tree.unmount());
  assert.equal(events.size, 0);
});
test("server-acknowledged mutation stays successful when only the follow-up read fails", async () => {
  let tree,
    reads = 0;
  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    if (body.proAction !== "state") return response({ success: true });
    if (++reads > 1)
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: "Read offline" }),
      };
    return response({ success: true, offers: [], charges: [] });
  };
  await act(async () => {
    tree = renderer.create(
      React.createElement(Harness, {
        teamId: "a",
        accountId: "a",
        token: "token",
      }),
    );
  });
  let result;
  await act(async () => {
    result = await current.mutate(
      "third-bill",
      { title: "Test", total: 100, participants: ["a"] },
      "fixed-key",
    );
  });
  assert.equal(result.success, true);
  assert.match(current.error, /Đã lưu thành công/);
  assert.equal(current.busy, false);
  act(() => tree.unmount());
  assert.equal(events.size, 0);
});
