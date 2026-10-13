import test from "node:test";
import assert from "node:assert/strict";
import teamsHandler from "../api/teams.js";
import membersHandler from "../api/members.js";
import syncHandler from "../api/sync.js";
import { getAdminClient, readJson } from "../api/_storageHelper.js";

// Mock helper to generate req / res
function mockReqRes({ method = "POST", body = {}, headers = {}, query = {} } = {}) {
  const req = {
    method,
    body,
    headers: {
      authorization: "Bearer mock-token",
      ...headers,
    },
    url: `http://localhost/api?${new URLSearchParams(query).toString()}`,
  };

  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };

  return { req, res };
}

test("data persistence: team creation, member management, and sync endpoints", async (t) => {
  // Test user ID for mock
  const testUserId = "5e3967b5-a15a-4601-9719-3b6c0b7ad420"; // valid UUID format
  const supabaseAdmin = getAdminClient();

  // Test 1: Team creation endpoint saves team and owner membership
  const teamId = `test-team-${Date.now()}`;
  const { req: createReq, res: createRes } = mockReqRes({
    method: "POST",
    body: {
      action: "create-team",
      team: {
        id: teamId,
        teamName: "FC Persistence Test",
        teamCategory: "Sân 7",
        stadium: "Sân Chuyên Việt",
      },
    },
  });

  // Inject user mock into admin client for testing
  const originalGetUser = supabaseAdmin.auth.getUser.bind(supabaseAdmin.auth);
  supabaseAdmin.auth.getUser = async (token) => ({
    data: {
      user: {
        id: testUserId,
        email: "test.owner@no-offside.app",
        user_metadata: { full_name: "Chủ Đội Test", jersey_number: 10, position: "Tiền Vệ" },
      },
    },
    error: null,
  });

  try {
    await teamsHandler(createReq, createRes);
    assert.equal(createRes.statusCode, 200);
    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.team.id, teamId);
    assert.equal(createRes.body.team.ownerId, testUserId);
    assert.equal(createRes.body.team.members[0].roleType, "owner");
    assert.equal(createRes.body.role, "owner");

    // Verify persisted directly in Supabase cloud storage
    const storedTeam = await readJson(supabaseAdmin, `teams/${teamId}.json`);
    assert.ok(storedTeam);
    assert.equal(storedTeam.teamName, "FC Persistence Test");

    // Test 2: Add member manually with duplicate jersey check
    const { req: addReq1, res: addRes1 } = mockReqRes({
      method: "POST",
      body: {
        action: "add-member",
        teamId,
        member: {
          name: "Nguyễn Văn A",
          number: 7,
          role: "Tiền Đạo",
          phone: "0901234567",
        },
      },
    });

    await membersHandler(addReq1, addRes1);
    assert.equal(addRes1.statusCode, 200);
    assert.equal(addRes1.body.success, true);
    assert.equal(addRes1.body.member.name, "Nguyễn Văn A");
    assert.equal(addRes1.body.member.number, 7);
    assert.equal(addRes1.body.member.isManual, true);
    assert.equal(addRes1.body.count, 2);

    // Test 3: Reject duplicate jersey number
    const { req: addReqDup, res: addResDup } = mockReqRes({
      method: "POST",
      body: {
        action: "add-member",
        teamId,
        member: {
          name: "Trần Văn B",
          number: 7, // duplicate of #7
          role: "Tiền Vệ",
        },
      },
    });

    await membersHandler(addReqDup, addResDup);
    assert.equal(addResDup.statusCode, 400);
    assert.ok(addResDup.body.error.includes("Số áo #7 đã được sử dụng"));

    // Test 4: Reject non-leader caller
    supabaseAdmin.auth.getUser = async () => ({
      data: {
        user: {
          id: "other-user-without-permissions",
          email: "stranger@no-offside.app",
        },
      },
      error: null,
    });

    const { req: addReqStranger, res: addResStranger } = mockReqRes({
      method: "POST",
      body: {
        action: "add-member",
        teamId,
        member: { name: "Hacker", number: 99 },
      },
    });

    await membersHandler(addReqStranger, addResStranger);
    assert.equal(addResStranger.statusCode, 403);

    // Reset user to owner
    supabaseAdmin.auth.getUser = async () => ({
      data: { user: { id: testUserId, email: "test.owner@no-offside.app" } },
      error: null,
    });

    // Test 5: Sync team funds and match data
    const { req: syncReq, res: syncRes } = mockReqRes({
      method: "POST",
      body: {
        teamId,
        data: {
          funds: {
            transactions: [{ id: 1, title: "Đóng quỹ test", amount: 100000, type: "income" }],
            debtors: [],
          },
        },
      },
    });

    await syncHandler(syncReq, syncRes);
    assert.equal(syncRes.statusCode, 200);
    assert.equal(syncRes.body.success, true);

    const storedData = await readJson(supabaseAdmin, `team_data/${teamId}.json`);
    assert.equal(storedData.funds.transactions.length, 1);
    assert.equal(storedData.funds.transactions[0].amount, 100000);
  } finally {
    // Restore
    supabaseAdmin.auth.getUser = originalGetUser;
    // Cleanup test artifacts from storage
    try {
      await supabaseAdmin.storage.from("no_offside_data").remove([
        `teams/${teamId}.json`,
        `team_data/${teamId}.json`,
        `user_teams/${testUserId}.json`,
      ]);
    } catch {}
  }
});
