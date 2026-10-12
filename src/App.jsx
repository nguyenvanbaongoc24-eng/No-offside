import React, { useState } from 'react';
import { Home, Shield, Wallet, MessageSquare, User, Loader2 } from 'lucide-react';
import PlayerDashboard from './pages/PlayerDashboard';
import LineupBuilder from './pages/LineupBuilder';
import FundManagement from './pages/FundManagement';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import CreateTeam from './pages/CreateTeam';
import InviteLanding from './pages/InviteLanding';
import Login from './pages/Login';
import EmptyTeam from './pages/EmptyTeam';
import TeamSettings from './pages/TeamSettings';
import { useAuth } from './hooks/useAuth';
import { useAppearance } from './hooks/useAppearance';
import { useDialogAccessibility } from './hooks/useDialogAccessibility';
import { readStored } from './lib/storage';

export default function App() {
  const auth = useAuth();
  const [tab, setTab] = useState(window.location.pathname.startsWith('/invite/') ? 'invite-landing' : 'dashboard');
  const [showNotices, setShowNotices] = useState(false);
  useAppearance(auth.teamSettings.appearance);
  useDialogAccessibility();
  const leader = ['owner','admin'].includes(auth.currentUserRole);
  const activeTab = (!leader && tab === 'fund') || (auth.currentUserRole !== 'owner' && tab === 'team-settings') ? 'dashboard' : tab;
  const navigate = target => { setTab(target); window.scrollTo({top:0,behavior:'instant'}); };
  let inviteCode = window.location.pathname.split('/invite/')[1]?.split('/')[0] || auth.teamSettings.id;
  try { inviteCode = decodeURIComponent(inviteCode); } catch { inviteCode = ''; }
  const inviteTeam = readStored('no_offside_team_' + inviteCode, null) || (inviteCode === auth.teamSettings.id ? auth.teamSettings : null);
  if (auth.authLoading) return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" aria-label="Đang kiểm tra phiên đăng nhập"/></div>;
  if (!auth.isLoggedIn) return <Login onLoginSuccess={profile => { auth.login(profile); if (tab !== 'invite-landing') navigate('dashboard'); }}/>;
  const fundProps = { funds: auth.funds, onChangeFunds: auth.setFunds, onApprove: auth.approveFundPayment };
  const shared = { user: auth.user, currentUserRole: auth.currentUserRole, onNavigate: navigate, demoSession: auth.demoSession };
  const tabs = [{id:'dashboard',label:'Trang chủ',Icon:Home},{id:'lineup',label:'Sa bàn',Icon:Shield},...(leader ? [{id:'fund',label:'Quỹ đội',Icon:Wallet}] : []),{id:'chat',label:'Chat',Icon:MessageSquare},{id:'profile',label:'Tài khoản',Icon:User}];
  return <div className="app-shell bg-slate-100 min-h-screen text-gray-900 flex justify-center antialiased">
    <div className="app-frame w-full max-w-md min-h-screen bg-slate-50 relative pb-safe-nav">
      {auth.storageError && <div role="alert" className="p-3 bg-rose-50 text-rose-700">{auth.storageError}</div>}
      <div className="session-banner">{auth.demoSession ? 'Bản trải nghiệm • dữ liệu lưu trên thiết bị' : 'Dữ liệu đội đang lưu trên thiết bị này'}</div>
      <main>
        {activeTab === 'create-team' ? <CreateTeam onTeamCreated={data=>{auth.createTeam(data);navigate('dashboard');}} onBack={()=>navigate('profile')}/>
        : activeTab === 'invite-landing' ? inviteTeam ? <InviteLanding teamData={{name:inviteTeam.teamName, captain:inviteTeam.members.find(m=>m.roleType==='owner')?.name || 'Đội trưởng',membersCount:inviteTeam.members.length,category:inviteTeam.teamCategory,venue:inviteTeam.venue,matchSchedule:inviteTeam.schedule,logo:inviteTeam.logo}} authenticated onJoinSuccess={profile=>{auth.joinTeam(inviteTeam,profile);navigate('dashboard');history.replaceState(null,'','/');}} onBackToApp={()=>navigate('profile')}/> : <div className="p-8"><h1 className="text-xl font-bold">Không tìm thấy đội bóng</h1><p className="mt-3 text-slate-600">Liên kết mời chưa có dữ liệu trên thiết bị này. Liên hệ đội trưởng để kiểm tra mã mời. Đồng bộ liên thiết bị cần backend được cấu hình.</p><button className="primary-button mt-5" onClick={()=>navigate('dashboard')}>Về trang chủ</button></div>
        : activeTab === 'team-settings' ? <TeamSettings teamSettings={auth.teamSettings} onUpdateTeamSettings={auth.updateTeamSettings} onBack={()=>navigate('profile')} currentUserRole={auth.currentUserRole}/>
        : activeTab === 'lineup' ? <LineupBuilder key={auth.teamSettings.id} teamId={auth.teamSettings.id} currentUserRole={auth.currentUserRole} members={auth.teamSettings.members} onBack={()=>navigate('dashboard')}/>
        : activeTab === 'fund' ? <FundManagement {...fundProps} treasurerQr={auth.teamSettings.treasurerQr} onUpdateTreasurerQr={auth.updateTreasurerQr} currentUserRole={auth.currentUserRole} onBack={()=>navigate('dashboard')}/>
        : activeTab === 'chat' ? <Chat key={auth.teamSettings.id} teamId={auth.teamSettings.id} user={auth.user} members={auth.teamSettings.members} birthdayEnabled={auth.teamSettings.appearance.birthdayReportEnabled !== false}/>
        : activeTab === 'profile' ? <Profile {...shared} teamSettings={auth.teamSettings} onToggleRole={auth.demoSession ? auth.toggleRole : undefined} onLogout={auth.logout} onUpdateProfile={auth.updateProfile} onUpdateTeamName={auth.updateTeamName} onUpdateSubAdminTitle={auth.updateSubAdminTitle} onAddSubAdmin={auth.addSubAdmin} onRequestAdmin={auth.requestAdmin} onRemoveSubAdmin={auth.removeSubAdmin} onTransferOwnership={auth.transferOwnership} onApproveAdminRequest={auth.approveAdminRequest} onRejectAdminRequest={auth.rejectAdminRequest}/>
        : !auth.activeMatch ? <EmptyTeam teamSettings={auth.teamSettings} leader={leader} onSaveMatch={auth.saveMatch} onNavigate={navigate}/> : <PlayerDashboard {...shared} {...fundProps} members={auth.teamSettings.members} teamId={auth.teamSettings.id} teamSettings={auth.teamSettings} balance={auth.balance} activeMatch={auth.activeMatch} matches={auth.matches} attendance={auth.attendance} reports={auth.reports} onSaveMatch={auth.saveMatch} onSetMatchStatus={auth.setMatchStatus} onSelectMatch={auth.selectMatch} onAddNotice={auth.addNotice} onToggleRole={auth.demoSession ? auth.toggleRole : undefined} onAttendanceChange={auth.setAttendance} onMarkPaid={auth.markFundPaid} onResetPaid={auth.resetFund} onOpenNotifications={()=>setShowNotices(true)} treasurerQr={auth.teamSettings.treasurerQr} onUpdateMatchStats={auth.updateMatchStats} onRemoveMember={auth.removeMember} onAddMember={auth.addMember}/>}
      </main>
      {!['create-team','invite-landing','team-settings'].includes(activeTab) && <nav className="bottom-navigation" aria-label="Điều hướng chính"><div className="nav-items">{tabs.map(({id,label,Icon})=><button key={id} aria-label={label} aria-current={activeTab===id?'page':undefined} onClick={()=>navigate(id)} className="nav-item"><Icon size={20}/><span>{label}</span></button>)}</div></nav>}
      {showNotices && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm p-4 grid place-items-center"><section className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[80dvh] overflow-auto"><h2 className="text-xl font-semibold mb-4">Thông báo đội</h2>{auth.notices.length ? auth.notices.map(n=><article key={n.id} className="border-b border-slate-100 py-3"><h3 className="font-semibold">{n.title}</h3><p className="text-sm mt-1 text-slate-600">{n.content}</p><time className="text-xs text-slate-500">{n.time}</time></article>) : <p className="text-slate-500 py-5">Chưa có thông báo mới.</p>}<button aria-label="Đóng" className="primary-button w-full mt-4" onClick={()=>setShowNotices(false)}>Đóng</button></section></div>}
    </div>
  </div>;
}
