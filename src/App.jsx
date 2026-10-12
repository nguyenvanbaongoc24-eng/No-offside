import React, { useState, useEffect } from 'react';
import { Home, Shield, Wallet, MessageSquare, User } from 'lucide-react';
import PlayerDashboard from './pages/PlayerDashboard';
import LineupBuilder from './pages/LineupBuilder';
import FundManagement from './pages/FundManagement';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import CreateTeam from './pages/CreateTeam';
import InviteLanding from './pages/InviteLanding';
import SignIn from './pages/SignIn';
import TeamSettings from './pages/TeamSettings';
import NotificationToast, { NotificationHistoryModal } from './components/NotificationToast';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/invite') || window.location.search.includes('invite') || window.location.hash.includes('invite'))) {
      return 'invite-landing';
    }
    return 'dashboard';
  });
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [showNotificationHistory, setShowNotificationHistory] = useState(false);

  useEffect(() => {
    if (showNotificationToast) {
      const timer = setTimeout(() => {
        setShowNotificationToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showNotificationToast]);

  const { 
    user, 
    currentUserRole,
    setCurrentUserRole,
    toggleRole,
    isLoggedIn,
    setAttendance, 
    markFundPaid, 
    resetFund, 
    updateMatchStats,
    teamSettings,
    updateTreasurerQr,
    updateTeamName,
    updateTeamSettings,
    updateSubAdminTitle,
    addSubAdmin,
    removeSubAdmin,
    removeMember,
    addMember,
    transferOwnership,
    approveAdminRequest,
    rejectAdminRequest,
    login, 
    logout 
  } = useAuth();

  // If user is not logged in, display the clean SignIn screen
  if (!isLoggedIn) {
    return (
      <SignIn 
        onLoginSuccess={(userData) => {
          login(userData || { name: 'Tuấn Hưng', number: 9 });
          setCurrentTab('dashboard');
        }} 
      />
    );
  }

  // Ensure member cannot stay in 'fund' or 'team-settings' tab if role switched
  const isLeader = currentUserRole === 'owner' || currentUserRole === 'admin';
  const activeTab = (!isLeader && (currentTab === 'fund' || currentTab === 'team-settings')) ? 'dashboard' : currentTab;

  return (
    <div className="bg-slate-100 min-h-screen text-gray-900 flex justify-center font-['Be_Vietnam_Pro'] antialiased selection:bg-emerald-600 selection:text-white">
      {/* Mobile Layout Frame (max-w-md mx-auto min-h-screen bg-slate-50 relative pb-safe pb-32) */}
      <div className="w-full max-w-md min-h-screen relative bg-slate-50 shadow-2xl flex flex-col justify-between overflow-x-hidden pb-safe pb-32">
        
        {/* =========================================================
            HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
            - Toast thông báo phong cách Facebook/Zalo (slide-in-from-top)
            - Modal xem lại toàn bộ lịch sử thông báo
            ========================================================= */}
        <NotificationToast 
          isOpen={showNotificationToast}
          onClose={() => setShowNotificationToast(false)}
          onOpenHistory={() => {
            setShowNotificationToast(false);
            setShowNotificationHistory(true);
          }}
        />

        <NotificationHistoryModal 
          isOpen={showNotificationHistory}
          onClose={() => setShowNotificationHistory(false)}
        />

        {/* Dynamic Screen View */}
        <main className="flex-1">
          {activeTab === 'create-team' ? (
            <CreateTeam 
              onTeamCreated={(teamData) => {
                login(teamData);
                setCurrentUserRole('owner');
                setCurrentTab('dashboard');
              }}
              onBack={() => setCurrentTab('profile')}
            />
          ) : activeTab === 'invite-landing' ? (
            <InviteLanding 
              teamData={{
                name: user.teamName || 'FC No Offside',
                captain: 'Đội Trưởng Tuấn Hưng',
                membersCount: 18,
                category: user.teamCategory || 'Kèo Sân 7',
                venue: 'Sân Chuyên Việt (18D Cộng Hòa, Tân Bình)',
                matchSchedule: 'Thứ 6 hàng tuần • 18:30',
                logo: user.teamLogo || user.avatar,
              }}
              onJoinSuccess={(memberData) => {
                login(memberData);
                setCurrentUserRole('member');
                setCurrentTab('dashboard');
              }}
              onBackToApp={() => setCurrentTab('profile')}
            />
          ) : activeTab === 'team-settings' ? (
            <TeamSettings 
              teamSettings={teamSettings}
              onUpdateTeamSettings={updateTeamSettings}
              onBack={() => setCurrentTab('profile')}
              currentUserRole={currentUserRole}
            />
          ) : activeTab === 'lineup' ? (
            <LineupBuilder onBack={() => setCurrentTab('dashboard')} />
          ) : activeTab === 'fund' ? (
            <FundManagement 
              onBack={() => setCurrentTab('dashboard')} 
              treasurerQr={teamSettings?.treasurerQr}
              onUpdateTreasurerQr={updateTreasurerQr}
              currentUserRole={currentUserRole}
            />
          ) : activeTab === 'chat' ? (
            <Chat user={user} members={teamSettings?.members} />
          ) : activeTab === 'profile' ? (
            <Profile 
              user={user} 
              currentUserRole={currentUserRole}
              onToggleRole={toggleRole}
              onLogout={() => {
                logout();
                setCurrentTab('dashboard');
              }}
              onNavigate={(tab) => setCurrentTab(tab)}
              teamSettings={teamSettings}
              onUpdateTeamName={updateTeamName}
              onUpdateSubAdminTitle={updateSubAdminTitle}
              onAddSubAdmin={addSubAdmin}
              onRemoveSubAdmin={removeSubAdmin}
              onTransferOwnership={transferOwnership}
              onApproveAdminRequest={approveAdminRequest}
              onRejectAdminRequest={rejectAdminRequest}
            />
          ) : (
            <PlayerDashboard 
              user={user} 
              currentUserRole={currentUserRole}
              onToggleRole={toggleRole}
              onAttendanceChange={setAttendance}
              onMarkPaid={markFundPaid}
              onResetPaid={resetFund}
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenNotifications={() => setShowNotificationHistory(true)}
              treasurerQr={teamSettings?.treasurerQr}
              onUpdateMatchStats={updateMatchStats}
              members={teamSettings?.members}
              onRemoveMember={removeMember}
              onAddMember={addMember}
            />
          )}
        </main>

        {/* =========================================================
            FLOATING BOTTOM NAVIGATION (THANH MENU DƯỚI CÙNG)
            - Ẩn khi đang ở màn hình tạo đội, landing page mời hoặc cài đặt đội
            - z-index cực cao z-[99], an toàn tuyệt đối với Home Indicator của iPhone (pb-safe)
            - Nếu là owner/admin: 5 nút: [Trang chủ] - [Sa bàn] - [Quỹ đội] - [Chat] - [Tài khoản]
            - Nếu là member: 4 nút: [Trang chủ] - [Sa bàn] - [Chat] - [Tài khoản] (BỎ nút Quỹ đội)
            - Nút bấm bo tròn Soft UI, không bị ngắt dòng chữ (whitespace-nowrap)
            ========================================================= */}
        {!['create-team', 'invite-landing', 'team-settings'].includes(activeTab) && (
        <nav className="fixed bottom-3 sm:bottom-5 left-3 right-3 max-w-md mx-auto z-[99] pointer-events-auto pb-safe">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-full px-3 py-2 shadow-[0_20px_45px_-10px_rgba(15,23,42,0.6)] border border-slate-800 flex items-center justify-around">
            
            {/* Nút 1: Trang chủ */}
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-md shadow-white/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              {activeTab === 'dashboard' && <span>Trang chủ</span>}
            </button>

            {/* Nút 2: Sa bàn */}
            <button
              onClick={() => setCurrentTab('lineup')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'lineup'
                  ? 'bg-white text-slate-900 shadow-md shadow-white/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              {activeTab === 'lineup' && <span>Sa bàn</span>}
            </button>

            {/* Nút 3: Quỹ đội (HIỂN THỊ KHI LÀ OWNER HOẶC ADMIN) */}
            {isLeader && (
              <button
                onClick={() => setCurrentTab('fund')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'fund'
                    ? 'bg-white text-slate-900 shadow-md shadow-white/20'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Quỹ đội"
              >
                <Wallet className="w-4 h-4 shrink-0" />
                {activeTab === 'fund' && <span>Quỹ đội</span>}
              </button>
            )}

            {/* Nút 4: Chat */}
            <button
              onClick={() => setCurrentTab('chat')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-white text-slate-900 shadow-md shadow-white/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              {activeTab === 'chat' && <span>Chat</span>}
            </button>

            {/* Nút 5: Tài khoản */}
            <button
              onClick={() => setCurrentTab('profile')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-white text-slate-900 shadow-md shadow-white/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              {activeTab === 'profile' && <span>Tài khoản</span>}
            </button>
          </div>
        </nav>
        )}

      </div>
    </div>
  );
}
