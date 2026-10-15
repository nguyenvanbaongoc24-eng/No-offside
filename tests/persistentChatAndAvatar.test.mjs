import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const owner = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000003";
const outsider = "00000000-0000-4000-8000-000000000004";
const teamId = "test-team-fc-99";

let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table if not exists auth.users (id uuid primary key, email text);
    insert into auth.users (id, email) values
      ('00000000-0000-4000-8000-000000000001', 'owner@example.com'),
      ('00000000-0000-4000-8000-000000000003', 'member@example.com'),
      ('00000000-0000-4000-8000-000000000004', 'outsider@example.com')
    on conflict do nothing;

    create or replace function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated;

    -- Basic team setup tables
    create table if not exists public.no_gov_teams (
      id text primary key,
      name text not null,
      owner_id uuid references auth.users(id),
      timezone text default 'Asia/Ho_Chi_Minh',
      policy jsonb default '{}'::jsonb
    );

    create table if not exists public.no_gov_members (
      team_id text not null,
      user_id uuid not null references auth.users(id),
      name text not null,
      role text not null default 'member',
      status text not null default 'active',
      primary key(team_id, user_id)
    );

    insert into public.no_gov_teams (id, name, owner_id) values ('test-team-fc-99', 'FC No Offside', '00000000-0000-4000-8000-000000000001');
    insert into public.no_gov_members (team_id, user_id, name, role, status) values
      ('test-team-fc-99', '00000000-0000-4000-8000-000000000001', 'Captain', 'owner', 'active'),
      ('test-team-fc-99', '00000000-0000-4000-8000-000000000003', 'Striker', 'member', 'active');
    grant select on public.no_gov_teams, public.no_gov_members to authenticated;
  `);


  // Load and apply the new chat migration
  const chatMigrationSql = await readFile(
    new URL("../supabase/migrations/202610150001_team_chat.sql", import.meta.url),
    "utf8"
  );
  await db.exec(chatMigrationSql);
});

after(async () => {
  if (db) await db.close();
});

async function asUser(userId) {
  if (userId) {
    await db.exec(`
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${userId}', false);
    `);
  } else {
    await db.exec(`
      set role anon;
      select set_config('request.jwt.claim.sub', '', false);
    `);
  }
}

test("team chat migration: member can insert message with matching auth.uid", async () => {
  await asUser(member);
  const clientMsgId = "client-msg-1";
  await db.query(
    `insert into public.no_team_messages (team_id, sender_id, client_msg_id, text)
     values ($1, $2, $3, $4)`,
    [teamId, member, clientMsgId, "Xin chào cả đội!"]
  );

  const { rows } = await db.query(
    `select id, team_id, sender_id, text, client_msg_id from public.no_team_messages where team_id = $1`,
    [teamId]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].text, "Xin chào cả đội!");
  assert.equal(rows[0].sender_id, member);
});

test("team chat migration: cannot forge sender_id different from auth.uid", async () => {
  await asUser(member);
  await assert.rejects(
    async () => {
      // Trying to insert with owner's id as sender while auth.uid() is member
      await db.query(
        `insert into public.no_team_messages (team_id, sender_id, client_msg_id, text)
         values ($1, $2, $3, $4)`,
        [teamId, owner, "client-msg-forged", "Tin giả mạo chủ đội"]
      );
    },
    /row-level security policy/i
  );
});

test("team chat migration: outsider is blocked from sending message", async () => {
  await asUser(outsider);
  await assert.rejects(
    async () => {
      await db.query(
        `insert into public.no_team_messages (team_id, sender_id, client_msg_id, text)
         values ($1, $2, $3, $4)`,
        [teamId, outsider, "client-msg-outsider", "Người lạ nhắn tin"]
      );
    },
    /row-level security policy/i
  );
});

test("team chat migration: outsider cannot select team messages", async () => {
  await asUser(outsider);
  const { rows } = await db.query(
    `select * from public.no_team_messages where team_id = $1`,
    [teamId]
  );
  assert.equal(rows.length, 0, "Outsider must see 0 messages due to RLS");
});

test("team chat migration: idempotency constraint rejects duplicate client_msg_id", async () => {
  await asUser(member);
  const clientMsgId = "client-msg-1"; // already inserted above

  await assert.rejects(
    async () => {
      await db.query(
        `insert into public.no_team_messages (team_id, sender_id, client_msg_id, text)
         values ($1, $2, $3, $4)`,
        [teamId, member, clientMsgId, "Gửi lại lần 2"]
      );
    },
    /idx_no_team_messages_dedup|unique/i
  );
});
