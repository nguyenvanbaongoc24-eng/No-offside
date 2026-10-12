import { useState, useEffect } from 'react';

const INITIAL_USER = {
  id: 'usr-9',
  name: 'Tuấn Hưng',
  number: 9,
  role: 'Tiền Đạo (ST)',
  teamName: 'FC No Offside',
  teamCategory: 'Sân 7 Sài Gòn',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
  fundDebt: 150000,
  isFundPaid: false,
  isCaptain: true, // Only Owner has full root control
  customTitle: 'Đội Trưởng',
  stats: {
    matches: 5,
    goals: 12,
    assists: 4,
    mvp: 2,
    rating: 9.2,
  },
  nextMatchAttendance: 'attending', // 'attending' | 'maybe' | 'absent' | null
};

const INITIAL_TEAM_SETTINGS = {
  teamName: 'FC No Offside',
  teamCategory: 'Sân 7 Sài Gòn',
  logo: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=160&q=80',
  venue: 'Sân bóng Chuyên Việt (18D Cộng Hòa, Tân Bình)',
  schedule: 'Thứ 6 hàng tuần • 18:30',
  appearance: {
    theme: 'light',
    language: 'vi',
    fontFamily: 'Be Vietnam Pro',
    timeFormat: '24h',
    matchReminderNotif: true,
    fundReminderNotif: true
  },
  subAdmins: [
    { 
      id: 101, 
      name: 'Nguyễn Hoàng Hải', 
      number: 10, 
      customTitle: 'Thủ Quỹ', 
      phone: '0988776655',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60' 
    },
    { 
      id: 102, 
      name: 'Đặng Văn Lâm', 
      number: 1, 
      customTitle: 'Đội Phó', 
      phone: '0977889900',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60' 
    },
    { 
      id: 103, 
      name: 'Bầu Thắng', 
      number: 99, 
      customTitle: 'Bầu Đội', 
      phone: '0966554433',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60' 
    }
  ],
  // Yêu cầu 2: Workflow phong Admin cần sự phê duyệt của Owner
  pendingAdminRequests: [
    {
      id: 201,
      name: 'Nguyễn Văn Toàn',
      number: 14,
      role: 'Tiền Đạo Cánh',
      requestedBy: 'Thủ quỹ Hải',
      requestedTitle: 'Đội Phó Kỹ Thuật',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=60',
      time: '20 phút trước'
    }
  ],
  treasurerQr: {
    bankName: 'MB Bank (Quân Đội)',
    accountNumber: '998877665544',
    accountHolder: 'NGUYEN HOANG HAI (THỦ QUỸ)',
    amount: '150.000 đ',
    qrImageUrl: 'https://api.vietqr.io/image/970422-998877665544-compact2.png?amount=150000&addInfo=NO%20OFFSIDE%20DONG%20QUY&accountName=NGUYEN%20HOANG%20HAI'
  }
};

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('no_offside_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [teamSettings, setTeamSettings] = useState(() => {
    const saved = localStorage.getItem('no_offside_team_settings');
    return saved ? JSON.parse(saved) : INITIAL_TEAM_SETTINGS;
  });

  // 3 Cấp bậc phân quyền: 'owner' (Đội trưởng) | 'admin' (Admin phụ) | 'member' (Cầu thủ)
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    const saved = localStorage.getItem('no_offside_role');
    if (saved === 'owner' || saved === 'admin' || saved === 'member') return saved;
    return 'owner'; // Mặc định là Owner
  });

  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    localStorage.setItem('no_offside_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('no_offside_team_settings', JSON.stringify(teamSettings));
  }, [teamSettings]);

  useEffect(() => {
    localStorage.setItem('no_offside_role', currentUserRole);
  }, [currentUserRole]);

  // Chu kỳ đổi vai trò: Owner -> Admin -> Member -> Owner
  const toggleRole = () => {
    setCurrentUserRole(prev => {
      if (prev === 'owner') return 'admin';
      if (prev === 'admin') return 'member';
      return 'owner';
    });
  };

  const setAttendance = (status) => {
    setUser(prev => ({
      ...prev,
      nextMatchAttendance: status
    }));
  };

  const markFundPaid = () => {
    setUser(prev => ({
      ...prev,
      isFundPaid: true,
      fundDebt: 0
    }));
  };

  const resetFund = () => {
    setUser(prev => ({
      ...prev,
      isFundPaid: false,
      fundDebt: 150000
    }));
  };

  const updateMatchStats = (addedGoals = 0, addedAssists = 0) => {
    setUser(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        matches: prev.stats.matches + 1,
        goals: prev.stats.goals + addedGoals,
        assists: prev.stats.assists + addedAssists
      }
    }));
  };

  const updateTreasurerQr = (newQrConfig) => {
    setTeamSettings(prev => ({
      ...prev,
      treasurerQr: {
        ...prev.treasurerQr,
        ...newQrConfig
      }
    }));
  };

  const updateTeamName = (newName) => {
    setTeamSettings(prev => ({
      ...prev,
      teamName: newName
    }));
    setUser(prev => ({
      ...prev,
      teamName: newName
    }));
  };

  const updateTeamSettings = (newSettings) => {
    setTeamSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    if (newSettings.teamName) {
      setUser(prev => ({ ...prev, teamName: newSettings.teamName }));
    }
  };

  const updateSubAdminTitle = (subAdminId, newTitle) => {
    setTeamSettings(prev => ({
      ...prev,
      subAdmins: prev.subAdmins.map(sa => 
        sa.id === subAdminId ? { ...sa, customTitle: newTitle } : sa
      )
    }));
  };

  const addSubAdmin = (newAdmin) => {
    setTeamSettings(prev => ({
      ...prev,
      subAdmins: [...prev.subAdmins, { ...newAdmin, id: Date.now() }]
    }));
  };

  // Giáng cấp/Xóa Admin phụ xuống thành Member
  const removeSubAdmin = (subAdminId) => {
    setTeamSettings(prev => ({
      ...prev,
      subAdmins: prev.subAdmins.filter(sa => sa.id !== subAdminId)
    }));
  };

  // Yêu cầu 2: Từ chức / Nhường quyền Owner cho người khác và giáng mình xuống Member
  const transferOwnership = (targetAdminId) => {
    const targetAdmin = teamSettings.subAdmins.find(sa => sa.id === targetAdminId);
    if (!targetAdmin) return;

    setUser(prev => ({
      ...prev,
      isCaptain: false,
      customTitle: 'Cầu thủ'
    }));

    // Cập nhật người mới làm Owner
    setTeamSettings(prev => ({
      ...prev,
      subAdmins: prev.subAdmins.filter(sa => sa.id !== targetAdminId)
    }));

    // Tự giáng chức xuống Member
    setCurrentUserRole('member');
  };

  // Yêu cầu 2: Owner duyệt phong chức Admin
  const approveAdminRequest = (requestId) => {
    const req = teamSettings.pendingAdminRequests.find(r => r.id === requestId);
    if (!req) return;

    setTeamSettings(prev => ({
      ...prev,
      subAdmins: [
        ...prev.subAdmins,
        {
          id: req.id,
          name: req.name,
          number: req.number,
          customTitle: req.requestedTitle || 'Đội Phó',
          avatar: req.avatar,
          phone: '0901234567'
        }
      ],
      pendingAdminRequests: prev.pendingAdminRequests.filter(r => r.id !== requestId)
    }));
  };

  const rejectAdminRequest = (requestId) => {
    setTeamSettings(prev => ({
      ...prev,
      pendingAdminRequests: prev.pendingAdminRequests.filter(r => r.id !== requestId)
    }));
  };

  const login = (customData) => {
    setUser(prev => ({ ...prev, ...customData }));
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  return {
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
    transferOwnership,
    approveAdminRequest,
    rejectAdminRequest,
    login,
    logout,
  };
}
