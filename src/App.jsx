import React, { useState } from 'react';
import { Home, Shield, Wallet, User } from 'lucide-react';
import PlayerDashboard from './pages/PlayerDashboard';
import LineupBuilder from './pages/LineupBuilder';
import SignIn from './pages/SignIn';
import Profile from './pages/Profile';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
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

  return (
    <div className="bg-slate-100 min-h-screen text-gray-900 flex justify-center font-['Be_Vietnam_Pro'] antialiased selection:bg-green-600 selection:text-white">
      {/* Mobile Layout Frame (max-w-md mx-auto min-h-screen bg-slate-50 relative) */}
      <div className="w-full max-w-md min-h-screen relative bg-slate-50 shadow-xl flex flex-col justify-between overflow-x-hidden pb-24">
        
        {/* Dynamic Screen View */}
        <main className="flex-1">
          {currentTab === 'lineup' ? (
            <LineupBuilder onBack={() => setCurrentTab('dashboard')} />
          ) : currentTab === 'profile' ? (
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
            />
          )}
        </main>

        {/* FLOATING BOTTOM NAVIGATION */}
        <nav className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto z-50 pointer-events-auto">
          <div className="bg-gray-900 text-white rounded-full px-5 py-3 shadow-[0_20px_45px_-10px_rgba(17,24,39,0.5)] border border-gray-800 flex items-center justify-between">
            
            {/* Tab 1: Trang chủ */}
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
                currentTab === 'dashboard'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              {currentTab === 'dashboard' && <span>Trang chủ</span>}
            </button>

            {/* Tab 2: Sa bàn */}
            <button
              onClick={() => setCurrentTab('lineup')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
                currentTab === 'lineup'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              {currentTab === 'lineup' && <span>Sa bàn</span>}
            </button>

            {/* Tab 3: Quỹ đội */}
            <button
              onClick={() => {
                if (currentTab !== 'dashboard') setCurrentTab('dashboard');
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-all duration-200"
              title="Quỹ đội"
            >
              <Wallet className="w-4 h-4 shrink-0" />
            </button>

            {/* Tab 4: Tài khoản (Mở màn hình Hồ sơ Cầu thủ Profile) */}
            <button
              onClick={() => setCurrentTab('profile')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
                currentTab === 'profile'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              {currentTab === 'profile' && <span>Tài khoản</span>}
            </button>

          </div>
        </nav>

      </div>
    </div>
  );
}
