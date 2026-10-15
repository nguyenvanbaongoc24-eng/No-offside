import {disconnectPushDevice} from '../lib/pushDevice';
import {
  transactionInstant,
  localTransactionTime,
} from "../lib/transactionTime";
import { serverRequest } from "../lib/serverRequest";
import { withPendingWrite, pendingWriteCount } from "../lib/pendingWrites";
import { useState, useEffect, useRef } from "react";
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
import {
  getPendingJoin,
  clearPendingJoin,
  savePendingJoin,
} from "../lib/pendingJoin";

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
  const [startupError, setStartupError] = useState("");
  const [workspaceBoot, setWorkspaceBoot] = useState({
    account: "",
    status: "ready",
    error: "",
  });
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
  const revisions = useRef(new Map());
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const writeQueue = useRef(Promise.resolve());
  const createRequest = useRef(null);
  const workspaceSequence = useRef(0),
    liveAccount = useRef(authSession?.user?.id),
    activeWorkspace = useRef(null),
    switchingRef = useRef(false);
  liveAccount.current = authSession?.user?.id;
  const [switchingTeam, setSwitchingTeam] = useState(false);
  const [teamRestriction, setTeamRestriction] = useState(null);

  const postServer = async (url, body) =>
    withPendingWrite(async () => {
      if (!authSession?.access_token) throw Error("Vui lòng đăng nhập lại.");
      const { response, data: result } = await serverRequest(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok || !result.success)
        throw Error(result.error || "Server chưa xác nhận lưu dữ liệu.");
      return result;
    });

  const loadDatabaseMemberships = async () => {
    if (
      !supabase ||
      typeof supabase.rpc !== "function" ||
      !authSession?.user?.id
    ) {
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

  const fetchWorkspace = async (targetTeamId, signal) => {
    const ownerAccount = authSession?.user?.id,
      token = authSession?.access_token;
    if (!token || !ownerAccount) throw Error("Vui lòng đăng nhập lại.");
    const sequence = ++workspaceSequence.current;
    let { response, data: result } = await serverRequest(
      "/api/teams" +
        (targetTeamId ? "?teamId=" + encodeURIComponent(targetTeamId) : ""),
      { headers: { Authorization: `Bearer ${token}` }, signal },
    );
    if (response.status === 403 && targetTeamId)
      ({ response, data: result } = await serverRequest("/api/teams", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }));
    if (response.status === 401) {
      await supabase.auth.signOut({ scope: "local" });
      throw Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
    if (response.ok === false || !result.success || result.error)
      throw Error(result.error || "Không tải được thông tin đội.");
    if (
      signal?.aborted ||
      sequence !== workspaceSequence.current ||
      liveAccount.current !== ownerAccount
    )
      return null;
    if (
      result.team &&
      result.revision <
        (revisions.current.get(ownerAccount + "::" + result.team.id) ?? -1)
    )
      return null;
    const settings = result.team
      ? {
          ...result.team,
          appearance: {
            ...INITIAL_TEAM_SETTINGS.appearance,
            ...result.team.appearance,
          },
          treasurerQr: result.team.treasurerQr || {},
          pendingAdminRequests: result.team.pendingAdminRequests || [],
        }
      : {
          ...INITIAL_TEAM_SETTINGS,
          id: "workspace_" + ownerAccount,
          teamName: "Đội của tôi",
          teamCategory: "",
          venue: "",
          schedule: "",
          logo: "",
          ownerId: "",
          members: [],
          subAdmins: [],
          pendingAdminRequests: [],
          treasurerQr: {},
        };
    const own = settings.members.find((m) => m.id === ownerAccount),
      profile = result.profile;
    setUser((previous) => {
      const base =
        previous.id === ownerAccount
          ? previous
          : {
              ...INITIAL_USER,
              id: ownerAccount,
              avatar: "",
              phone: "",
              number: null,
              role: "",
              nextMatchAttendance: null,
            };
      const statsBase = { matches: 0, goals: 0, assists: 0 };
      return {
        ...base,
        ...(profile
          ? {
              name: profile.full_name || base.name,
              username: profile.username || "",
              avatar: profile.avatar_url || "",
              phone: profile.phone || "",
              height: profile.height || "",
              weight: profile.weight || "",
            }
          : {}),
        number:
          own?.number ??
          profile?.jersey_number ??
          (profile ? null : base.number),
        role: own?.role || profile?.position || (profile ? "" : base.role),
        teamName: settings.teamName,
        teamCategory: settings.teamCategory,
        isCaptain: result.role === "owner",
        baseStats: statsBase,
        stats: reportTotals(
          statsBase,
          result.data?.reports?.[ownerAccount] || {},
        ),
      };
    });
    setTeamRestriction(
      result.restricted
        ? { status: result.membershipStatus, until: result.restrictionUntil }
        : null,
    );
    setTeamSettings(settings);
    setCurrentUserRole(result.role || "member");
    setDbMemberships(
      result.userTeams ||
        (result.team
          ? [
              {
                teamId: result.team.id,
                teamName: result.team.teamName,
                role: result.role,
                status: "active",
              },
            ]
          : []),
    );
    if (result.team && result.data) {
      const key = ownerAccount + "::" + result.team.id;
      const confirmed = {
        ...result.data,
        activeMatchId:
          teamsRef.current[key]?.activeMatchId || result.data.activeMatchId,
      };
      revisions.current.set(key, result.revision);
      teamsRef.current = { ...teamsRef.current, [key]: confirmed };
      setTeams((previous) => ({ ...previous, [key]: confirmed }));
      writeStored("no_offside_selected_team_" + ownerAccount, result.team.id);
    }
    setWorkspaceBoot({ account: ownerAccount, status: "ready", error: "" });
    return result;
  };
  useEffect(() => {
    if (!authSession?.user?.id || demoSession) {
      setDbMemberships([]);
      return;
    }
    if (!authSession.access_token) return;
    const account = authSession.user.id,
      controller = new AbortController();
    setWorkspaceBoot({ account, status: "pending", error: "" });
    fetchWorkspace(
      readStored("no_offside_selected_team_" + account, null),
      controller.signal,
    )
      .then((result) => {
        if (result) setWorkspaceBoot({ account, status: "ready", error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted && liveAccount.current === account)
          setWorkspaceBoot({
            account,
            status: "error",
            error:
              error.message ||
              "Không tải được thông tin đội. Kiểm tra kết nối rồi thử lại.",
          });
      });
    return () => controller.abort();
  }, [authSession?.user?.id, authSession?.access_token, demoSession]);

  const teamId = teamSettings.id || "fc-no-offside-99";
  const accountId = demoSession ? "demo" : authSession?.user.id || "anonymous";
  const inviteAccountRef = useRef(accountId);
  inviteAccountRef.current = accountId;
  const dataKey = accountId + "::" + teamId;
  activeWorkspace.current = dataKey;
  useEffect(() => {
    if (
      typeof document === "undefined" ||
      demoSession ||
      !authSession?.access_token ||
      teamId.startsWith("workspace_")
    )
      return;
    let live = true;
    const controller = new AbortController();
    const refresh = () => {
      if (
        !live ||
        document.visibilityState === "hidden" ||
        switchingRef.current ||
        pendingWriteCount() > 0
      )
        return;
      fetchWorkspace(teamId, controller.signal).catch((error) => {
        if (live && !controller.signal.aborted)
          setStorageError(error.message || "Chưa đồng bộ được dữ liệu mới.");
      });
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      live = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [accountId, teamId, authSession?.access_token, demoSession]);
  const switchTeam = async (target) => {
    if (switchingRef.current || target === teamId) return;
    if (pendingWriteCount() > 0)
      throw Error("Đang lưu dữ liệu. Đợi lưu xong rồi chuyển đội.");
    switchingRef.current = true;
    setSwitchingTeam(true);
    setStorageError("");
    try {
      await fetchWorkspace(target);
    } catch (error) {
      setStorageError(error.message);
      throw error;
    } finally {
      switchingRef.current = false;
      setSwitchingTeam(false);
    }
  };

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
  const setData = (fn) => {
    if (demoSession) {
      setTeams((prev) => ({ ...prev, [dataKey]: fn(prev[dataKey] || data) }));
      return Promise.resolve();
    }
    const operation = writeQueue.current
      .catch(() => {})
      .then(async () => {
        if (liveAccount.current !== accountId)
          throw Error("Tài khoản đã thay đổi; thao tác cũ đã được hủy.");
        const current = teamsRef.current[dataKey] || data;
        const next = fn(current);
        const patch = Object.fromEntries(
          Object.entries(next).filter(
            ([key, value]) =>
              key !== "activeMatchId" &&
              JSON.stringify(value) !== JSON.stringify(current[key]),
          ),
        );
        if (!Object.keys(patch).length) {
          teamsRef.current = { ...teamsRef.current, [dataKey]: next };
          setTeams((prev) => ({ ...prev, [dataKey]: next }));
          return;
        }
        try {
          const result = await postServer("/api/sync", {
            action: "commit",
            teamId,
            revision: revisions.current.get(dataKey),
            requestKey: uid(),
            patch,
          });
          acceptReceipt(result, next.activeMatchId);
          if (activeWorkspace.current === dataKey) setStorageError("");
          return result;
        } catch (error) {
          if (activeWorkspace.current === dataKey)
            setStorageError(error.message || "Không lưu được dữ liệu.");
          throw error;
        }
      });
    writeQueue.current = operation;
    // Event handlers may omit awaiting; errors remain visible and no data is committed locally.
    operation.catch(() => {});
    return operation;
  };
  const setFunds = async (fn) => {
    if (!isLeaderRole(currentUserRole))
      throw new Error("Không có quyền sửa quỹ.");
    return setData((prev) => ({
      ...prev,
      funds: typeof fn === "function" ? fn(prev.funds) : fn,
    }));
  };
  const leader = isLeaderRole(currentUserRole);

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
      .then(({ data, error }) => {
        if (error) throw error;
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
                    if (isAutoLogin)
                      writeSession("no_offside_app_unlocked", "true");
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
        if (live) {
          setStartupError(
            "Không khôi phục được phiên đăng nhập. Kiểm tra kết nối rồi thử lại.",
          );
          setAuthLoading(false);
        }
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
        if (account.user_metadata?.username)
          saved.user.username = account.user_metadata.username;
      }
      const profile = saved?.user || {
        ...INITIAL_USER,
        id: account.id,
        number: account.user_metadata?.jersey_number ?? null,
        role: account.user_metadata?.position || "",
        nextMatchAttendance: null,
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
          "",
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

  const linkMember = (manualId, userId) =>
    memberAction("link-member", manualId, { userId });

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
  const setAttendance = async (status) => {
    if (!["attending", "maybe", "absent"].includes(status) || !activeMatch)
      return;
    if (new Date(activeMatch.deadline).getTime() <= Date.now()) {
      alert("Đã hết hạn điểm danh. Liên hệ ban quản trị để điều chỉnh.");
      return;
    }
    await setData((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        [activeMatch.id]: {
          ...prev.attendance[activeMatch.id],
          [user.id]: status,
        },
      },
    }));
    if (activeWorkspace.current === dataKey)
      setUser((prev) => ({ ...prev, nextMatchAttendance: status }));
  };
  const acceptReceipt = (result, selectedId) => {
    if (activeWorkspace.current !== dataKey) return false;
    const currentRevision = revisions.current.get(dataKey) ?? -1;
    if (result.revision < currentRevision) return false;
    revisions.current.set(dataKey, result.revision);
    const confirmed = {
      ...result.data,
      activeMatchId:
        selectedId ||
        teamsRef.current[dataKey]?.activeMatchId ||
        data.activeMatchId,
    };
    teamsRef.current = { ...teamsRef.current, [dataKey]: confirmed };
    setTeams((prev) => ({ ...prev, [dataKey]: confirmed }));
    return true;
  };
  const paymentAction = async (action, paymentId = "", reason = "") => {
    const operation = writeQueue.current
      .catch(() => {})
      .then(async () => {
        if (liveAccount.current !== accountId)
          throw Error("Tài khoản đã thay đổi.");
        const result = await postServer("/api/sync", {
          action: "payment",
          teamId,
          paymentAction: action,
          paymentId,
          reason,
          requestKey: uid(),
        });
        acceptReceipt(result);
        return result;
      });
    writeQueue.current = operation;
    operation.catch((error) => {
      if (activeWorkspace.current === dataKey) setStorageError(error.message);
    });
    return operation;
  };
  const markFundPaid = async () => {
    if (!demoSession) return paymentAction("request");
    const month = monthKey();
    if (
      funds.pendingApprovals.some(
        (p) => p.playerId === user.id && p.month === month,
      )
    )
      return;
    await setData((prev) => ({
      ...prev,
      funds: {
        ...prev.funds,
        pendingApprovals: [
          ...prev.funds.pendingApprovals,
          {
            id: uid(),
            playerId: user.id,
            month,
            name: user.name,
            amount: user.fundDebt || 150000,
            time: "Vừa gửi",
          },
        ],
      },
    }));
    setUser((prev) => ({ ...prev, fundPaymentPending: true }));
  };
  const approveFundPayment = async (id, reason = "") => {
    if (!leader) throw Error("Không có quyền đối soát quỹ.");
    if (!demoSession) return paymentAction("approve", id, reason);
    return setFunds((prev) => approvePayment(prev, id, user.name));
  };
  const rejectFundPayment = async (id, reason) => {
    if (!reason?.trim() || reason.trim().length < 3)
      throw Error("Nhập lý do từ chối tối thiểu 3 ký tự.");
    if (!demoSession) return paymentAction("reject", id, reason);
    return setFunds((prev) => ({
      ...prev,
      pendingApprovals: prev.pendingApprovals.filter((p) => p.id !== id),
      rejectedPayments: [
        ...(prev.rejectedPayments || []),
        {
          ...prev.pendingApprovals.find((p) => p.id === id),
          reason,
          status: "rejected",
        },
      ],
    }));
  };
  const markNoticesRead = async () => {
    const ids = (data.notices || []).filter((n) => n.unread).map((n) => n.id);
    if (!ids.length) return;
    if (demoSession) {
      await setData((prev) => ({
        ...prev,
        notices: prev.notices.map((n) => ({ ...n, unread: false })),
      }));
      return;
    }
    const result = await postServer("/api/sync", {
      action: "read-notices",
      teamId,
      ids,
    });
    acceptReceipt(result);
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
  const updateMatchStats = async (goals = 0, assists = 0) => {
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
    await setData((prev) => ({
      ...prev,
      reports: { ...prev.reports, [user.id]: reports },
    }));
    if (activeWorkspace.current === dataKey)
      setUser((prev) => ({
        ...prev,
        baseStats: base,
        stats: reportTotals(base, reports),
      }));
  };
  const updateProfile = async (updates) => {
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
    if (!demoSession)
      await postServer("/api/sync", {
        action: "save-profile",
        profile: { ...profile, teamId },
      });
    if (activeWorkspace.current !== dataKey) return;
    setUser((prev) => ({ ...prev, ...profile }));
    setTeamSettings((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === user.id ? { ...m, ...profile } : m,
      ),
    }));
  };

  const persistSettings = async (updates) => {
    if (demoSession) {
      setTeamSettings((prev) => ({ ...prev, ...updates }));
      return;
    }
    const result = await postServer("/api/sync", {
      action: "settings",
      teamId,
      updates,
    });
    if (acceptReceipt(result)) setTeamSettings(result.team);
  };
  const updateTeamSettings = async (updates) => {
    if (currentUserRole !== "owner")
      throw Error("Chỉ chủ đội được sửa cài đặt này.");
    await persistSettings(updates);
    if (activeWorkspace.current === dataKey && updates.teamName)
      setUser((prev) => ({ ...prev, teamName: updates.teamName }));
  };
  const updateTeamName = (teamName) => updateTeamSettings({ teamName });
  const updateTreasurerQr = async (updates) => {
    if (!leader) throw Error("Không có quyền sửa tài khoản nhận quỹ.");
    const next = { ...teamSettings.treasurerQr, ...updates };
    if (!demoSession) {
      if (
        typeof next.uploadedQrImage === "string" &&
        next.uploadedQrImage.startsWith("data:image/")
      ) {
        const uploaded = await postServer("/api/team-assets", {
          teamId,
          kind: "qr",
          imageBase64: next.uploadedQrImage,
        });
        next.uploadedQrPath = uploaded.path;
      } else if (next.uploadedQrImage === "") next.uploadedQrPath = "";
      delete next.uploadedQrImage;
      delete next.qrImageUrl;
    }
    await persistSettings({ treasurerQr: next });
  };
  const memberAction = async (action, memberId, payload = {}) => {
    try {
      const result = await postServer("/api/members", {
        action,
        teamId,
        memberId,
        payload,
        requestKey: uid(),
      });
      if (acceptReceipt(result)) {
        setTeamSettings(result.team);
        setCurrentUserRole(result.role);
        setStorageError("");
      }
      return result;
    } catch (error) {
      setStorageError(error.message);
      throw error;
    }
  };
  const addSubAdmin = async (member) => {
    if (!demoSession)
      return memberAction("promote", member.id, { title: member.customTitle });
    setTeamSettings((prev) =>
      promoteMember(prev, member.id, member.customTitle),
    );
  };
  const requestAdmin = async (member) => {
    if (!demoSession)
      return memberAction("request-admin", member.id, {
        title: member.customTitle,
      });
    setTeamSettings((prev) => ({
      ...prev,
      pendingAdminRequests: [
        ...prev.pendingAdminRequests,
        {
          ...member,
          id: uid(),
          memberId: member.id,
          requestedTitle: member.customTitle,
          requestedBy: user.name,
        },
      ],
    }));
  };
  const removeSubAdmin = async (id) => {
    if (!demoSession) return memberAction("demote", id);
    setTeamSettings((prev) => ({
      ...prev,
      subAdmins: prev.subAdmins.filter((m) => m.id !== id),
      members: prev.members.map((m) =>
        m.id === id ? { ...m, roleType: "member", customTitle: "Cầu thủ" } : m,
      ),
    }));
  };
  const updateSubAdminTitle = async (id, title) => {
    if (!demoSession) return memberAction("title", id, { title });
    setTeamSettings((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === id ? { ...m, customTitle: title } : m,
      ),
      subAdmins: prev.subAdmins.map((m) =>
        m.id === id ? { ...m, customTitle: title } : m,
      ),
    }));
  };
  const transferOwnership = async (id) => {
    if (!demoSession) await memberAction("transfer", id);
    else {
      setTeamSettings((prev) => transferOwner(prev, user.id, id));
      setCurrentUserRole("member");
    }
    if (activeWorkspace.current === dataKey)
      setUser((prev) => ({
        ...prev,
        isCaptain: false,
        customTitle: "Cầu thủ",
      }));
  };
  const approveAdminRequest = async (id) => {
    if (!demoSession) return memberAction("approve-admin", id);
    setTeamSettings((prev) => {
      const request = prev.pendingAdminRequests.find((r) => r.id === id);
      if (!request) return prev;
      return {
        ...promoteMember(prev, request.memberId, request.requestedTitle),
        pendingAdminRequests: prev.pendingAdminRequests.filter(
          (r) => r.id !== id,
        ),
      };
    });
  };
  const rejectAdminRequest = async (id) => {
    if (!demoSession) return memberAction("reject-admin", id);
    setTeamSettings((prev) => ({
      ...prev,
      pendingAdminRequests: prev.pendingAdminRequests.filter(
        (r) => r.id !== id,
      ),
    }));
  };
  const removeMember = async (id) => {
    if (!demoSession) return memberAction("remove-member", id);
    setTeamSettings((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === id && m.roleType !== "owner"
          ? { ...m, membershipStatus: "removed" }
          : m,
      ),
    }));
  };
  const addMember = async (member) => {
    if (!leader) throw Error("Chỉ ban quản trị được thêm thành viên.");
    if (
      !member.name?.trim() ||
      !Number.isInteger(Number(member.number)) ||
      Number(member.number) < 1 ||
      Number(member.number) > 99
    )
      throw Error("Nhập tên và số áo từ 1 đến 99.");
    if (!demoSession) {
      const result = await memberAction("add-member", "", member);
      return result.member;
    }
    const created = {
      ...member,
      id: uid(),
      number: Number(member.number),
      roleType: "member",
      isManual: true,
      avatar: "",
      linkedUserId: null,
      customTitle: "Cầu thủ",
    };
    setTeamSettings((prev) => ({
      ...prev,
      members: [...prev.members, created],
    }));
    return created;
  };

  const createTeam = async (team) => {
    const signature = JSON.stringify([accountId, team]);
    if (createRequest.current?.signature !== signature)
      createRequest.current = { signature, id: uid() };
    const id = createRequest.current.id;
    if (!demoSession && !authSession?.access_token)
      throw Error("Vui lòng đăng nhập để tạo đội.");
    let confirmedData = null;
    let settings = {
      ...INITIAL_TEAM_SETTINGS,
      id,
      ownerId: user.id,
      teamName: team.teamName,
      teamCategory: team.teamCategory,
      venue: team.stadium,
      logo: team.teamLogo,
      members: [
        {
          ...user,
          roleType: "owner",
          customTitle: "Đội trưởng",
          isCaptain: true,
        },
      ],
      subAdmins: [],
      pendingAdminRequests: [],
      treasurerQr: {
        bankName: "",
        bankCode: "970422",
        accountNumber: "",
        accountHolder: "",
      },
    };

    if (
      authSession?.access_token &&
      !demoSession &&
      typeof fetch !== "undefined"
    ) {
      try {
        const resData = await postServer("/api/teams", {
          action: "create-team",
          team: {
            id,
            teamName: team.teamName,
            teamCategory: team.teamCategory,
            stadium: team.stadium,
            teamLogo: team.teamLogo,
          },
        });
        if (!resData.success || !resData.team)
          throw Error("Server chưa xác nhận tạo đội.");
        settings = {
          ...resData.team,
          appearance: {
            ...INITIAL_TEAM_SETTINGS.appearance,
            ...resData.team.appearance,
          },
          treasurerQr: resData.team.treasurerQr || {},
        };
        confirmedData = resData.data;
        revisions.current.set(accountId + "::" + settings.id, resData.revision);
      } catch (err) {
        throw err;
      }
    }

    if (!demoSession && liveAccount.current !== accountId)
      throw Error("Tài khoản đã thay đổi. Đội được giữ ở tài khoản đã tạo.");
    setTeamSettings(settings);
    writeStored("no_offside_team_" + settings.id, settings);
    writeStored("no_offside_workspace_" + accountId, {
      user,
      teamSettings: settings,
    });
    setTeams((prev) => ({
      ...prev,
      [accountId + "::" + settings.id]: confirmedData || {
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
    createRequest.current = null;
    setTeamRestriction(null);
    setCurrentUserRole("owner");
    setDbMemberships([
      { team_id: settings.id, role: "owner", name: settings.teamName },
    ]);
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
    if (!demoSession)
      throw Error("Hãy gia nhập bằng mã mời đã được server xác thực.");
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
    if (
      supabase &&
      typeof supabase.rpc === "function" &&
      authSession?.user?.id &&
      !demoSession
    ) {
      let { data, error } = await supabase.rpc("no_gov_create_invite", {
        p_team_id: tId,
      });

      if (error) throw Error(error.message || "Không tạo được mã mời.");
      if (!error && data?.code) {
        setTeamSettings((prev) =>
          prev.id === tId && inviteAccountRef.current === accountId
            ? { ...prev, inviteCode: data.code, inviteStatus: "active" }
            : prev,
        );
        return { ...data, teamId: tId };
      }
    }
    if (!demoSession)
      throw Error("Server chưa xác nhận mã mời. Vui lòng thử lại.");
    const code =
      teamSettings?.inviteCode ||
      "NO" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setTeamSettings((prev) =>
      prev.id === tId && inviteAccountRef.current === accountId
        ? { ...prev, inviteCode: code, inviteStatus: "active" }
        : prev,
    );
    if (tId) {
      writeStored("no_offside_team_" + String(code).toLowerCase(), {
        ...teamSettings,
        id: tId,
        inviteCode: code,
      });
    }
    return { success: true, code, status: "active", teamId: tId };
  };

  const readInvite = async (code, targetTeamId) => {
    const tId = targetTeamId || teamSettings.id;
    if (!supabase || !authSession?.user?.id || demoSession) {
      if (!demoSession) throw Error("Chưa xác thực được lời mời trên server.");
      return {
        valid: true,
        code,
        status: teamSettings?.inviteStatus || "active",
        teamId: tId,
      };
    }
    const { data, error } = await supabase.rpc("no_gov_get_invite", {
      p_code: code,
    });
    if (error) throw Error(error.message);
    if (!data?.valid || data.teamId !== tId)
      throw Error("Mã mời không hợp lệ cho đội này.");
    return data;
  };

  const revokeInvite = async (targetTeamId) => {
    const tId = targetTeamId || teamSettings.id;
    if (
      supabase &&
      typeof supabase.rpc === "function" &&
      authSession?.user?.id &&
      !demoSession
    ) {
      const { data, error } = await supabase.rpc("no_gov_revoke_invite", {
        p_team_id: tId,
      });
      if (error) throw new Error(error.message);
      if (data?.success)
        setTeamSettings((prev) =>
          prev.id === tId && inviteAccountRef.current === accountId
            ? { ...prev, inviteStatus: "revoked" }
            : prev,
        );
      return data;
    }
    if (!demoSession) throw Error("Server chưa xác nhận thu hồi mã mời.");
    setTeamSettings((prev) =>
      prev.id === tId && inviteAccountRef.current === accountId
        ? { ...prev, inviteStatus: "revoked" }
        : prev,
    );
    return { success: true, revoked: true, teamId: tId };
  };

  const joinTeamViaInvite = async (code, memberProfile) => {
    const cleanCode = String(code || "")
      .trim()
      .toUpperCase();
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
      try {
        const { data, error } = await supabase.rpc("no_gov_join_via_invite", {
          p_code: cleanCode,
          p_name: name,
          p_number: number,
          p_position: position,
        });
        if (!error && data && data.success) {
          const teamObj = data.team;
          const me = data.me;

          const newSettings = {
            ...teamSettings,
            id: teamObj.id,
            teamName: teamObj.name,
            logo: teamObj.logo || teamSettings.logo,
            members: [
              ...(teamSettings.members || []).filter(
                (m) => m.id !== me.user_id,
              ),
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

          await fetchWorkspace(teamObj.id);
          return data;
        }
        if (error) {
          const isMissingRpc =
            error.code === "PGRST202" ||
            error.code === "42883" ||
            error.message?.includes("schema cache") ||
            error.message?.includes("Could not find the function");
          if (!isMissingRpc) {
            throw new Error(error.message);
          }
        }
      } catch (err) {
        if (
          !err.message?.includes("schema cache") &&
          !err.message?.includes("Could not find the function")
        ) {
          throw err;
        }
      }
    }

    if (!demoSession)
      throw Error("Server chưa xác nhận gia nhập đội. Vui lòng thử lại.");
    // Local joining exists only in the explicitly labelled demo.
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
          readStored("no_offside_last_autologin_account", null) ===
          currentUserId
        ) {
          writeStored("no_offside_last_autologin_account", null);
        }
      }
      removeSession("no_offside_app_unlocked");
      removeSession("hideWelcomePopup");
      await disconnectPushDevice().catch(() => {});
      if (supabase && authSession) {
        const { error } = await supabase.auth.signOut({ scope });
        if (error) throw error;
      }
      setDemoSession(false);
      setTeamRestriction(null);
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
    const zone = teamSettings.timezone || "Asia/Ho_Chi_Minh";
    const kickoffInstant = transactionInstant(form.datetime, zone),
      deadlineInstant = transactionInstant(form.timeoutDatetime, zone);
    const start = new Date(kickoffInstant),
      deadline = new Date(deadlineInstant);
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
      datetime: kickoffInstant,
      deadline: deadlineInstant,
      venue: form.venue,
      penaltyEnabled: form.penaltyEnabled,
      penaltyAmount: Number(form.penaltyFine).toLocaleString("vi-VN") + " đ",
      status: editId ? activeMatch.status : "upcoming",
      lateConfig,
    };
    if (options.persist !== false)
      return setData((prev) => ({
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
      return setData((prev) => ({
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
    const undoSnapshot = {
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
    };
    const saved = setData((prev) => deleteTeamMatch(prev, id, user.id));
    saved
      .then(() => {
        if (activeWorkspace.current === dataKey) setDeletedMatch(undoSnapshot);
      })
      .catch(() => {});
    return saved;
  };
  const undoDeleteMatch = (snapshot = deletedMatch) => {
    if (
      !leader ||
      !snapshot ||
      snapshot.teamId !== teamId ||
      snapshot.accountId !== accountId
    )
      return;
    const saved = setData((prev) => restoreTeamMatch(prev, snapshot));
    saved.then(() => setDeletedMatch(null)).catch(() => {});
    return saved;
  };
  const restoreArchivedMatch = (id) => {
    const archived = data.matches.find((m) => m.id === id && m.archivedAt);
    if (!leader || !archived) return;
    const { archivedAt, archivedBy, archiveReason, ...match } = archived;
    return setData((prev) => restoreTeamMatch(prev, { match, index: 0 }));
  };
  const exitTeam = async (action, confirmation) => withPendingWrite(async () => {
    if(demoSession || !authSession?.access_token || !teamSettings.id)throw Error('Vui lòng đăng nhập vào đội trước khi thao tác.');
    const actor=authSession.user.id,scope=dataKey;
    const {response,data:result}=await serverRequest('/api/teams',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${authSession.access_token}`},body:JSON.stringify({action:action==='dissolve'?'dissolve-team':'leave-team',teamId:teamSettings.id,confirmation})});
    if(!response.ok || !result.success)throw Error(result.error || 'Không cập nhật được đội.');
    // Do not overwrite the workspace if the account changed during the request.
    if(liveAccount.current!==actor || activeWorkspace.current!==scope)return;
    await fetchWorkspace();
  });
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
  const saveLineups = (lineups, base) =>
    setData((prev) => {
      if (JSON.stringify(prev.lineups) !== JSON.stringify(base))
        throw Error(
          "Sơ đồ đã thay đổi trên thiết bị khác. Mở lại Chiến thuật để đối chiếu.",
        );
      return { ...prev, lineups };
    });
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
    exitTeam,
    authLoading:
      authLoading ||
      (!demoSession &&
        Boolean(authSession) &&
        (verifiedAccount !== authSession.user.id ||
          user.id !== authSession.user.id)),
    startupPending: Boolean(
      !demoSession &&
      authSession?.access_token &&
      (workspaceBoot.account !== authSession.user.id ||
        workspaceBoot.status === "pending"),
    ),
    startupError:
      startupError ||
      (!demoSession && workspaceBoot.account === authSession?.user?.id
        ? workspaceBoot.error
        : ""),
    demoSession,
    storageError,
    setAttendance,
    markFundPaid,
    approveFundPayment,
    rejectFundPayment,
    markNoticesRead,
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
    linkMember,
    transferOwnership,
    approveAdminRequest,
    rejectAdminRequest,
    createTeam,
    joinTeam,
    joinTeamViaInvite,
    createInvite,
    readInvite,
    revokeInvite,
    dbMemberships,
    switchTeam,
    switchingTeam,
    teamRestriction,
    loadDatabaseMemberships,
    login,
    logout,
    lineups: data.lineups,
    saveLineups,
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
