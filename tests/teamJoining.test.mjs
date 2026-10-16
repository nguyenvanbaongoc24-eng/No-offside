import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

// Build bundle with mock supabase
const bundle = await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: 'js',
    contents: `
      export { default as TeamOnboarding } from './src/pages/TeamOnboarding.jsx';
      export { default as ClubCodeModal } from './src/components/ClubCodeModal.jsx';
      export { default as InviteShare } from './src/components/InviteShare.jsx';
      export { default as InviteLanding } from './src/pages/InviteLanding.jsx';
      export { savePendingJoin, getPendingJoin, clearPendingJoin } from './src/lib/pendingJoin.js';
    `,
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  external: ['react', 'qrcode.react', 'framer-motion'],
  plugins: [
    {
      name: 'supabase-mock',
      setup(b) {
        b.onResolve({ filter: /lib\/supabase$/ }, () => ({
          path: 'supabase-mock',
          namespace: 'mock',
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
          contents: 'export const supabase = globalThis.__mockSupabase;',
          loader: 'js',
        }));
      },
    },
  ],
});

// Setup mock browser globals
const sessionStore = new Map();
globalThis.sessionStorage = {
  getItem: (k) => sessionStore.get(k) || null,
  setItem: (k, v) => sessionStore.set(k, String(v)),
  removeItem: (k) => sessionStore.delete(k),
  clear: () => sessionStore.clear(),
};
globalThis.window = {
  location: { origin: 'https://no-offside.app', pathname: '/' },
  sessionStorage: globalThis.sessionStorage,
};

const compiled = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(
  require,
  compiled,
  compiled.exports,
);
const {
  TeamOnboarding,
  ClubCodeModal,
  InviteShare,
  InviteLanding,
  savePendingJoin,
  getPendingJoin,
  clearPendingJoin,
} = compiled.exports;

test('post-login onboarding screen renders when user has no team with two large choice cards', () => {
  let created = false;
  let codeOpened = false;
  let qrOpened = false;

  let component;
  act(() => {
    component = renderer.create(
      React.createElement(TeamOnboarding, {
        user: { name: 'New User' },
        onOpenCreateTeam: () => { created = true; },
        onOpenJoinCode: () => { codeOpened = true; },
        onOpenScanQr: () => { qrOpened = true; },
      }),
    );
  });

  const json = JSON.stringify(component.toJSON());

  // Must match exact title and description
  assert.ok(json.includes('Bắt đầu cùng đội bóng của bạn'));
  assert.ok(json.includes('Tạo đội mới hoặc gia nhập đội đang chơi cùng bạn.'));

  // Card 1: Gia nhập đội
  assert.ok(json.includes('Gia nhập đội'));
  assert.ok(json.includes('Bạn đã có đội bóng? Nhập mã Club hoặc quét QR do quản lý đội gửi.'));
  assert.ok(json.includes('Nhập mã Club'));
  assert.ok(json.includes('Quét mã QR'));

  // Card 2: Tạo đội mới
  assert.ok(json.includes('Tạo đội mới'));
  assert.ok(json.includes('Tạo đội bóng và quản lý thành viên, lịch đá, nội quy.'));
  assert.ok(json.includes('Tạo đội bóng'));

  // Trigger actions
  const rootInstance = component.root;
  const buttons = rootInstance.findAllByType('button');

  const joinCodeBtn = buttons.find((b) => b.props['aria-label'] === 'Nhập mã Club để gia nhập đội');
  assert.ok(joinCodeBtn);
  joinCodeBtn.props.onClick();
  assert.equal(codeOpened, true);

  const scanQrBtn = buttons.find((b) => b.props['aria-label'] === 'Quét mã QR để gia nhập đội');
  assert.ok(scanQrBtn);
  scanQrBtn.props.onClick();
  assert.equal(qrOpened, true);

  const createTeamBtn = buttons.find((b) => b.props['aria-label'] === 'Tạo đội bóng mới');
  assert.ok(createTeamBtn);
  createTeamBtn.props.onClick();
  assert.equal(created, true);
});

test('InviteShare displays Club code, QR, copy actions, status, and hides management for non-leaders', () => {
  let regenerated = false;
  let revoked = false;

  // 1. Leader view
  let leaderComponent;
  act(() => {
    leaderComponent = renderer.create(
      React.createElement(InviteShare, {
        isOpen: true,
        teamName: 'FC Chiến Binh',
        teamCode: 'CB99XX',
        inviteStatus: 'active',
        isLeader: true,
        onRegenerateCode: async () => { regenerated = true; },
        onRevokeCode: async () => { revoked = true; },
      }),
    );
  });

  const leaderJson = JSON.stringify(leaderComponent.toJSON());
  assert.ok(leaderJson.includes('CB99XX'));
  assert.ok(leaderJson.includes('Đang hoạt động'));
  assert.ok(leaderJson.includes('Sao chép mã'));
  assert.ok(leaderJson.includes('Sao chép liên kết mời'));
  assert.ok(leaderJson.includes('Tạo mã mới'));
  assert.ok(leaderJson.includes('Thu hồi'));

  // 2. Regular member view hides regenerate and revoke
  let memberComponent;
  act(() => {
    memberComponent = renderer.create(
      React.createElement(InviteShare, {
        isOpen: true,
        teamName: 'FC Chiến Binh',
        teamCode: 'CB99XX',
        inviteStatus: 'active',
        isLeader: false,
      }),
    );
  });

  const memberJson = JSON.stringify(memberComponent.toJSON());
  assert.ok(memberJson.includes('CB99XX'));
  assert.ok(!memberJson.includes('Tạo mã mới'));
  assert.ok(!memberJson.includes('Thu hồi'));
});

test('pending join state persists safely across auth flows and expires after 2 hours without leaking secrets', () => {
  sessionStore.clear();

  savePendingJoin({
    code: ' club123 ',
    name: 'Nguyễn Văn Nam',
    number: 7,
    position: 'Tiền đạo (ST)',
    teamName: 'FC Nam Định',
    teamId: 'team-nd-1',
  });

  const pending = getPendingJoin();
  assert.ok(pending);
  assert.equal(pending.code, 'CLUB123'); // Uppercase and trimmed
  assert.equal(pending.name, 'Nguyễn Văn Nam');
  assert.equal(pending.number, 7);
  assert.equal(pending.position, 'Tiền đạo (ST)');
  assert.equal(pending.teamName, 'FC Nam Định');
  assert.ok(pending.createdAt);

  // Raw sessionStorage check: verify no passwords or tokens were stored
  const raw = sessionStore.get('no_offside_pending_join');
  assert.ok(!raw.includes('password'));
  assert.ok(!raw.includes('token'));
  assert.ok(!raw.includes('jwt'));

  // Simulating expiration > 2 hours
  const expiredPayload = { ...pending, createdAt: Date.now() - 3 * 3600 * 1000 };
  sessionStore.set('no_offside_pending_join', JSON.stringify(expiredPayload));

  assert.equal(getPendingJoin(), null); // Expired -> cleared automatically
  assert.equal(sessionStore.get('no_offside_pending_join'), undefined);
});

test('InviteLanding shows team preview, prompts registration for unauthenticated users, and prevents duplicate jersey numbers', () => {
  sessionStore.clear();
  let authPrompted = false;

  let component;
  act(() => {
    component = renderer.create(
      React.createElement(InviteLanding, {
        inviteCode: 'TEST99',
        teamData: {
          id: 'team-test',
          name: 'FC Kiểm Thử',
          captain: 'Đội Trưởng Thắng',
          membersCount: 15,
          category: 'Sân 7',
          venue: 'Sân Chuyên Việt',
          takenNumbers: [1, 9, 10, 99],
          code: 'TEST99',
        },
        authenticated: false,
        currentUser: null,
        onRequireAuth: () => { authPrompted = true; },
        onBackToApp: () => {},
      }),
    );
  });

  const json = JSON.stringify(component.toJSON());
  assert.ok(json.includes('FC Kiểm Thử'));
  assert.ok(json.includes('Đội Trưởng Thắng'));
  assert.ok(json.includes('Điền hồ sơ tham gia đội'));

  // Click Điền hồ sơ
  const fillBtn = component.root.findByProps({ className: 'primary-button w-full h-12 text-xs font-bold' });
  act(() => {
    fillBtn.props.onClick();
  });

  // Check form inputs
  const inputs = component.root.findAllByType('input');
  const nameInput = inputs.find((i) => i.props.autoComplete === 'name');
  const numberInput = inputs.find((i) => i.props.type === 'number');

  // Input name and a TAKEN jersey number (9)
  act(() => {
    nameInput.props.onChange({ target: { value: 'Lê Văn Luyện' } });
    numberInput.props.onChange({ target: { value: '9' } });
  });

  const updatedJson = JSON.stringify(component.toJSON());
  assert.ok(updatedJson.includes('Số áo 9 đã có người chọn trong đội'));

  // Change to an available jersey number (11)
  act(() => {
    numberInput.props.onChange({ target: { value: '11' } });
  });

  const form = component.root.findByType('form');
  act(() => {
    form.props.onSubmit({ preventDefault: () => {} });
  });

  // Must prompt account creation
  const promptJson = JSON.stringify(component.toJSON());
  assert.ok(promptJson.includes('Tạo tài khoản để hoàn tất gia nhập đội'));
  assert.ok(promptJson.includes('Tạo tài khoản mới'));
  assert.ok(promptJson.includes('Đã có tài khoản? Đăng nhập'));

  // Pending join must be safely preserved in sessionStorage
  const saved = getPendingJoin();
  assert.ok(saved);
  assert.equal(saved.code, 'TEST99');
  assert.equal(saved.name, 'Lê Văn Luyện');
  assert.equal(saved.number, 11);
});
