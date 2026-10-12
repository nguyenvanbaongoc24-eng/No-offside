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
  stats: {
    matches: 5,
    goals: 12,
    assists: 4,
    mvp: 2,
    rating: 9.2,
  },
  nextMatchAttendance: 'attending', // 'attending' | 'maybe' | 'absent' | null
};

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('no_offside_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [currentUserRole, setCurrentUserRole] = useState(() => {
    return localStorage.getItem('no_offside_role') || 'player'; // 'player' | 'admin'
  });

  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    localStorage.setItem('no_offside_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('no_offside_role', currentUserRole);
  }, [currentUserRole]);

  const toggleRole = () => {
    setCurrentUserRole(prev => (prev === 'admin' ? 'player' : 'admin'));
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
    login,
    logout,
  };
}
