import React, { useState } from 'react';
import { Home, Shield, DollarSign, User, QrCode } from 'lucide-react';
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
    <div className="bg-[#0f172a] min-h-screen text-slate-100 flex justify-center selection:bg-emerald-400 selection:text-slate-950 font-sans">
      {/* 1. MOBILE LAYOUT CONTAINER (Khung max-w-md mx-auto min-h-screen relative overflow-hidden) */}
      <div className="w-full max-w-md min-h-screen relative overflow-hidden px-3.5 bg-gradient-to-b from-[#0f172a] via-[#111c35] to-[#0a0f1d] shadow-2xl flex flex-col justify-between">
        
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
          ) : (
            <Dashboard 
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

        {/* Floating Glassmorphism Bottom Navigation Dock */}
        <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-40">
          <div className="glass-panel-elevated rounded-2xl p-2 border border-white/15 flex items-center justify-around shadow-2xl">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                currentTab === 'dashboard'
                  ? 'text-emerald-400 font-bold bg-emerald-500/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Trang chủ</span>
            </button>

            <button
              onClick={() => setCurrentTab('lineup')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                currentTab === 'lineup'
                  ? 'text-emerald-400 font-bold bg-emerald-500/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px]">Sa bàn</span>
            </button>

            <button
              onClick={() => {
                if (currentTab !== 'dashboard') setCurrentTab('dashboard');
              }}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200"
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px]">Quỹ đội</span>
            </button>

            <button
              onClick={() => setCurrentTab(currentTab === 'signin' ? 'dashboard' : 'signin')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                currentTab === 'signin'
                  ? 'text-emerald-400 font-bold bg-emerald-500/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px]">Tài khoản</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
