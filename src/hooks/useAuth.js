import { useState, useEffect } from "react";
import { readStored, writeStored } from "../lib/storage";
import { usePersistentState } from "./usePersistentState";
import { supabase } from "../lib/supabase";
import {
  uid,
  isLeaderRole,
  fundBalance,
  approvePayment,
  upsertReport,
  reportTotals,
  promoteMember,
  transferOwner,
  monthKey,
  deleteTeamMatch,
  restoreTeamMatch,
} from "../lib/teamModel";
import { defaultLate } from "../lib/governance";
import { getPendingJoin, clearPendingJoin, savePendingJoin } from "../lib/pendingJoin";

function readSession(key, fallback = null) {
  try {
    if (typeof window !== "undefined" && window?.sessionStorage?.getItem) {
      return window.sessionStorage.getItem(key) ?? fallback;
    }
  } catch {}
  return fallback;
}

function writeSession(key, value) {
  try {
    if (typeof window !== "undefined" && window?.sessionStorage?.setItem) {
      window.sessionStorage.setItem(key, value);
    }
  } catch {}
}

function removeSession(key) {
  try {
    if (typeof window !== "undefined" && window?.sessionStorage?.removeItem) {
      window.sessionStorage.removeItem(key);
    }
  } catch {}
}

const INITIAL_USER = {
  id: "usr-9",
  name: "Tuấn Hưng",
  number: 9,
  role: "Tiền Đạo (ST)",
  teamName: "FC No Offside",
  teamCategory: "Sân 7 Sài Gòn",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
  fundDebt: 150000,
  isFundPaid: false,
  isCaptain: true, // Only Owner has full root control
  customTitle: "Đội Trưởng",
  stats: {
    matches: 5,
    goals: 12,
    assists: 4,
    mvp: 2,
    rating: 9.2,
  },
  nextMatchAttendance: "attending", // 'attending' | 'maybe' | 'absent' | null
};

const INITIAL_MEMBERS = [
  {
    id: "usr-9",
    name: "Tuấn Hưng (Bạn)",
    number: 9,
    role: "Tiền Đạo (ST)",
    roleType: "owner",
    customTitle: "Đội Trưởng",
    birthday: "1995-12-05",
    phone: "0909123456",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80",
    joinedDate: "Tháng 01/2024",
  },
  {
    id: 101,
    name: "Nguyễn Hoàng Hải",
    number: 10,
    role: "Tiền Vệ (CM)",
    roleType: "admin",
    customTitle: "Thủ Quỹ",
    birthday: "1996-03-12",
    phone: "0988776655",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 02/2024",
  },
  {
    id: 102,
    name: "Đặng Văn Lâm",
    number: 1,
    role: "Thủ Môn (GK)",
    roleType: "admin",
    customTitle: "Đội Phó",
    birthday: "1993-08-13",
    phone: "0977889900",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 01/2024",
  },
  {
    id: 103,
    name: "Bầu Thắng",
    number: 99,
    role: "Trung Vệ (CB)",
    roleType: "admin",
    customTitle: "Bầu Đội",
    birthday: "1988-10-25",
    phone: "0966554433",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 01/2024",
  },
  {
    id: 301,
    name: "Nguyễn Quang Hải",
    number: 19,
    role: "Tiền Vệ Công (CAM)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1997-10-13", // Sinh nhật hôm nay 13/10!
    phone: "0912345678",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 03/2024",
  },
  {
    id: 302,
    name: "Nguyễn Hoàng Đức",
    number: 14,
    role: "Tiền Vệ Trung Tâm (CM)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1998-10-18", // Tháng 10
    phone: "0912345679",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 03/2024",
  },
  {
    id: 303,
    name: "Nguyễn Tiến Linh",
    number: 22,
    role: "Tiền Đạo Cắm (ST)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1997-10-20", // Tháng 10
    phone: "0912345680",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 04/2024",
  },
  {
    id: 304,
    name: "Quế Ngọc Hải",
    number: 3,
    role: "Trung Vệ (CB)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1993-05-15",
    phone: "0912345681",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 01/2024",
  },
  {
    id: 305,
    name: "Đoàn Văn Hậu",
    number: 5,
    role: "Hậu Vệ Trái (LB)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1999-04-19",
    phone: "0912345682",
    avatar:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 02/2024",
  },
  {
    id: 306,
    name: "Đỗ Duy Mạnh",
    number: 28,
    role: "Trung Vệ (CB)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1996-09-29",
    phone: "0912345683",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 02/2024",
  },
  {
    id: 307,
    name: "Vũ Văn Thanh",
    number: 17,
    role: "Hậu Vệ Phải (RB)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1996-04-14",
    phone: "0912345684",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 03/2024",
  },
  {
    id: 308,
    name: "Bùi Tiến Dũng",
    number: 4,
    role: "Trung Vệ (CB)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1995-10-02",
    phone: "0912345685",
    avatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 02/2024",
  },
  {
    id: 309,
    name: "Lương Xuân Trường",
    number: 6,
    role: "Tiền Vệ Trung Tâm (CM)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1995-04-28",
    phone: "0912345686",
    avatar:
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 04/2024",
  },
  {
    id: 310,
    name: "Nguyễn Văn Toàn",
    number: 21,
    role: "Tiền Đạo Cánh (RW)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1996-04-12",
    phone: "0912345687",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 05/2024",
  },
  {
    id: 311,
    name: "Hồ Tấn Tài",
    number: 13,
    role: "Hậu Vệ Phải (RB)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1997-11-06",
    phone: "0912345688",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 05/2024",
  },
  {
    id: 312,
    name: "Bùi Tấn Trường",
    number: 23,
    role: "Thủ Môn (GK)",
    roleType: "member",
    customTitle: "Cầu thủ",
    birthday: "1986-02-19",
    phone: "0912345689",
    avatar:
      "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=80&auto=format&fit=crop&q=60",
    joinedDate: "Tháng 01/2024",
  },
];

const INITIAL_TEAM_SETTINGS = {
  id: "fc-no-offside-99",
  teamName: "FC No Offside",
  teamCategory: "Sân 7 Sài Gòn",
  logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=160&q=80",
  venue: "Sân bóng Chuyên Việt (18D Cộng Hòa, Tân Bình)",
  schedule: "Thứ 6 hàng tuần • 18:30",
  members: INITIAL_MEMBERS,
  appearance: {
    theme: "light",
    language: "vi",
    fontFamily: "system",
    timeFormat: "24h",
    matchReminderNotif: true,
    fundReminderNotif: true,
  },
  subAdmins: [
    {
      id: 101,
      name: "Nguyễn Hoàng Hải",
      number: 10,
      customTitle: "Thủ Quỹ",
      phone: "0988776655",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60",
    },
    {
      id: 102,
      name: "Đặng Văn Lâm",
      number: 1,
      customTitle: "Đội Phó",
      phone: "0977889900",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60",
    },
    {
      id: 103,
      name: "Bầu Thắng",
      number: 99,
      customTitle: "Bầu Đội",
      phone: "0966554433",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60",
    },
  ],
  // Yêu cầu 2: Workflow phong Admin cần sự phê duyệt của Owner
  pendingAdminRequests: [
    {
      id: 201,
      memberId: 301,
      name: "Nguyễn Quang Hải",
      number: 19,
      role: "Tiền Đạo Cánh",
      requestedBy: "Thủ quỹ Hải",
      requestedTitle: "Đội Phó Kỹ Thuật",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=60",
      time: "20 phút trước",
    },
  ],
  treasurerQr: {
    bankCode: "970422",
    bankName: "MB Bank (Quân Đội)",
    accountNumber: "998877665544",
    accountHolder: "NGUYEN HOANG HAI (THỦ QUỸ)",
    amount: "150.000 đ",
    qrImageUrl:
      "https://api.vietqr.io/image/970422-998877665544-compact2.png?amount=150000&addInfo=NO%20OFFSIDE%20DONG%20QUY&accountName=NGUYEN%20HOANG%20HAI",
  },
};

const INITIAL_FUNDS = {
  transactions: [
    {
      id: 1,
      title: "Thu quỹ tháng 10 (14 thành viên)",
      amount: 2100000,
      type: "income",
      date: "12/10/2026",
      author: "Thủ quỹ Hải",
    },
    {
      id: 2,
      title: "Tiền thuê Sân Chuyên Việt (Tháng 9)",
      amount: 1200000,
      type: "expense",
      date: "10/10/2026",
      author: "Thủ quỹ Hải",
    },
    {
      id: 3,
      title: "Mua 2 lốc nước khoáng Lavie",
      amount: 120000,
      type: "expense",
      date: "08/10/2026",
      author: "Thủ quỹ Hải",
    },
    {
      id: 4,
      title: "Mua 2 quả bóng Động Lực UHV 2.05",
      amount: 980000,
      type: "expense",
      date: "01/10/2026",
      author: "Đội trưởng",
    },
    {
      id: 5,
      title: "Thu tiền tài trợ áo đấu mới",
      amount: 3500000,
      type: "income",
      date: "28/09/2026",
      author: "Bầu Thắng",
    },
    {
      id: 6,
      title: "In ấn logo và số áo thi đấu",
      amount: 850000,
      type: "expense",
      date: "26/09/2026",
      author: "Thủ quỹ Hải",
    },
  ],
  pendingApprovals: [
    {
      id: 1,
      name: "Nguyễn Quang Hải (#19)",
      amount: 150000,
      time: "10 phút trước",
      bank: "Vietcombank",
      memo: "NO OFFSIDE SO 19 DONG QUY",
    },
    {
      id: 2,
      name: "Đoàn Văn Hậu (#5)",
      amount: 150000,
      time: "35 phút trước",
      bank: "MB Bank",
      memo: "NO OFFSIDE SO 5 DONG QUY",
    },
    {
      id: 3,
      name: "Bùi Tiến Dũng (#4)",
      amount: 150000,
      time: "1 giờ trước",
      bank: "Techcombank",
      memo: "NO OFFSIDE SO 4 DONG QUY",
    },
  ].map((p) => ({
    ...p,
    playerId: { 1: 301, 2: 305, 3: 308 }[p.id],
    month: "2026-10",
  })),
  debtors: [301, 305, 308, "usr-9", 303, 311].map((playerId, index) => {
    const player = INITIAL_MEMBERS.find((m) => m.id === playerId);
    return {
      id: index + 1,
      playerId,
      name: `${player.name} (#${player.number})`,
      phone: player.phone,
      amount: 150000,
      status: "unpaid",
      month: "2026-10",
    };
  }),
};
const INITIAL_MATCH = {
  id: "match-2026-10-24",
  title: "Kèo sân 7 — FC Hàng Xóm",
  category: "Sân 7",
  datetime: "2026-10-24T18:30",
  deadline: "2026-10-24T12:00",
  venue: "Sân Chuyên Việt (Sân 3) - 18D Cộng Hòa",
  penaltyEnabled: true,
  penaltyAmount: "50.000 đ",
  status: "upcoming",
};

export function useAuth() {
  const [demoSession, setDemoSession] = usePersistentState(
    "no_offside_demo_session",
    false,
  );
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined" || !window?.sessionStorage?.getItem) {
      return true;
    }
    return window.sessionStorage.getItem("no_offside_app_unlocked") === "true";
  });
  const [authSession, setAuthSession] = useState(null);
  const [verifiedAccount, setVerifiedAccount] = useState(null);
  const [legacyAccount] = useState(
    () => readStored("no_offside_user", INITIAL_USER).id,
  );
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [storageError, setStorageError] = useState("");
  const [deletedMatch, setDeletedMatch] = useState(null);
  const [user, setUser] = usePersistentState("no_offside_user", INITIAL_USER);
  const [teamSettings, setTeamSettings] = usePersistentState(
    "no_offside_team_settings",
    () => {
      const saved = readStored(
        "no_offside_team_settings",
        INITIAL_TEAM_SETTINGS,
      );
      return {
        ...INITIAL_TEAM_SETTINGS,
        ...saved,
        id: saved.id || "fc-no-offside-99",
        appearance: {
          ...INITIAL_TEAM_SETTINGS.appearance,
          ...saved.appearance,
        },
        members: Array.isArray(saved.members) ? saved.members : INITIAL_MEMBERS,
      };
    },
  );
  const [currentUserRole, setCurrentUserRole] = usePersistentState(
    "no_offside_role",
    "owner",
  );
  const [teams, setTeams] = usePersistentState("no_offside_teams_v1", {});
  const [dbMemberships, setDbMemberships] = useState([]);
  const loadDatabaseMemberships = async () => {
    if (!supabase || typeof supabase.rpc !== "function" || !authSession?.user?.id) {
      return [];
    }
    try {
      const { data, error } = await supabase.rpc("no_gov_my_memberships");
      if (!error && Array.isArray(data)) {
        setDbMemberships(data);
        return data;
      }
    } catch {}
    return [];
  };

  useEffect(() => {
    if (authSession?.user?.id && !demoSession) {
      loadDatabaseMemberships();
      if (authSession.access_token && typeof fetch !== "undefined") {
        fetch("/api/teams", {
          headers: { Authorization: `Bearer ${authSession.access_token}` },
        })
          .then((r) => r.json())
          .then((res) => {
            if (res?.success && res.team) {
              setTeamSettings(res.team);
              if (res.data) {
                setTeams((prev) => ({
                  ...prev,
                  [authSession.user.id + "::" + res.team.id]: res.data,
                }));
              }
              if (res.role) {
                setCurrentUserRole(res.role);
              }
              setDbMemberships((prev) => {
                if (prev.some((m) => m.team_id === res.team.id)) return prev;
                return [
                  ...prev,
                  {
                    team_id: res.team.id,
                    role: res.role || "owner",
                    name: res.team.teamName,
                  },
                ];
              });
              writeStored("no_offside_team_" + res.team.id, res.team);
              writeStored("no_offside_workspace_" + authSession.user.id, {
                user,
                teamSettings: res.team,
              });
            }
          })
          .catch(() => {});
      }
    } else {
      setDbMemberships([]);
    }
  }, [authSession?.user?.id, authSession?.access_token, demoSession]);

  const teamId = teamSettings.id || "fc-no-offside-99";
  const accountId = demoSession ? "demo" : authSession?.user.id || "anonymous";
  const dataKey = accountId + "::" + teamId;
  const data = teams[dataKey] ||
    (demoSession ||
    (accountId === legacyAccount && teamSettings.ownerId === accountId)
      ? teams[teamId]
      : null) || {
      funds: demoSession
        ? INITIAL_FUNDS
        : { transactions: [], pendingApprovals: [], debtors: [] },
      matches: demoSession ? [INITIAL_MATCH] : [],
      activeMatchId: demoSession ? INITIAL_MATCH.id : null,
      attendance: {},
      reports: {},
      notices: [],
    };
  const funds = data.funds;
  const activeMatch =
    data.matches.find((m) => m.id === data.activeMatchId && !m.archivedAt) ||
    data.matches.find((m) => !m.archivedAt);
  const setData = (fn) =>
    setTeams((prev) => ({ ...prev, [dataKey]: fn(prev[dataKey] || data) }));
  const setFunds = (fn) => {
    if (!isLeaderRole(currentUserRole)) throw new Error("Không có quyền sửa quỹ.");
    const nextFunds = typeof fn === "function" ? fn(data.funds) : fn;
    const nextTeams = { ...teams, [dataKey]: { ...data, funds:nextFunds } };
    if (!writeStored("no_offside_teams_v1",nextTeams)) throw new Error("Không lưu được quỹ trên thiết bị. Kiểm tra dung lượng rồi thử lại.");
    setTeams(nextTeams);
  };
  const leader = isLeaderRole(currentUserRole);

  // Persist team business data (funds, matches, attendance) to cloud storage
  useEffect(() => {
    if (
      !authSession?.access_token ||
      demoSession ||
      !teamSettings?.id ||
      teamSettings.id.startsWith("workspace_") ||
      typeof fetch === "undefined"
    )
      return;
    const currentData = teams[dataKey];
    if (!currentData) return;

    const timer = setTimeout(() => {
      fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          action: "sync-data",
          teamId: teamSettings.id,
          data: currentData,
        }),
      }).catch(() => {});
    }, 1000);

    return () => clearTimeout(timer);
  }, [teams, dataKey, teamSettings?.id, authSession?.access_token, demoSession]);

  useEffect(() => {
    setDeletedMatch(null);
  }, [teamId, user.id]);
  useEffect(() => {
    if (!deletedMatch) return;
    const timeout = setTimeout(() => setDeletedMatch(null), 10000);
    return () => clearTimeout(timeout);
  }, [deletedMatch]);
  useEffect(() => {
    if (!user.baseStats) return;
    const stats = reportTotals(user.baseStats, data.reports[user.id] || {});
    if (
      ["matches", "goals", "assists"].some(
        (key) => stats[key] !== user.stats[key],
      )
    )
      setUser((prev) => ({ ...prev, stats }));
  }, [data.reports, user.id, user.baseStats, user.stats]);

  useEffect(() => {
    if (user.id === "fc-no-offside-99")
      setUser((prev) => ({ ...prev, id: "usr-9" }));
  }, [user.id]);

  useEffect(() => {
    if (teamId !== "fc-no-offside-99") return;
    setTeamSettings((prev) => {
      const duplicate = prev.members.some(
        (m) => m.id === 310 && m.number === 9,
      );
      const staleRequest = prev.pendingAdminRequests.some(
        (r) => r.id === 201 && r.name !== "Nguyễn Quang Hải",
      );
      if (!duplicate && !staleRequest) return prev;
      return {
        ...prev,
        members: prev.members.map((m) =>
          m.id === 310 && m.number === 9 ? { ...m, number: 21 } : m,
        ),
        pendingAdminRequests: prev.pendingAdminRequests.map((r) =>
          r.id === 201
            ? { ...r, memberId: 301, name: "Nguyễn Quang Hải", number: 19 }
            : r,
        ),
      };
    });
  }, [teamId]);

  useEffect(() => {
    const listener = (event) => setStorageError(event.detail);
    window.addEventListener("storage-error", listener);
    return () => window.removeEventListener("storage-error", listener);
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (live) {
          const session = data.session;
          if (session) {
            const userId = session.user?.id;
            const isAutoLogin =
              userId &&
              Boolean(readStored("no_offside_autologin_" + userId, false)) &&
              readStored("no_offside_last_autologin_account", null) === userId;
            const hasSessionUnlock =
              typeof window === "undefined" ||
              !window?.sessionStorage?.getItem ||
              readSession("no_offside_app_unlocked") === "true";

            if (isAutoLogin || hasSessionUnlock) {
              if (typeof supabase.auth.getUser === "function") {
                supabase.auth
                  .getUser()
                  .then(({ data: userData, error: userError }) => {
                    if (!live) return;
                    if (userError || !userData?.user?.id) {
                      supabase.auth.signOut({ scope: "local" });
                      removeSession("no_offside_app_unlocked");
                      setAuthSession(null);
                      setIsUnlocked(false);
                      setVerifiedAccount(null);
                      setAuthLoading(false);
                      return;
                    }
                    setAuthSession(session);
                    setIsUnlocked(true);
                    setVerifiedAccount(userData.user.id);
                    if (isAutoLogin) writeSession("no_offside_app_unlocked", "true");
                    setDemoSession(false);
                    setAuthLoading(false);
                  })
                  .catch(() => {
                    if (!live) return;
                    supabase.auth.signOut({ scope: "local" });
                    removeSession("no_offside_app_unlocked");
                    setAuthSession(null);
                    setIsUnlocked(false);
                    setAuthLoading(false);
                  });
                return;
              }
              setAuthSession(session);
              setIsUnlocked(true);
              if (isAutoLogin) writeSession("no_offside_app_unlocked", "true");
              setDemoSession(false);
            } else {
              setAuthSession(null);
              setIsUnlocked(false);
              supabase.auth.signOut({ scope: "local" });
            }
          } else {
            setAuthSession(null);
            setIsUnlocked(false);
          }
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (live) setAuthLoading(false);
      });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (live) {
          if (session) {
            const userId = session.user?.id;
            const isAutoLogin =
              userId &&
              Boolean(readStored("no_offside_autologin_" + userId, false)) &&
              readStored("no_offside_last_autologin_account", null) === userId;
            const hasSessionUnlock =
              typeof window === "undefined" ||
              !window?.sessionStorage?.getItem ||
              readSession("no_offside_app_unlocked") === "true";

            if (event === "SIGNED_IN" || isAutoLogin || hasSessionUnlock) {
              setAuthSession(session);
              setIsUnlocked(true);
              writeSession("no_offside_app_unlocked", "true");
              setDemoSession(false);
            } else {
              setAuthSession(null);
              setIsUnlocked(false);
            }
          } else {
            setAuthSession(null);
            setIsUnlocked(false);
          }
          setAuthLoading(false);
        }
      },
    );
    return () => {
      live = false;
      subscription.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!authSession || demoSession) return;
    const account = authSession.user;
    if (user.id !== account.id) {
      const saved = readStored("no_offside_workspace_" + account.id, null);
      if (saved?.user) {
        if (account.email) saved.user.email = account.email;
        if (account.user_metadata?.username) saved.user.username = account.user_metadata.username;
      }
      const profile = saved?.user || {
        ...INITIAL_USER,
        id: account.id,
        name:
          account.user_metadata?.full_name ||
          account.user_metadata?.name ||
          (account.email ? account.email.split("@")[0] : "Cầu thủ mới"),
        username:
          account.user_metadata?.username ||
          (account.email ? account.email.split("@")[0] : ""),
        avatar:
          account.user_metadata?.avatar_url ||
          account.user_metadata?.picture ||
          INITIAL_USER.avatar,
        email: account.email || account.user_metadata?.email || "",
        phone: account.phone || account.user_metadata?.phone || "",
        phoneVerified: false,
        teamName: "Đội của tôi",
        fundDebt: 0,
        isFundPaid: false,
        isCaptain: false,
        customTitle: "Cầu thủ",
        stats: { matches: 0, goals: 0, assists: 0, mvp: 0, rating: 0 },
      };
      const settings = saved?.teamSettings || {
        ...INITIAL_TEAM_SETTINGS,
        id: "workspace_" + account.id,
        teamName: "Đội của tôi",
        ownerId: "",
        members: [],
        subAdmins: [],
        pendingAdminRequests: [],
        treasurerQr: {
          bankName: "",
          bankCode: "970422",
          accountNumber: "",
          accountHolder: "",
        },
      };
      setUser(profile);
      setTeamSettings(settings);
      if (!saved)
        setTeams((prev) => ({
          ...prev,
          [account.id + "::" + settings.id]: {
            funds: { transactions: [], pendingApprovals: [], debtors: [] },
            matches: [],
            attendance: {},
            reports: {},
            notices: [],
          },
        }));
      setCurrentUserRole(
        settings.members.find((m) => m.id === account.id)?.roleType || "member",
      );
    } else
      setCurrentUserRole(
        teamSettings.members.find((m) => m.id === account.id)?.roleType ||
          "member",
      );
  }, [authSession?.user?.id, demoSession, teamSettings.members, user.id]);

  useEffect(() => {
    if (!supabase || !authSession || demoSession) {
      setVerifiedAccount(null);
      return;
    }
    let live = true;
    setVerifiedAccount(null);
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!live) return;
        if (error || data.user?.id !== authSession.user.id) {
          setStorageError("Phiên đăng nhập cần được xác thực lại.");
          setAuthSession(null);
          supabase.auth.signOut({ scope: "local" });
        } else setVerifiedAccount(data.user.id);
      })
      .catch(() => {
        if (live) {
          setAuthSession(null);
          setStorageError("Không kiểm tra được phiên. Vui lòng đăng nhập lại.");
        }
      });
    return () => {
      live = false;
    };
  }, [authSession?.user.id, demoSession]);

  useEffect(() => {
    if (demoSession)
      writeStored("no_offside_workspace_demo", { user, teamSettings });
    else if (authSession?.user.id === user.id)
      writeStored("no_offside_workspace_" + user.id, { user, teamSettings });
  }, [user, teamSettings, demoSession, authSession?.user?.id]);

  const addNotice = (title, content) =>
    setData((prev) => ({
      ...prev,
      notices: [
        {
          id: uid(),
          title,
          content,
          time: new Date().toLocaleString("vi-VN"),
          unread: true,
        },
        ...(prev.notices || []),
      ],
    }));
  const toggleRole = () => {
    if (demoSession)
      setCurrentUserRole((prev) =>
        prev === "owner" ? "admin" : prev === "admin" ? "member" : "owner",
      );
  };
  const setAttendance = (status) => {
    if (!["attending", "maybe", "absent"].includes(status) || !activeMatch)
      return;
    if (new Date(activeMatch.deadline).getTime() <= Date.now()) {
      alert("Đã hết hạn điểm danh. Liên hệ ban quản trị để điều chỉnh.");
      return;
    }
    setData((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [activeMatch.id]: {
          ...prev.attendance[activeMatch.id],
          [user.id]: status,
        },
      },
    }));
    setUser((prev) => ({ ...prev, nextMatchAttendance: status }));
  };
  const markFundPaid = () => {
    const month = monthKey();
    if (!(user.fundDebt > 0)) {
      alert("Bạn chưa có khoản quỹ cần nộp.");
      return;
    }
    if (
      funds.pendingApprovals.some(
        (p) => p.playerId === user.id && p.month === month,
      )
    )
      return;
    setData((prev) => ({
      ...prev,
      funds: {
        ...prev.funds,
        pendingApprovals: [
          ...prev.funds.pendingApprovals,
          {
            id: uid(),
            playerId: user.id,
            month,
            name: user.name + " (#" + user.number + ")",
            amount: user.fundDebt || 150000,
            bank: teamSettings.treasurerQr.bankName,
            time: "Vừa gửi",
            memo: "NO OFFSIDE DONG QUY",
          },
        ],
      },
    }));
    setUser((prev) => ({ ...prev, fundPaymentPending: true }));
  };
  const approveFundPayment = (id) => {
    if (!leader) return;
    const item = funds.pendingApprovals.find((p) => p.id === id);
    setFunds((prev) => approvePayment(prev, id, user.name));
    if (item?.playerId === user.id)
      setUser((prev) => ({
        ...prev,
        isFundPaid: true,
        fundDebt: 0,
        fundPaymentPending: false,
      }));
  };
  const resetFund = () => {
    if (demoSession)
      setUser((prev) => ({
        ...prev,
        isFundPaid: false,
        fundDebt: 150000,
        fundPaymentPending: false,
      }));
  };
  const updateMatchStats = (goals = 0, assists = 0) => {
    if (!activeMatch || activeMatch.status !== "completed") return;
    if (
      ![goals, assists].every(
        (n) =>
          Number.isInteger(Number(n)) && Number(n) >= 0 && Number(n) <= 100,
      )
    )
      return;
    const previous = data.reports[user.id] || {};
    const reports = upsertReport(previous, activeMatch.id, goals, assists);
    const base = user.baseStats || {
      ...user.stats,
      matches: user.stats.matches - Object.keys(previous).length,
      goals:
        user.stats.goals -
        Object.values(previous).reduce((n, r) => n + r.goals, 0),
      assists:
        user.stats.assists -
        Object.values(previous).reduce((n, r) => n + r.assists, 0),
    };
    setData((prev) => ({
      ...prev,
      reports: { ...prev.reports, [user.id]: reports },
    }));
    setUser((prev) => ({
      ...prev,
      baseStats: base,
      stats: reportTotals(base, reports),
    }));
  };
  const updateProfile = (updates) => {
    if (
      !updates.name?.trim() ||
      !Number.isInteger(Number(updates.number)) ||
      updates.number < 1 ||
      updates.number > 99
    )
      throw new Error("Nhập tên và số áo từ 1 đến 99.");
    if (
      teamSettings.members.some(
        (m) => m.id !== user.id && Number(m.number) === Number(updates.number),
      )
    )
      throw new Error("Số áo này đã có thành viên sử dụng.");
    if (
      ["height", "weight"].some(
        (k) =>
          updates[k] !== undefined &&
          updates[k] !== "" &&
          (!Number.isFinite(Number(updates[k])) || Number(updates[k]) <= 0),
      )
    )
      throw new Error("Chiều cao và cân nặng phải lớn hơn 0.");
    const profile = {
      ...updates,
      name: updates.name.trim(),
      number: Number(updates.number),
    };
    setUser((prev) => ({ ...prev, ...profile }));
    setTeamSettings((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === user.id ? { ...m, ...profile } : m,
      ),
    }));
  };
  const updateTeamSettings = (updates) => {
    if (currentUserRole !== "owner") return;
    setTeamSettings((prev) => ({ ...prev, ...updates }));
    if (updates.teamName)
      setUser((prev) => ({ ...prev, teamName: updates.teamName }));
  };
  const updateTeamName = (teamName) => updateTeamSettings({ teamName });
  const updateTreasurerQr = (updates) => {
    if (!leader) throw new Error("Không có quyền sửa tài khoản nhận quỹ.");
    const next = { ...teamSettings, treasurerQr: { ...teamSettings.treasurerQr, ...updates } };
    if (!writeStored("no_offside_workspace_" + accountId,{user,teamSettings:next})) throw new Error("Không lưu được ảnh QR trên thiết bị. Giảm dung lượng ảnh rồi thử lại.");
    setTeamSettings(next);
  };
  const addSubAdmin = (member) => {
    if (currentUserRole === "owner")
      setTeamSettings((prev) =>
        promoteMember(prev, member.id, member.customTitle),
      );
  };
  const requestAdmin = (member) => {
    if (
      !leader ||
      teamSettings.pendingAdminRequests.some((r) => r.memberId === member.id)
    )
      return;
    setTeamSettings((prev) => ({
      ...prev,
      pendingAdminRequests: [
        ...prev.pendingAdminRequests,
        {
          ...member,
          memberId: member.id,
          id: uid(),
          requestedTitle: member.customTitle,
          requestedBy: user.name,
          time: "Vừa gửi",
        },
      ],
    }));
  };
  const removeSubAdmin = (id) => {
    if (currentUserRole === "owner")
      setTeamSettings((prev) => ({
        ...prev,
        subAdmins: prev.subAdmins.filter((m) => m.id !== id),
        members: prev.members.map((m) =>
          m.id === id
            ? { ...m, roleType: "member", customTitle: "Cầu thủ" }
            : m,
        ),
      }));
  };
  const updateSubAdminTitle = (id, title) => {
    if (currentUserRole === "owner")
      setTeamSettings((prev) => ({
        ...prev,
        subAdmins: prev.subAdmins.map((m) =>
          m.id === id ? { ...m, customTitle: title } : m,
        ),
        members: prev.members.map((m) =>
          m.id === id ? { ...m, customTitle: title } : m,
        ),
      }));
  };
  const transferOwnership = (id) => {
    if (
      currentUserRole !== "owner" ||
      !teamSettings.members.some((m) => m.id === id && m.roleType === "admin")
    )
      return;
    setTeamSettings((prev) => transferOwner(prev, user.id, id));
    setUser((prev) => ({ ...prev, isCaptain: false, customTitle: "Cầu thủ" }));
    setCurrentUserRole("member");
  };
  const approveAdminRequest = (id) => {
    if (currentUserRole !== "owner") return;
    setTeamSettings((prev) => {
      const request = prev.pendingAdminRequests.find((r) => r.id === id);
      if (!request) return prev;
      const updated = promoteMember(
        prev,
        request.memberId || request.id,
        request.requestedTitle,
      );
      return {
        ...updated,
        pendingAdminRequests: prev.pendingAdminRequests.filter(
          (r) => r.id !== id,
        ),
      };
    });
  };
  const rejectAdminRequest = (id) => {
    if (currentUserRole === "owner")
      setTeamSettings((prev) => ({
        ...prev,
        pendingAdminRequests: prev.pendingAdminRequests.filter(
          (r) => r.id !== id,
        ),
      }));
  };
  const removeMember = (id) => {
    const target = teamSettings.members.find((m) => m.id === id);
    if (
      !leader ||
      !target ||
      target.roleType === "owner" ||
      (currentUserRole === "admin" && target.roleType !== "member")
    )
      return;
    setTeamSettings((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === id
          ? {
              ...m,
              membershipStatus: "removed",
              removedAt: new Date().toISOString(),
              removedBy: user.id,
            }
          : m,
      ),
      subAdmins: prev.subAdmins.filter((m) => m.id !== id),
    }));
  };
  const addMember = async (member) => {
    if (!leader) throw new Error("Chỉ Ban quản trị mới có quyền thêm thành viên.");
    if (!member?.name?.trim()) throw new Error("Vui lòng nhập họ và tên thành viên.");
    const num = Number(member.number);
    if (!Number.isInteger(num) || num < 1 || num > 99)
      throw new Error("Số áo phải từ 1 đến 99.");
    if (
      teamSettings.members.some(
        (m) => m.membershipStatus !== "removed" && Number(m.number) === num,
      )
    )
      throw new Error(`Số áo #${num} đã có thành viên sử dụng.`);

    let created = {
      ...member,
      id: member.id || uid(),
      name: member.name.trim(),
      number: num,
      role: member.role || "Tiền Đạo (ST)",
      roleType: "member",
      customTitle: "Cầu thủ",
      joinedDate: "Thủ công",
      isManual: true,
      linkedUserId: null,
    };

    if (authSession?.access_token && !demoSession && typeof fetch !== "undefined") {
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({
            action: "add-member",
            teamId: teamSettings.id,
            member: {
              name: member.name.trim(),
              number: num,
              role: member.role || "Tiền Đạo (ST)",
              phone: member.phone || "",
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Không thể lưu thành viên vào hệ thống.");
        }

        const data = await res.json();
        if (data?.member) created = data.member;
      } catch (err) {
        if (!err.message?.includes("fetch")) throw err;
      }
    }

    setTeamSettings((prev) => ({
      ...prev,
      members: [
        ...prev.members.filter((m) => m.id !== created.id),
        created,
      ],
    }));
    return created;
  };

  const createTeam = async (team) => {
    const id = uid();
    let settings = {
      ...INITIAL_TEAM_SETTINGS,
      id,
      ownerId: user.id,
      teamName: team.teamName,
      teamCategory: team.teamCategory,
      venue: team.stadium,
      logo: team.teamLogo,
      members: [{ ...user, roleType: "owner", customTitle: "Đội trưởng", isCaptain: true }],
      subAdmins: [],
      pendingAdminRequests: [],
      treasurerQr: {
        bankName: "",
        bankCode: "970422",
        accountNumber: "",
        accountHolder: "",
      },
    };

    if (authSession?.access_token && !demoSession && typeof fetch !== "undefined") {
      try {
        const response = await fetch("/api/teams", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({
            action: "create-team",
            team: {
              id,
              teamName: team.teamName,
              teamCategory: team.teamCategory,
              stadium: team.stadium,
              teamLogo: team.teamLogo,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Không thể lưu đội bóng trên hệ thống. Vui lòng thử lại.");
        }

        const resData = await response.json();
        if (resData.team) {
          settings = resData.team;
        }
      } catch (err) {
        if (!err.message?.includes("fetch")) {
          throw err;
        }
      }
    }

    setTeamSettings(settings);
    writeStored("no_offside_team_" + settings.id, settings);
    writeStored("no_offside_workspace_" + accountId, { user, teamSettings: settings });
    setTeams((prev) => ({
      ...prev,
      [accountId + "::" + settings.id]: {
        funds: { transactions: [], pendingApprovals: [], debtors: [] },
        matches: [],
        attendance: {},
        reports: {},
        notices: [],
      },
    }));
    setUser((prev) => ({
      ...prev,
      teamName: settings.teamName,
      teamCategory: settings.teamCategory,
      isCaptain: true,
      customTitle: "Đội trưởng",
    }));
    setCurrentUserRole("owner");
    setDbMemberships([{ team_id: settings.id, role: "owner", name: settings.teamName }]);
    return settings;
  };
  useEffect(() => {
    writeStored("no_offside_team_" + teamId, teamSettings);
  }, [teamId, teamSettings]);
  const login = (profile) => {
    writeSession("no_offside_app_unlocked", "true");
    setIsUnlocked(true);
    if (profile?.demo) {
      const saved = readStored("no_offside_workspace_demo", null);
      const demoUser = saved?.user || INITIAL_USER;
      const settings = {
        ...(saved?.teamSettings || INITIAL_TEAM_SETTINGS),
        id: saved?.teamSettings?.id || INITIAL_TEAM_SETTINGS.id,
      };
      setUser(demoUser);
      setTeamSettings(settings);
      setDemoSession(true);
      setCurrentUserRole(
        settings.members.find((m) => m.id === demoUser.id)?.roleType ||
          "member",
      );
    }
    if (profile && !profile.demo) setUser((prev) => ({ ...prev, ...profile }));
  };
  const joinTeam = (settings, profile) => {
    const id = authSession?.user.id || uid();
    if (
      settings.members.some(
        (m) => m.id !== id && Number(m.number) === Number(profile.number),
      )
    )
      throw new Error("Số áo này đã có người sử dụng.");
    const member = {
      ...profile,
      id,
      roleType: "member",
      isCaptain: false,
      customTitle: "Cầu thủ",
      stats: { matches: 0, goals: 0, assists: 0, mvp: 0, rating: 0 },
      fundDebt: 150000,
      isFundPaid: false,
    };
    setTeamSettings({
      ...settings,
      members: [...settings.members.filter((m) => m.id !== id), member],
    });
    setUser(member);
    setCurrentUserRole("member");
  };

  const createInvite = async (targetTeamId) => {
    const tId = targetTeamId || teamSettings.id;
    if (supabase && typeof supabase.rpc === "function" && authSession?.user?.id) {
      const { data, error } = await supabase.rpc("no_gov_create_invite", {
        p_team_id: tId,
      });
      if (error) throw new Error(error.message);
      return data;
    }
    const code = "NO" + Math.random().toString(36).substring(2, 6).toUpperCase();
    return { success: true, code, status: "active" };
  };

  const revokeInvite = async (targetTeamId) => {
    const tId = targetTeamId || teamSettings.id;
    if (supabase && typeof supabase.rpc === "function" && authSession?.user?.id) {
      const { data, error } = await supabase.rpc("no_gov_revoke_invite", {
        p_team_id: tId,
      });
      if (error) throw new Error(error.message);
      return data;
    }
    return { success: true, revoked: true };
  };

  const joinTeamViaInvite = async (code, memberProfile) => {
    const cleanCode = String(code || "").trim().toUpperCase();
    if (!cleanCode) throw new Error("Mã Club không được để trống.");

    const name = String(memberProfile.name || "").trim();
    if (!name) throw new Error("Vui lòng nhập họ và tên.");

    const number = Number(memberProfile.number);
    if (!Number.isInteger(number) || number < 0 || number > 99) {
      throw new Error("Số áo phải là số nguyên từ 0 đến 99.");
    }

    const position = String(
      memberProfile.position || memberProfile.role || "Tiền đạo",
    ).trim();

    if (
      supabase &&
      typeof supabase.rpc === "function" &&
      authSession?.user?.id
    ) {
      const { data, error } = await supabase.rpc("no_gov_join_via_invite", {
        p_code: cleanCode,
        p_name: name,
        p_number: number,
        p_position: position,
      });
      if (error) throw new Error(error.message);

      if (data && data.success) {
        const teamObj = data.team;
        const me = data.me;

        const newSettings = {
          ...teamSettings,
          id: teamObj.id,
          teamName: teamObj.name,
          logo: teamObj.logo || teamSettings.logo,
          members: [
            ...(teamSettings.members || []).filter((m) => m.id !== me.user_id),
            {
              id: me.user_id,
              name: me.name,
              number: me.jersey_number,
              role: me.position,
              roleType: me.role || "member", // strictly 'member'
              customTitle: "Cầu thủ",
            },
          ],
        };
        setTeamSettings(newSettings);
        writeStored("no_offside_team_" + teamObj.id, newSettings);

        setUser((prev) => ({
          ...prev,
          name: me.name,
          number: me.jersey_number,
          role: me.position,
          teamName: teamObj.name,
          isCaptain: false,
          customTitle: "Cầu thủ",
        }));
        setCurrentUserRole(me.role || "member");

        await loadDatabaseMemberships();
        return data;
      }
    }

    // Fallback join for demo / offline
    const fallbackTeamKey = "no_offside_team_" + cleanCode.toLowerCase();
    const existingTeam = readStored(fallbackTeamKey, teamSettings);
    joinTeam(existingTeam, { ...memberProfile, name, number, role: position });
  };

  useEffect(() => {
    if (!isUnlocked || !authSession?.user?.id || demoSession) return;
    const pending = getPendingJoin();
    if (pending && pending.code) {
      joinTeamViaInvite(pending.code, pending)
        .then(() => {
          clearPendingJoin();
        })
        .catch((err) => {
          console.warn("Auto-join pending invite error:", err);
        });
    }
  }, [isUnlocked, authSession?.user?.id, demoSession]);

  const logout = async (scope = "local") => {
    setAuthLoading(true);
    try {
      const currentUserId = authSession?.user?.id || user?.id;
      if (currentUserId) {
        writeStored("no_offside_autologin_" + currentUserId, false);
        if (
          readStored("no_offside_last_autologin_account", null) === currentUserId
        ) {
          writeStored("no_offside_last_autologin_account", null);
        }
      }
      removeSession("no_offside_app_unlocked");
      removeSession("hideWelcomePopup");
      if (supabase && authSession) {
        const { error } = await supabase.auth.signOut({ scope });
        if (error) throw error;
      }
      setDemoSession(false);
      setAuthSession(null);
      setVerifiedAccount(null);
      setDeletedMatch(null);
      setIsUnlocked(false);
    } finally {
      setAuthLoading(false);
    }
  };
  const saveMatch = (form, editId, options = {}) => {
    if (!leader) throw new Error("Bạn không có quyền quản lý trận đấu.");
    if (
      !Number.isInteger(Number(form.penaltyFine)) ||
      Number(form.penaltyFine) < 0
    )
      throw new Error("Tiền phạt phải là số nguyên không âm.");
    const start = new Date(form.datetime),
      deadline = new Date(form.timeoutDatetime);
    if (
      !form.opponent.trim() ||
      !form.venue.trim() ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(deadline.getTime()) ||
      deadline >= start ||
      start <= new Date()
    )
      throw new Error(
        "Nhập đủ thông tin; hạn chốt phải trước giờ đá, giờ đá phải ở tương lai.",
      );
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (
      !editId &&
      data.matches.filter(
        (m) =>
          new Date(m.datetime) >= weekStart && new Date(m.datetime) < weekEnd,
      ).length >= 4
    )
      throw new Error("Tối đa 4 trận trong một tuần.");
    const lateConfig = { ...defaultLate, ...form.lateConfig };
    if (
      ![lateConfig.lateBefore, lateConfig.grace, lateConfig.fine].every(
        (n) => Number.isInteger(Number(n)) && Number(n) >= 0,
      )
    )
      throw new Error("Cấu hình đến muộn phải là số nguyên không âm.");
    const match = {
      ...(editId ? data.matches.find((m) => m.id === editId) : {}),
      id: editId || options.id || uid(),
      title: "Kèo " + teamSettings.teamCategory + " — " + form.opponent.trim(),
      category: teamSettings.teamCategory,
      datetime: form.datetime,
      deadline: form.timeoutDatetime,
      venue: form.venue,
      penaltyEnabled: form.penaltyEnabled,
      penaltyAmount: Number(form.penaltyFine).toLocaleString("vi-VN") + " đ",
      status: editId ? activeMatch.status : "upcoming",
      lateConfig,
    };
    if (options.persist !== false)
      setData((prev) => ({
        ...prev,
        matches: editId
          ? prev.matches.map((m) => (m.id === editId ? match : m))
          : [...prev.matches, match],
        activeMatchId: match.id,
      }));
    return match;
  };
  const setMatchStatus = (status) => {
    if (leader && activeMatch && ["upcoming", "completed"].includes(status))
      setData((prev) => ({
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === activeMatch.id ? { ...m, status } : m,
        ),
      }));
  };
  const selectMatch = (id) =>
    setData((prev) => ({ ...prev, activeMatchId: id }));
  const deleteMatch = (id) => {
    if (!leader) return;
    const index = data.matches.findIndex((match) => match.id === id);
    if (index < 0) return;
    setDeletedMatch({
      accountId,
      teamId,
      index,
      match: data.matches[index],
      attendance: data.attendance[id],
      reports: Object.fromEntries(
        Object.entries(data.reports)
          .filter(([, reports]) => reports[id])
          .map(([playerId, reports]) => [playerId, reports[id]]),
      ),
    });
    setData((prev) => deleteTeamMatch(prev, id, user.id));
  };
  const undoDeleteMatch = (snapshot = deletedMatch) => {
    if (
      !leader ||
      !snapshot ||
      snapshot.teamId !== teamId ||
      snapshot.accountId !== accountId
    )
      return;
    setData((prev) => restoreTeamMatch(prev, snapshot));
    setDeletedMatch(null);
  };
  const restoreArchivedMatch = (id) => {
    const archived = data.matches.find((m) => m.id === id && m.archivedAt);
    if (!leader || !archived) return;
    const { archivedAt, archivedBy, archiveReason, ...match } = archived;
    setData((prev) => restoreTeamMatch(prev, { match, index: 0 }));
  };
  const updateUsername = async (newUsername) => {
    if (!newUsername || !newUsername.trim()) {
      throw new Error("Tên đăng nhập không được để trống.");
    }
    const trimmed = newUsername.trim();
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(trimmed)) {
      throw new Error(
        "Tên đăng nhập chỉ gồm 3-20 ký tự chữ, số, gạch dưới hoặc gạch nối.",
      );
    }
    if (supabase && authSession) {
      const { data: result, error: rpcError } = await supabase.rpc(
        "no_set_username",
        { p_username: trimmed },
      );
      if (rpcError) throw rpcError;
      if (result && !result.ok) {
        throw new Error(result.error || "Không thể cập nhật tên đăng nhập.");
      }
      await supabase.auth.updateUser({
        data: { username: trimmed },
      });
    }
    setUser((prev) => ({ ...prev, username: trimmed }));
    const remembered = readStored("no_offside_remembered_accounts", []);
    const updated = remembered.map((acc) =>
      acc.id === (authSession?.user?.id || user.id)
        ? { ...acc, username: trimmed }
        : acc,
    );
    writeStored("no_offside_remembered_accounts", updated);
  };
  const hasTeam = Boolean(
    demoSession ||
      dbMemberships.length > 0 ||
      (teamSettings?.ownerId &&
        teamSettings.id !== "workspace_" + accountId &&
        teamSettings.members &&
        teamSettings.members.length > 0) ||
      (teamSettings?.members &&
        teamSettings.members.some(
          (m) =>
            m.id === (authSession?.user?.id || user.id) &&
            m.membershipStatus !== "removed",
        )),
  );
  const isLoggedIn = Boolean(demoSession || (authSession && isUnlocked));
  return {
    user,
    accountId,
    authSession,
    currentUserRole,
    setCurrentUserRole,
    toggleRole,
    isLoggedIn,
    isUnlocked,
    hasTeam,
    updateUsername,
    authLoading:
      authLoading ||
      (!demoSession &&
        Boolean(authSession) &&
        (verifiedAccount !== authSession.user.id ||
          user.id !== authSession.user.id)),
    demoSession,
    storageError,
    setAttendance,
    markFundPaid,
    approveFundPayment,
    resetFund,
    updateMatchStats,
    updateProfile,
    teamSettings: {
      ...teamSettings,
      members: teamSettings.members.filter(
        (m) => m.membershipStatus !== "removed",
      ),
    },
    updateTreasurerQr,
    updateTeamName,
    updateTeamSettings,
    updateSubAdminTitle,
    addSubAdmin,
    requestAdmin,
    removeSubAdmin,
    removeMember,
    addMember,
    transferOwnership,
    approveAdminRequest,
    rejectAdminRequest,
    createTeam,
    joinTeam,
    joinTeamViaInvite,
    createInvite,
    revokeInvite,
    dbMemberships,
    loadDatabaseMemberships,
    login,
    logout,
    funds,
    setFunds,
    balance: fundBalance(funds.transactions),
    activeMatch,
    restoreArchivedMatch,
    matches: data.matches.filter((m) => !m.archivedAt),
    archivedMatches: data.matches.filter((m) => m.archivedAt),
    attendance: data.attendance[activeMatch?.id] || {},
    reports: data.reports[user.id] || {},
    saveMatch,
    setMatchStatus,
    selectMatch,
    deleteMatch,
    deletedMatch:
      deletedMatch?.accountId === accountId && deletedMatch?.teamId === teamId
        ? deletedMatch
        : null,
    undoDeleteMatch,
    notices: data.notices || [],
    addNotice,
  };
}
