import test from "node:test";
import assert from "node:assert/strict";
import { setTestAdminClient } from "../api/_storageHelper.js";
import handler from "../api/sync.js";
const result = () => ({
  statusCode: 0,
  headers: {},
  setHeader(k, v) {
    this.headers[k] = v;
  },
  status(s) {
    this.statusCode = s;
    return this;
  },
  json(v) {
    this.body = v;
    return this;
  },
});
test("Pro API requires caller authentication and delegates team membership to JWT-bound RPC", async () => {
  let calls = 0,
    args;
  setTestAdminClient({
    userClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "caller" } } }) },
      rpc: async (name, payload) => {
        calls++;
        args = { name, payload };
        return { data: { success: true, offers: [] } };
      },
    }),
  });
  let res = result();
  await handler({ method: "POST", headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls, 0);
  res = result();
  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer test-session" },
      body: {
        teamId: "team",
        action: "pro",
        proAction: "state",
        userId: "spoofed",
      },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(args.name, "no_pro_action");
  assert.deepEqual(Object.keys(args.payload).sort(), [
    "p_action",
    "p_key",
    "p_payload",
    "p_team",
  ]);
  assert.equal(args.payload.p_key, null);
  assert.match(res.headers["Cache-Control"], /no-store/);
  res = result();
  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer test-session" },
      body: "{",
    },
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(calls, 1);
});
