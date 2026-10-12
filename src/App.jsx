import React, { useState } from 'react';
import { Home, Shield, Wallet, MessageSquare, User } from 'lucide-react';
import PlayerDashboard from './pages/PlayerDashboard';
import LineupBuilder from './pages/LineupBuilder';
import FundManagement from './pages/FundManagement';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import SignIn from './pages/SignIn';
import NotificationToast, { NotificationHistoryModal } from './components/NotificationToast';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showNotificationToast, setShowNotificationToast] = useState(true);
  const [showNotificationHistory, setShowNotificationHistory] = useState(false);

  const { 
    user, 
    currentUserRole,
    toggleRole,
    isLoggedIn,
    setAttendance, 
    markFundPaid, 
    resetFund, 
    login, 
    logout 
  } = useAuth();

  // If user is not logged in, display the clean SignIn screen
  if (!isLoggedIn) {
    return (
      <SignIn 
        onLoginSuccess={() => {
          login({ name: 'Tuấn Hưng', number: 9 });
          setCurrentTab('dashboard');
        }} 
      />
    );
  }

  // Ensure member cannot stay in 'fund' tab if role switched
  const activeTab = (currentUserRole !== 'admin' && currentTab === 'fund') ? 'dashboard' : currentTab;

  return (
    <div className="bg-slate-100 min-h-screen text-gray-900 flex justify-center font-['Be_Vietnam_Pro'] antialiased selection:bg-emerald-600 selection:text-white">
      {/* Mobile Layout Frame (max-w-md mx-auto min-h-screen bg-slate-50 relative) */}
      <div className="w-full max-w-md min-h-screen relative bg-slate-50 shadow-2xl flex flex-col justify-between overflow-x-hidden pb-24">
        
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
          {activeTab === 'lineup' ? (
            <LineupBuilder onBack={() => setCurrentTab('dashboard')} />
          ) : activeTab === 'fund' ? (
            <FundManagement onBack={() => setCurrentTab('dashboard')} />
          ) : activeTab === 'chat' ? (
            <Chat user={user} />
          ) : activeTab === 'profile' ? (
            <Profile 
              user={user} 
              currentUserRole={currentUserRole}
              onToggleRole={toggleRole}
              onLogout={() => {
                logout();
                setCurrentTab('dashboard');
              }}
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
            />
          )}
        </main>

        {/* =========================================================
            FLOATING BOTTOM NAVIGATION (THANH MENU DƯỚI CÙNG)
            - Nếu là admin: 5 nút: [Trang chủ] - [Sa bàn] - [Quỹ đội] - [Chat] - [Tài khoản]
            - Nếu là member: 4 nút: [Trang chủ] - [Sa bàn] - [Chat] - [Tài khoản] (BỎ nút Quỹ đội)
            - Có hiệu ứng active:scale-95, transition-all, duration-200 cho haptic visual feedback
            ========================================================= */}
        <nav className="fixed bottom-5 left-3 right-3 max-w-md mx-auto z-40 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-full px-3 py-2 shadow-[0_20px_45px_-10px_rgba(15,23,42,0.6)] border border-slate-800 flex items-center justify-around">
            
            {/* Nút 1: Trang chủ */}
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
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
              className={`flex items-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                activeTab === 'lineup'
                  ? 'bg-white text-slate-900 shadow-md shadow-white/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              {activeTab === 'lineup' && <span>Sa bàn</span>}
            </button>

            {/* Nút 3: Quỹ đội (CHỈ HIỂN THỊ KHI LÀ ADMIN) */}
            {currentUserRole === 'admin' && (
              <button
                onClick={() => setCurrentTab('fund')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
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
              className={`flex items-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
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
              className={`flex items-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
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

      </div>
    </div>
  );
}
