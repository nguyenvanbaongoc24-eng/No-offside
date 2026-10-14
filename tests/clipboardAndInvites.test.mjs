import test from 'node:test';
import assert from 'node:assert/strict';
import { copyToClipboard } from '../src/lib/clipboard.js';
import inviteHandler from '../api/invites.js';

test('copyToClipboard: uses navigator.clipboard.writeText when supported and permitted', async () => {
  let copied = '';
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (t) => {
          copied = t;
        },
      },
    },
  });
  globalThis.window = { isSecureContext: true };

  const res = await copyToClipboard('NODF476');
  assert.equal(res.success, true);
  assert.equal(copied, 'NODF476');
});

test('copyToClipboard: falls back to execCommand when writeText is blocked by user agent', async () => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new Error('The request is not allowed by the user agent');
        },
      },
    },
  });

  let execCalled = false;
  let textSelected = '';
  const textareaMock = {
    value: '',
    style: {},
    setAttribute: () => {},
    focus: () => {},
    select: () => {
      textSelected = textareaMock.value;
    },
    setSelectionRange: () => {},
  };

  globalThis.document = {
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: () => textareaMock,
    execCommand: (cmd) => {
      if (cmd === 'copy') {
        execCalled = true;
        return true;
      }
      return false;
    },
  };

  const res = await copyToClipboard('NODF476');
  assert.equal(res.success, true);
  assert.equal(execCalled, true);
  assert.equal(textSelected, 'NODF476');
});

test('copyToClipboard: provides clear Vietnamese error message if all copy methods fail', async () => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new Error('NotAllowedError');
        },
      },
    },
  });
  globalThis.document = {
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    createElement: () => ({
      style: {},
      setAttribute: () => {},
      focus: () => {},
      select: () => {},
      setSelectionRange: () => {},
    }),
    execCommand: () => false,
  };

  const res = await copyToClipboard('NODF476');
  assert.equal(res.success, false);
  assert.match(res.message, /Không sao chép được/);
  assert.doesNotMatch(res.message, /NotAllowedError/);
});

test('api/invites: GET /api/invites resolves seeded or existing invite code', async () => {
  const req = {
    method: 'GET',
    url: 'http://localhost/api/invites?code=NODF476',
    headers: {},
  };
  let statusCode = 0;
  let jsonResult = null;
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          jsonResult = data;
        },
      };
    },
  };

  await inviteHandler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(jsonResult?.valid, true);
  assert.equal(jsonResult?.code, 'NODF476');
  assert.equal(jsonResult?.teamName, 'FC Triệu Sơn');
});

test('api/invites: POST /api/invites syncs a new team invite', async () => {
  const code = 'TEST' + Math.floor(Math.random() * 8999 + 1000);
  const req = {
    method: 'POST',
    url: 'http://localhost/api/invites',
    headers: {},
    body: {
      code,
      teamId: 'fc-test',
      teamName: 'FC Triệu Sơn Test',
      category: 'Sân 7',
      captain: 'Nguyễn Văn A',
      membersCount: 2,
      takenNumbers: [7, 10],
    },
  };
  let statusCode = 0;
  let jsonResult = null;
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          jsonResult = data;
        },
      };
    },
  };

  await inviteHandler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(jsonResult?.success, true);
  assert.equal(jsonResult?.invite?.code, code);
  assert.equal(jsonResult?.invite?.teamName, 'FC Triệu Sơn Test');

  // Verify retrieval
  const getReq = {
    method: 'GET',
    url: `http://localhost/api/invites?code=${code}`,
    headers: {},
  };
  await inviteHandler(getReq, res);
  assert.equal(statusCode, 200);
  assert.equal(jsonResult?.valid, true);
  assert.equal(jsonResult?.teamName, 'FC Triệu Sơn Test');
});

test('api/invites: POST action join rejects duplicate jersey numbers and admits unique ones', async () => {
  const code = 'JOIN' + Math.floor(Math.random() * 8999 + 1000);
  let statusCode = 0;
  let jsonResult = null;
  const res = {
    setHeader: () => {},
    status: (c) => {
      statusCode = c;
      return {
        json: (data) => {
          jsonResult = data;
        },
      };
    },
  };

  // Create isolated invite
  await inviteHandler(
    {
      method: 'POST',
      url: 'http://localhost/api/invites',
      headers: {},
      body: {
        code,
        teamId: 'fc-join-test',
        teamName: 'FC Join Test',
        takenNumbers: [],
      },
    },
    res
  );

  const dupReq = {
    method: 'POST',
    url: 'http://localhost/api/invites',
    headers: {},
    body: {
      action: 'join',
      code,
      memberProfile: {
        name: 'Cầu thủ 1',
        number: 10,
        role: 'Tiền vệ (CM)',
      },
    },
  };

  // First join with number 10 succeeds
  await inviteHandler(dupReq, res);
  assert.equal(statusCode, 200);
  assert.equal(jsonResult?.success, true);

  // Second join with same number 10 is rejected
  await inviteHandler(dupReq, res);
  assert.equal(statusCode, 400);
  assert.match(jsonResult?.error, /Số áo 10 đã có thành viên sử dụng/);
});
