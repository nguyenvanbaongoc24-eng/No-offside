import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(root + '.ui-review', { recursive: true });

await build({
  absWorkingDir: root,
  stdin: {
    resolveDir: root,
    loader: 'jsx',
    contents: `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FundManagement from './src/pages/FundManagement.jsx';
import FloatingBottomNavigation from './src/components/FloatingBottomNavigation.jsx';
import { Home, Network, Wallet, MessageSquare, User } from './src/components/icons';

const initialFunds = {
  transactions: [
    {
      id: 'tx-1',
      title: 'Thu quỹ đội',
      amount: 200000,
      type: 'income',
      category: 'Thu quỹ',
      author: 'Thủ quỹ',
      occurredAt: '2026-10-16T21:30:00+07:00',
      date: '2026-10-16',
    },
    {
      id: 'tx-2',
      title: 'Tiền thuê sân bóng',
      amount: 50000,
      type: 'expense',
      category: 'Sân bóng',
      author: 'Thủ quỹ',
      occurredAt: '2026-10-15T19:00:00+07:00',
      date: '2026-10-15',
    },
  ],
  pendingApprovals: [
    {
      id: 'appr-1',
      name: 'Nguyễn Văn Nam',
      amount: 200000,
      bank: 'MB Bank',
      month: '10/2026',
      memo: 'NO OFFSIDE SO 7 DONG QUY 2026-10',
    },
  ],
  debtors: [
    {
      id: 'debt-1',
      playerId: 'usr-19',
      name: 'Quang Hải',
      phone: '0901234567',
      month: '10/2026',
      amount: 100000,
    },
  ],
};

const teamMembers = [
  { id: 'usr-owner', name: 'Minh Anh (Chủ đội)', role: 'owner' },
  { id: 'usr-treasurer', name: 'Hoàng Hải (Thủ quỹ)', role: 'admin' },
  { id: 'usr-19', name: 'Quang Hải', role: 'member' },
  { id: 'usr-7', name: 'Nguyễn Văn Nam', role: 'member' },
];

function FundMockupReview() {
  const [theme, setTheme] = useState('light');
  const [viewportWidth, setViewportWidth] = useState(390);
  const [role, setRole] = useState('owner'); // 'owner' | 'member'
  const [funds, setFunds] = useState(initialFunds);
  const [activeNav, setActiveNav] = useState('fund');

  const tabs = [
    { id: 'dashboard', label: 'Trang chủ', Icon: Home },
    { id: 'lineup', label: 'Chiến thuật', Icon: Network },
    { id: 'fund', label: 'Quỹ đội', Icon: Wallet },
    { id: 'chat', label: 'Tin nhắn', Icon: MessageSquare, unreadCount: 2 },
    { id: 'profile', label: 'Cá nhân', Icon: User },
  ];

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="review-wrapper" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: theme === 'dark' ? '#060B09' : '#EEF2F0' }}>
      {/* Test Bar */}
      <div className="review-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', background: theme === 'dark' ? '#141E1A' : '#fff', padding: '10px 16px', borderRadius: '16px', border: '1px solid #cbd5e1', maxWidth: '600px', width: '100%', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button id="btn-toggle-theme" onClick={toggleTheme} style={{ padding: '6px 12px', borderRadius: '8px', background: theme === 'dark' ? '#22C55E' : '#0F172A', color: '#fff', fontSize: '13px', fontWeight: 600, border: 0, cursor: 'pointer' }}>
            {theme === 'light' ? '🌙 Chuyển sang Dark' : '☀️ Chuyển sang Light'}
          </button>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '13px' }}>
            <option value="owner">Thủ quỹ / Owner</option>
            <option value="member">Member thường</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[320, 360, 390, 430].map(w => (
            <button key={w} id={'btn-width-' + w} onClick={() => setViewportWidth(w)} style={{ padding: '6px 8px', borderRadius: '8px', background: viewportWidth === w ? '#047857' : '#e2e8f0', color: viewportWidth === w ? '#fff' : '#334155', fontSize: '12px', fontWeight: 600, border: 0, cursor: 'pointer' }}>
              {w}px
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Device Frame */}
      <div
        className="mobile-frame app-scroll-frame"
        style={{
          width: viewportWidth + 'px',
          maxWidth: '100%',
          minHeight: '780px',
          height: '844px',
          overflowY: 'auto',
          background: theme === 'dark' ? '#0B1210' : '#F5F7F6',
          borderRadius: '36px',
          border: theme === 'dark' ? '4px solid #1B2722' : '4px solid #E1E8E3',
          boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <FundManagement
          funds={funds}
          onChangeFunds={setFunds}
          currentUserRole={role}
          teamMembers={teamMembers}
          timeZone="Asia/Ho_Chi_Minh"
          teamName="FC No Offside"
          treasurerQr={{
            bankName: 'MB Bank (Quân Đội)',
            bankCode: '970422',
            accountNumber: '123456789',
            accountHolder: 'HOANG HAI',
            qrMode: 'generated',
          }}
          onApprove={id => {
            setFunds(prev => ({
              ...prev,
              pendingApprovals: prev.pendingApprovals.filter(p => p.id !== id),
            }));
          }}
          onReject={(id, reason) => {
            setFunds(prev => ({
              ...prev,
              pendingApprovals: prev.pendingApprovals.filter(p => p.id !== id),
            }));
          }}
        />

        {/* Floating Capsule Bottom Navigation */}
        <FloatingBottomNavigation
          tabs={tabs}
          activeTab={activeNav}
          canManage={false} // FAB removed on Quỹ đội screen
          onNavigate={id => setActiveNav(id)}
          visible={true}
        />
      </div>
    </div>
  );
}

document.documentElement.dataset.theme = 'light';
createRoot(document.getElementById('root')).render(<FundMockupReview />);
`,
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  outfile: root + '.ui-review/fund-mockup-review.js',
  plugins: [
    {
      name: 'offline-demo',
      setup(b) {
        b.onResolve({ filter: /lib\/supabase$/ }, () => ({
          path: 'offline',
          namespace: 'offline',
        }));
        b.onLoad({ filter: /.*/, namespace: 'offline' }, () => ({
          contents: 'export const supabase = null;',
          loader: 'js',
        }));
      },
    },
  ],
});

await writeFile(
  root + '.ui-review/fund-mockup-review.html',
  `<!doctype html>
<html lang="vi" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>No Offside · Fund Mockup Light/Dark Review</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap">
  <link rel="stylesheet" href="/src/styles/index.css">
  <link rel="stylesheet" href="/src/styles/refinement.css">
  <link rel="stylesheet" href="/src/styles/soft-ui.css">
  <link rel="stylesheet" href="/src/styles/pro.css">
  <link rel="stylesheet" href="/src/styles/fundCollections.css">
</head>
<body style="margin: 0; padding: 0;">
  <div id="root"></div>
  <script type="module" src="./fund-mockup-review.js?v=${Date.now()}"></script>
</body>
</html>`
);

console.log('Fund mockup review generated: /.ui-review/fund-mockup-review.html');
