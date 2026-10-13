import React, { useState, useRef, useEffect } from "react";
import { readStored, writeStored } from "../lib/storage";
import { usePersistentState } from "../hooks/usePersistentState";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Users,
  PlusCircle,
  Check,
  ChevronLeft,
  Share2,
  CheckCircle2,
  Edit3,
  X,
  Sparkles,
  Save,
  RotateCcw,
  Move,
} from "lucide-react";

export default function LineupBuilder({
  onBack,
  teamId,
  accountId = "demo",
  members = [],
  currentUserRole,
}) {
  const pitchRef = useRef(null);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const suppressTap = useRef(false);
  useEffect(
    () => () =>
      window.dispatchEvent(
        new CustomEvent("lineup-drag", { detail: { active: false } }),
      ),
    [],
  );
  const [selectedFormationId, setSelectedFormationId] = usePersistentState(
    "no_offside_lineup_selected_" + accountId + "::" + teamId,
    () =>
      readStored(
        "no_offside_lineup_selected_" + accountId + "::" + teamId,
        accountId === "demo"
          ? readStored(
              "no_offside_lineup_selected_" + teamId,
              teamId === "fc-no-offside-99"
                ? readStored(
                    "no_offside_lineup_selected_demo::undefined",
                    readStored("no_offside_lineup_selected_undefined", "2-3-1"),
                  )
                : "2-3-1",
            )
          : "2-3-1",
    ),
  );
  const [activeFormationId, setActiveFormationId] = usePersistentState(
    "no_offside_lineup_active_" + accountId + "::" + teamId,
    () =>
      readStored(
        "no_offside_lineup_active_" + accountId + "::" + teamId,
        readStored("no_offside_lineup_selected_" + accountId + "::" + teamId, "2-3-1"),
      ),
  );
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showCreateFormationModal, setShowCreateFormationModal] =
    useState(false);
  const [newFormationName, setNewFormationName] = useState("");
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Available players pool to swap
  const canEdit = ["owner", "admin"].includes(currentUserRole);
  const teamRoster = members.map((m) => ({ ...m, name: m.name, role: m.role }));

  // Formations state (Each player has top/left % and drag support)
  const [formationsList, setFormationsList] = usePersistentState(
    "no_offside_lineups_" + accountId + "::" + teamId,
    () =>
      readStored(
        "no_offside_lineups_" + accountId + "::" + teamId,
        (accountId === "demo"
          ? readStored(
              "no_offside_lineups_" + teamId,
              teamId === "fc-no-offside-99"
                ? readStored(
                    "no_offside_lineups_demo::undefined",
                    readStored("no_offside_lineups_undefined", null),
                  )
                : null,
            )
          : null) ||
          [
            {
              id: "2-3-1",
              name: "Sơ đồ 2-3-1 (Tấn công trung lộ)",
              tag: "Phổ biến nhất Sân 7",
              players: [
                {
                  id: "gk",
                  role: "GK",
                  name: "Văn Lâm",
                  number: 1,
                  top: "88%",
                  left: "50%",
                },
                {
                  id: "cb1",
                  role: "LCB",
                  name: "Ngọc Hải",
                  number: 3,
                  top: "70%",
                  left: "26%",
                },
                {
                  id: "cb2",
                  role: "RCB",
                  name: "Duy Mạnh",
                  number: 28,
                  top: "70%",
                  left: "74%",
                },
                {
                  id: "lm",
                  role: "LM",
                  name: "Văn Thanh",
                  number: 17,
                  top: "48%",
                  left: "18%",
                },
                {
                  id: "cm",
                  role: "CM",
                  name: "Hoàng Đức",
                  number: 14,
                  top: "50%",
                  left: "50%",
                },
                {
                  id: "rm",
                  role: "RM",
                  name: "Quang Hải",
                  number: 19,
                  top: "48%",
                  left: "82%",
                },
                {
                  id: "st",
                  role: "ST",
                  name: "Tuấn Hưng (Bạn)",
                  number: 9,
                  top: "22%",
                  left: "50%",
                  isUser: true,
                },
              ],
            },
            {
              id: "3-2-1",
              name: "Sơ đồ 3-2-1 (Phòng ngự phản công)",
              tag: "Chắc chắn",
              players: [
                {
                  id: "gk",
                  role: "GK",
                  name: "Văn Lâm",
                  number: 1,
                  top: "88%",
                  left: "50%",
                },
                {
                  id: "lb",
                  role: "LB",
                  name: "Văn Hậu",
                  number: 5,
                  top: "72%",
                  left: "18%",
                },
                {
                  id: "cb",
                  role: "CB",
                  name: "Ngọc Hải",
                  number: 3,
                  top: "75%",
                  left: "50%",
                },
                {
                  id: "rb",
                  role: "RB",
                  name: "Trọng Hoàng",
                  number: 8,
                  top: "72%",
                  left: "82%",
                },
                {
                  id: "cm1",
                  role: "LCM",
                  name: "Tuấn Anh",
                  number: 11,
                  top: "48%",
                  left: "35%",
                },
                {
                  id: "cm2",
                  role: "RCM",
                  name: "Hoàng Đức",
                  number: 14,
                  top: "48%",
                  left: "65%",
                },
                {
                  id: "st",
                  role: "ST",
                  name: "Tuấn Hưng (Bạn)",
                  number: 9,
                  top: "22%",
                  left: "50%",
                  isUser: true,
                },
              ],
            },
            {
              id: "2-1-2-1",
              name: "Sơ đồ 2-1-2-1 (Kim cương ảo)",
              tag: "Kiểm soát bóng",
              players: [
                {
                  id: "gk",
                  role: "GK",
                  name: "Văn Lâm",
                  number: 1,
                  top: "88%",
                  left: "50%",
                },
                {
                  id: "cb1",
                  role: "LCB",
                  name: "Ngọc Hải",
                  number: 3,
                  top: "72%",
                  left: "28%",
                },
                {
                  id: "cb2",
                  role: "RCB",
                  name: "Duy Mạnh",
                  number: 28,
                  top: "72%",
                  left: "72%",
                },
                {
                  id: "dm",
                  role: "DM",
                  name: "Hoàng Đức",
                  number: 14,
                  top: "56%",
                  left: "50%",
                },
                {
                  id: "am1",
                  role: "LAM",
                  name: "Tuấn Anh",
                  number: 11,
                  top: "38%",
                  left: "32%",
                },
                {
                  id: "am2",
                  role: "RAM",
                  name: "Quang Hải",
                  number: 19,
                  top: "38%",
                  left: "68%",
                },
                {
                  id: "st",
                  role: "ST",
                  name: "Tuấn Hưng (Bạn)",
                  number: 9,
                  top: "18%",
                  left: "50%",
                  isUser: true,
                },
              ],
            },
          ].map((f) => ({
            ...f,
            players: f.players.map((p, i) => {
              const member = members.find((m) => m.number === p.number);
              return {
                ...p,
                name: member?.name || "Chưa xếp",
                number: member?.number || "—",
                memberId: member?.id,
              };
            }),
          })),
      ),
  );

  const currentFormation =
    formationsList.find((f) => f.id === selectedFormationId) ||
    formationsList[0];

  const handleSwapPlayer = (newPlayer) => {
    if (!canEdit || !selectedPlayer) return;
    if (
      currentFormation.players.some(
        (p) => p.id !== selectedPlayer.id && p.number === newPlayer.number,
      )
    ) {
      alert("Cầu thủ này đã ở trong đội hình.");
      return;
    }
    setFormationsList((prev) =>
      prev.map((f) => {
        if (f.id !== selectedFormationId) return f;
        return {
          ...f,
          players: f.players.map((p) => {
            if (p.id === selectedPlayer.id) {
              return {
                ...p,
                name: newPlayer.name,
                number: newPlayer.number,
                memberId: newPlayer.id,
                isUser: newPlayer.name.includes("Bạn"),
              };
            }
            return p;
          }),
        };
      }),
    );
    setSelectedPlayer(null);
  };

  // Tạo sơ đồ mới: Cầu thủ đặt ở mép sân (Touchline / Băng ghế) để Admin tự do kéo thả vào sân!
  const handleCreateNewFormation = () => {
    if (!canEdit || !newFormationName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newForm = {
      id: newId,
      name: newFormationName.trim(),
      tag: "Tùy chỉnh Kéo Thả",
      players: [
        {
          id: "p1",
          role: "GK",
          name: "Văn Lâm",
          number: 1,
          top: "92%",
          left: "15%",
        },
        {
          id: "p2",
          role: "CB",
          name: "Ngọc Hải",
          number: 3,
          top: "92%",
          left: "26%",
        },
        {
          id: "p3",
          role: "CB",
          name: "Duy Mạnh",
          number: 28,
          top: "92%",
          left: "38%",
        },
        {
          id: "p4",
          role: "MF",
          name: "Hoàng Đức",
          number: 14,
          top: "92%",
          left: "50%",
        },
        {
          id: "p5",
          role: "MF",
          name: "Quang Hải",
          number: 19,
          top: "92%",
          left: "62%",
        },
        {
          id: "p6",
          role: "MF",
          name: "Tuấn Anh",
          number: 11,
          top: "92%",
          left: "74%",
        },
        {
          id: "p7",
          role: "ST",
          name: "Tuấn Hưng (Bạn)",
          number: 9,
          top: "92%",
          left: "85%",
          isUser: true,
        },
      ],
    };
    newForm.players = newForm.players.map((p, i) => ({
      ...p,
      name: teamRoster[i]?.name || "Chưa xếp",
      number: teamRoster[i]?.number || "—",
      memberId: teamRoster[i]?.id,
    }));
    setFormationsList((prev) => [...prev, newForm]);
    setSelectedFormationId(newId);
    setNewFormationName("");
    setShowCreateFormationModal(false);
  };

  // Nút Lưu Đội Hình
  const handleSaveLineupCoordinates = () => {
    if (!canEdit) return;
    if (
      !writeStored(
        "no_offside_lineups_" + accountId + "::" + teamId,
        formationsList,
      ) ||
      !writeStored(
        "no_offside_lineup_selected_" + accountId + "::" + teamId,
        selectedFormationId,
      )
    ) {
      setSaveError(
        "Không lưu được sơ đồ. Kiểm tra dung lượng thiết bị rồi thử lại.",
      );
      return;
    }
    setActiveFormationId(selectedFormationId);
    writeStored(
      "no_offside_lineup_active_" + accountId + "::" + teamId,
      selectedFormationId,
    );
    setSaveError("");
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 pb-28 font-sans antialiased">
      {/* 1. Header Dark Geometric Style */}
      <header className="tactics-header">
        <button aria-label="Quay lại" onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <h1>Chiến thuật</h1>
        <button
          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!canEdit}
          onClick={() => setShowCreateFormationModal(true)}
        >
          <PlusCircle size={16} />
          <span>Tạo sơ đồ</span>
        </button>
      </header>

      {/* Control Bar: Hướng dẫn kéo thả & Nút Lưu Sơ Đồ */}
      {saveError && (
        <p role="alert" className="mx-4 mt-3 text-sm text-rose-700">
          {saveError}
        </p>
      )}
      <div className="px-4 mt-2.5 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <Move className="w-3.5 h-3.5 text-emerald-600" />
          <span>Kéo để xếp, chạm để đổi</span>
        </div>

        {/* NÚT LƯU SƠ ĐỒ */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={!canEdit}
          onClick={handleSaveLineupCoordinates}
          className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span>{saveSuccessNotice ? "Đã lưu" : "Lưu sơ đồ"}</span>
        </motion.button>
      </div>

      {/* 2. Tactical Football Pitch (Sân bóng tone xanh lục bảo sẫm với Free Drag & Drop) */}
      <div className="px-4 mt-2">
        <div
          ref={pitchRef}
          className="relative w-full aspect-[9/13] rounded-[32px] overflow-hidden border-2 border-emerald-950/40 bg-emerald-950"
        >
          {/* Turf lines pattern */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white/80 rounded-2xl"></div>
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/80 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-28 h-28 border-2 border-white/80 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-44 h-20 border-b-2 border-l-2 border-r-2 border-white/80 rounded-b-xl"></div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-44 h-20 border-t-2 border-l-2 border-r-2 border-white/80 rounded-t-xl"></div>

            {/* Sideline Touchline indicator */}
            <div className="absolute bottom-1 left-2 right-2 h-7 border-t border-dashed border-emerald-300/40 flex items-center justify-center">
              <span className="text-xs text-emerald-300/60 font-bold  tracking-wider">
                Băng Ghế / Mép Sân Kéo Vào
              </span>
            </div>
          </div>

          {/* Player Pins with Framer Motion Free Drag */}
          {currentFormation.players.map((player) => (
            <div
              key={player.id + player.top + player.left}
              style={{
                top: player.top,
                left: player.left,
                zIndex: draggedPlayer === player.id ? 50 : 10,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <motion.div
                role={canEdit ? "button" : undefined}
                tabIndex={canEdit ? 0 : undefined}
                aria-label={`Đổi cầu thủ ${player.name}`}
                onKeyDown={(e) => {
                  if (canEdit && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setSelectedPlayer(player);
                  }
                }}
                drag={canEdit}
                onTap={() => {
                  if (canEdit && !suppressTap.current)
                    setSelectedPlayer(player);
                }}
                onPointerDownCapture={(e) => {
                  if (e.isPrimary) suppressTap.current = false;
                }}
                onClick={(e) => {
                  if (canEdit && e.detail === 0 && !suppressTap.current)
                    setSelectedPlayer(player);
                }}
                dragConstraints={pitchRef}
                dragElastic={0.05}
                dragMomentum={false}
                onDragStart={() => {
                  suppressTap.current = true;
                  setDraggedPlayer(player.id);
                  window.dispatchEvent(
                    new CustomEvent("lineup-drag", {
                      detail: { active: true },
                    }),
                  );
                }}
                onPointerCancel={() => {
                  suppressTap.current = true;
                  setDraggedPlayer(null);
                  window.dispatchEvent(
                    new CustomEvent("lineup-drag", {
                      detail: { active: false },
                    }),
                  );
                }}
                onDragEnd={(_event, info) => {
                  suppressTap.current = true;
                  setDraggedPlayer(null);
                  window.dispatchEvent(
                    new CustomEvent("lineup-drag", {
                      detail: { active: false },
                    }),
                  );
                  const rect = pitchRef.current.getBoundingClientRect();
                  const left = Math.max(
                    5,
                    Math.min(
                      95,
                      parseFloat(player.left) +
                        (info.offset.x / rect.width) * 100,
                    ),
                  );
                  const top = Math.max(
                    5,
                    Math.min(
                      95,
                      parseFloat(player.top) +
                        (info.offset.y / rect.height) * 100,
                    ),
                  );
                  setFormationsList((prev) =>
                    prev.map((f) =>
                      f.id === selectedFormationId
                        ? {
                            ...f,
                            players: f.players.map((p) =>
                              p.id === player.id
                                ? { ...p, left: left + "%", top: top + "%" }
                                : p,
                            ),
                          }
                        : f,
                    ),
                  );
                }}
                whileDrag={{ scale: 1.2, zIndex: 50 }}
                className="tactics-player cursor-grab active:cursor-grabbing flex flex-col items-center touch-none"
              >
                {/* Number Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2  transition-all cursor-pointer ${
                    player.isUser
                      ? "bg-emerald-400 text-slate-950 border-white ring-4 ring-emerald-400/50"
                      : player.role === "GK"
                        ? "bg-amber-400 text-slate-950 border-amber-100 ring-2 ring-amber-400/50"
                        : "bg-slate-900 text-white border-white/80 ring-2 ring-black/40"
                  }`}
                  title="Kéo để di chuyển, click để đổi người"
                >
                  {player.number}
                </div>

                {/* High-Contrast White Name Badge */}
                <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900/95 border border-white/25  text-xs font-bold text-white whitespace-nowrap text-center drop-">
                  {player.name}
                </div>
              </motion.div>
            </div>
          ))}

          {/* Hint Overlay */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-emerald-200/90 font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
            Kéo thả vị trí tùy ý • Chạm để đổi người
          </div>
        </div>
      </div>

      {/* 3. Danh sách chiến thuật */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <span className="text-xs font-bold tracking-wider text-gray-500">
            DANH SÁCH CHIẾN THUẬT ({formationsList.length})
          </span>
          <span className="text-xs font-medium text-gray-400">
            Chạm để xem và chỉnh sửa
          </span>
        </div>

        <div className="space-y-2.5">
          {formationsList.map((item) => {
            const isSelected = item.id === selectedFormationId;
            const isCurrentInUse = item.id === activeFormationId;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedFormationId(item.id);
                  }
                }}
                onClick={() => setSelectedFormationId(item.id)}
                className={`p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-emerald-50/70 border-emerald-300 text-gray-900 ring-1 ring-emerald-300/40"
                    : "bg-white border-gray-200 hover:border-gray-300 text-gray-800"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Network size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-gray-900 truncate">
                        {item.name}
                      </h4>
                      {isCurrentInUse && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          Đang sử dụng
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                      {item.tag}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Đang chọn</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-400">
                      Xem sơ đồ
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL ĐỔI CẦU THỦ KHI CHẠM VÀO PIN */}
      {selectedPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-5 max-h-[80vh] overflow-y-auto  border border-gray-100 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Đổi Cầu Thủ: {selectedPlayer.name} (#{selectedPlayer.number})
                </h3>
                <p className="text-xs text-gray-400">
                  Chọn cầu thủ từ đội hình để thay thế vào vị trí này
                </p>
              </div>
              <button
                aria-label="Đóng"
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
              {teamRoster.map((rosterPlayer, idx) => (
                <button
                  type="button"
                  key={rosterPlayer.id || idx}
                  onClick={() => handleSwapPlayer(rosterPlayer)}
                  className="w-full text-left p-2.5 rounded-2xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-slate-900 text-white tabular-nums text-xs font-bold flex items-center justify-center">
                      #{rosterPlayer.number}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {rosterPlayer.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Vị trí: {rosterPlayer.role}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-white border border-gray-200">
                    Chọn
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO SƠ ĐỒ MỚI */}
      {showCreateFormationModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5  border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-base text-gray-900">
                  Tạo sơ đồ tự xếp mới
                </h3>
              </div>
              <button
                aria-label="Đóng"
                onClick={() => setShowCreateFormationModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3 text-xs">
              <div>
                <label
                  htmlFor="new-formation-name"
                  className="text-gray-600 block mb-1 font-bold"
                >
                  Tên Sơ Đồ Chiến Thuật
                </label>
                <input
                  type="text"
                  required
                  id="new-formation-name"
                  placeholder="Ví dụ: Đội hình tử thủ, Tiki-Taka 7 người..."
                  value={newFormationName}
                  onChange={(e) => setNewFormationName(e.target.value)}
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Khi tạo xong, các cầu thủ sẽ xuất hiện ở mép sân. Bạn có thể
                dùng tay kéo thả họ tự do vào bất kỳ vị trí chiến thuật nào trên
                sân!
              </p>

              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleCreateNewFormation}
                  className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs   cursor-pointer"
                >
                  Tạo sơ đồ
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
