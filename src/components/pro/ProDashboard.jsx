import React, { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Medal,
  Swords,
  Clapperboard,
  Wallet,
  Network,
} from "lucide-react";
import Avatar from "../Avatar";
import Pressable from "../Pressable";
import ProModal from "./ProModal";
import { proRanking, motmWinners } from "../../lib/pro";
export default function ProDashboard({
  pro,
  members = [],
  matches = [],
  user,
  leader,
  onOpen,
  onLineup,
}) {
  const { state, busy, demo } = pro,
    [vote, setVote] = useState(null),
    [error, setError] = useState("");
  const ranking = useMemo(
    () => proRanking(members, state.stats, state.reports),
    [members, state.stats, state.reports],
  );
  useEffect(() => {
    if (demo || vote) return;
    const match = matches.find(
      (m) =>
        m.status === "completed" &&
        Date.parse(m.datetime) <= Date.now() &&
        Date.now() - Date.parse(m.datetime) < 3 * 864e5 &&
        state.participation.some(
          (p) => p.match_id === m.id && p.subject === user.id,
        ) &&
        !state.votes.some((v) => v.match_id === m.id && v.own) &&
        !state.awards.some((a) => a.match_id === m.id) &&
        !sessionStorage.getItem("no_pro_motm_" + user.id + "_" + m.id),
    );
    if (match) setVote(match);
  }, [state.votes, state.participation, matches, user.id, demo]);
  const dismiss = () => {
    if (vote)
      sessionStorage.setItem("no_pro_motm_" + user.id + "_" + vote.id, "1");
    setVote(null);
    setError("");
  };
  return (
    <section className="pro-panel pro-dashboard">
      <div className="pro-toolbar">
        <h2>{leader ? "BXH nội bộ" : "No Offside Pro"}</h2>
        <Pressable className="text-action" onClick={() => onOpen("stars")}>
          Xem thêm
        </Pressable>
      </div>
      {leader && (
        <div className="pro-podium">
          {ranking
            .filter((m) => m.stats.matches > 0)
            .slice(0, 3)
            .map((m, i) => (
              <div key={m.id}>
                <Medal size={22} className={"rank-" + i} />
                <Avatar src={m.avatar} name={m.name} />
                <strong>{m.name}</strong>
                <span>{m.stats.goals} bàn</span>
              </div>
            ))}
          {!ranking.some((m) => m.stats.matches > 0) && (
            <p className="pro-empty">
              {pro.loading
                ? "Đang tải BXH…"
                : pro.error
                  ? "Chưa tải được BXH."
                  : "Chưa có thống kê trận để xếp hạng."}
            </p>
          )}
        </div>
      )}
      <div className="pro-shortcuts">
        {[
          ["board", "Cáp kèo", Swords],
          ["finance", "Hiệp 3", Wallet],
          ["media", "Poster", Clapperboard],
        ].map(([id, label, Icon]) => (
          <Pressable key={id} onClick={() => onOpen(id)}>
            <Icon size={19} />
            {label}
          </Pressable>
        ))}
        <Pressable onClick={onLineup}>
          <Network size={19} />
          Sa bàn Pro
        </Pressable>
      </div>
      <ProModal
        open={!!vote}
        title="Ai là MOTM của trận?"
        onClose={dismiss}
        busy={busy}
      >
        <p className="field-hint">
          {vote?.title || vote?.opponent} · Chạm để bầu chọn.
        </p>
        <div className="pro-vote-grid">
          {members
            .filter((m) =>
              state.participation.some(
                (p) => p.match_id === vote?.id && p.subject === m.id,
              ),
            )
            .map((m) => (
              <Pressable
                key={m.id}
                disabled={busy}
                onClick={async () => {
                  try {
                    await pro.mutate("vote", {
                      matchId: vote.id,
                      candidate: m.id,
                    });
                    dismiss();
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                <Avatar src={m.avatar} name={m.name} />
                <strong>{m.name}</strong>
              </Pressable>
            ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </ProModal>
    </section>
  );
}
