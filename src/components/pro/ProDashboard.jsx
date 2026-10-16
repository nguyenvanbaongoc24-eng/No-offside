import {Beer} from '../icons';
import React, { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Medal,
  Swords,
  Clapperboard,
  Wallet,
  Network,
} from "../icons";
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

  const hasRankingData = ranking.some((m) => m.stats.matches > 0);

  return (
    <section className="pro-panel pro-dashboard">
      <div className="pro-toolbar">
        <h2>BXH nội bộ</h2>
        {hasRankingData && (
          <Pressable className="text-action" onClick={() => onOpen("stars")}>
            Xem tất cả
          </Pressable>
        )}
      </div>

      {pro.loading ? (
        <div className="py-4 text-center text-xs text-slate-500">
          Đang tải bảng xếp hạng…
        </div>
      ) : pro.error ? (
        <div className="py-4 text-center text-xs text-rose-500">
          {pro.error}
        </div>
      ) : !hasRankingData ? (
        <div className="pro-empty-card py-4 px-2 text-center space-y-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Chưa có dữ liệu xếp hạng.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bảng xếp hạng sẽ xuất hiện khi có thành tích trận đấu.
          </p>
        </div>
      ) : (
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
        </div>
      )}
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
