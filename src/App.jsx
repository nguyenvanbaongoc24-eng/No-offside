import React, { useState } from 'react';
import { Home, Shield, DollarSign, User } from 'lucide-react';
import PlayerDashboard from './pages/PlayerDashboard';
import Dashboard from './pages/Dashboard';
import LineupBuilder from './pages/LineupBuilder';
import SignIn from './pages/SignIn';
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

  return (
    <div className="bg-[#0f172a] min-h-screen text-slate-100 flex justify-center selection:bg-primary selection:text-slate-950 font-sans">
      {/* 1. MOBILE LAYOUT CONTAINER (Khung max-w-md mx-auto min-h-screen relative overflow-hidden pb-24) */}
      <div className="w-full max-w-md min-h-screen relative overflow-hidden px-3.5 bg-gradient-to-b from-[#0f172a] via-[#111c35] to-[#0a0f1d] shadow-2xl flex flex-col justify-between pb-24">
        
        {/* Dynamic Screen Rendering */}
        <main className="flex-1">
          {currentTab === 'signin' ? (
            <SignIn 
              onLoginSuccess={() => {
                login({ name: 'Tuấn Hưng', number: 9 });
                setCurrentTab('dashboard');
              }} 
            />
          ) : currentTab === 'lineup' ? (
            <LineupBuilder onBack={() => setCurrentTab('dashboard')} />
          ) : currentUserRole === 'admin' ? (
            <Dashboard 
              user={user} 
              currentUserRole={currentUserRole}
              onToggleRole={toggleRole}
              onAttendanceChange={setAttendance}
              onMarkPaid={markFundPaid}
              onResetPaid={resetFund}
              onNavigate={(tab) => setCurrentTab(tab)}
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

        {/* 5. FIXED BOTTOM NAVIGATION: fixed bottom-0 w-full z-50, backdrop-blur-xl bg-slate-900/80 + border-t */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 backdrop-blur-xl bg-slate-900/80 border-t border-white/10 px-5 py-2.5 flex items-center justify-between">
          {/* Tab 1: Trang chủ (Active xanh neon) */}
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'dashboard'
                ? 'text-primary font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Trang chủ</span>
            {currentTab === 'dashboard' && (
              <span className="w-1 h-1 rounded-full bg-primary -mt-0.5 shadow-[0_0_6px_#00FF66]"></span>
            )}
          </button>

          {/* Tab 2: Sa bàn */}
          <button
            onClick={() => setCurrentTab('lineup')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'lineup'
                ? 'text-primary font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px]">Sa bàn</span>
            {currentTab === 'lineup' && (
              <span className="w-1 h-1 rounded-full bg-primary -mt-0.5 shadow-[0_0_6px_#00FF66]"></span>
            )}
          </button>

          {/* Tab 3: Quỹ đội */}
          <button
            onClick={() => {
              if (currentTab !== 'dashboard') setCurrentTab('dashboard');
              // Smooth scroll to finance card
              window.scrollTo({ top: 350, behavior: 'smooth' });
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-[10px]">Quỹ đội</span>
          </button>

          {/* Tab 4: Tài khoản */}
          <button
            onClick={() => setCurrentTab(currentTab === 'signin' ? 'dashboard' : 'signin')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              currentTab === 'signin'
                ? 'text-primary font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Tài khoản</span>
            {currentTab === 'signin' && (
              <span className="w-1 h-1 rounded-full bg-primary -mt-0.5 shadow-[0_0_6px_#00FF66]"></span>
            )}
          </button>
        </nav>

      </div>
    </div>
  );
}
