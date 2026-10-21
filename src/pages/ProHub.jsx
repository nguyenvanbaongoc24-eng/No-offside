import Matchmaking from './Matchmaking';
import {Beer} from '../components/icons';
import {thirdChargeLabel} from '../lib/menuLabels';
import { imageDataUrl } from "../lib/images";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
  ChevronRight,
  Plus,
  Swords,
  Trophy,
  Wallet,
  Clapperboard,
  Network,
  Download,
  Check,
  Medal,
  Trash2,
} from "../components/icons";
import Pressable from "../components/Pressable";
import Avatar from "../components/Avatar";
import ProModal from "../components/pro/ProModal";
import PlayerCard from "../components/pro/PlayerCard";
import {
  splitBill,
  mediaLink,
  proRanking,
  weeklyAwards,
  downloadDesign,
} from "../lib/pro";
import { formatCurrency } from "../lib/formatCurrency";
import { notify } from "../lib/feedback";
const sections = [
  ["board", "Tìm đối", Swords],
  ["benefits", "Gói theo đội", Check],
  ["stars", "Ngôi sao", Trophy],
  ["finance", "Sinh tố lúa mạch", Beer],
  ["media", "Media", Clapperboard],
];
export default function ProHub({
  pro,
  team,
  user,
  role,
  matches = [],
  initialSection = "board",
  onBack,
  onNavigate,
  onWorkspaceRefresh, onOpenFund, token, memberships, onSwitchTeam, onOpenMatch, initialFocus,
}) {
  const { state, loading, error, busy, demo } = pro,
    leader = ["owner", "admin"].includes(role);
  const [section, setSection] = useState(initialSection),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({}),
    [failure, setFailure] = useState(""),
    [matchId, setMatchId] = useState(matches[0]?.id || ""),
    [posterBg, setPosterBg] = useState(""),
    [exporting, setExporting] = useState(false);
  const receipt = useRef(null),
    poster = useRef(null);
  const selected = matches.find((m) => m.id === matchId),
    members = (team.members || []).filter(
      (m) => m.membershipStatus !== "removed",
    ),
    ranking = useMemo(
      () => proRanking(members, state.stats, state.reports),
      [team.members, state.stats, state.reports],
    ),
    winners = weeklyAwards(state.awards);
  useEffect(() => setSection(initialSection), [initialSection]);
  useEffect(() => {
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }, [section]);
  const open = (name, data = {}) => {
    setFailure("");
    receipt.current = null;
    setForm(data);
    setModal(name);
  };
  const field = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const run = async (action, payload, close = true) => {
    const signature = JSON.stringify([action, payload]);
    if (receipt.current?.signature !== signature)
      receipt.current = { signature, key: crypto.randomUUID() };
    try {
      await pro.mutate(action, payload, receipt.current.key);
      setFailure("");
      receipt.current = null;
      if (close) setModal(null);
      try {
        await onWorkspaceRefresh?.();
      } catch {
        notify("Đã lưu; mở lại Trang chủ để tải dữ liệu mới.");
      }
    } catch (e) {
      setFailure(e.message);
    }
  };
  const title = sections.find((s) => s[0] === section)?.[1];
  const ownCharges = state.charges.filter((c) => c.status === "owed");
  const billShares = (() => {
    try {
      return splitBill(Number(form.total), form.participants || []);
    } catch {
      return [];
    }
  })();
  return (
    <div className="pro-page mm-hub">
      <header className="compact-header">
        <Pressable aria-label="Quay lại" onClick={onBack}>
          <ArrowLeft size={22} />
        </Pressable>
        <h1>{section==="board"?"Tìm đối":section==="benefits"?"No Offside Pro":"Tiện ích đội"}</h1>
        <Pressable aria-label="Tiện ích đội" aria-haspopup="dialog" onClick={()=>setModal('utilities')}><MoreHorizontal size={24}/></Pressable>
      </header>
      <ProModal className="mm-sheet" open={modal==='utilities'} title="Tiện ích đội" onClose={()=>setModal(null)}>
       <div className="mm-menu">{sections.map(([id,label,Icon])=><Pressable key={id} aria-current={section===id?'page':undefined} onClick={()=>{setSection(id);setModal(null);}}><Icon size={22}/><span>{label}</span><ChevronRight size={20}/></Pressable>)}<Pressable onClick={()=>{setModal(null);onNavigate('lineup');}}><Network size={22}/><span>Chiến thuật</span><ChevronRight size={20}/></Pressable></div>
      </ProModal>
      {demo && (
        <p className="field-hint pro-inset">
          Bản trải nghiệm: xuất ảnh và Chiến Thuật dùng được. Thao tác lưu cần
          đăng nhập tài khoản thật.
        </p>
      )}
      {error && (
        <div className="pro-inset" role="alert">
          {error}
          <Pressable
            className="choice-button"
            onClick={() =>
              pro.refresh().catch((e) => notify(e.message, "error"))
            }
          >
            Thử lại
          </Pressable>
        </div>
      )}
      {loading ? (
        <div className="pro-loading" role="status">
          Đang tải {title}…
        </div>
      ) : (
        <>
          {(section==='board'||section==='benefits')&&<Matchmaking key={team.id+':'+user.id} team={team} user={user} token={token} demo={demo} matches={matches} memberships={memberships} onSwitchTeam={onSwitchTeam} onUpdated={onWorkspaceRefresh} onOpenMatch={onOpenMatch} initialFocus={initialFocus} benefits={section==='benefits'}/>}
          {section === "stars" && (
            <>
              <section className="pro-panel">
                <div className="pro-toolbar">
                  <h2>Thẻ cầu thủ của bạn</h2>
                  <Pressable
                    className="primary-button"
                    onClick={() => open("card")}
                  >
                    Tạo thẻ
                  </Pressable>
                </div>
                <p className="field-hint">
                  Số liệu từ thống kê trận đã chốt; báo cáo cá nhân dùng khi
                  chưa có bản chốt.
                </p>
                {leader && (
                  <Pressable
                    className="choice-button"
                    disabled={demo}
                    onClick={() => open("stats", { matchId: "", players: [] })}
                  >
                    Chốt thống kê trận
                  </Pressable>
                )}
              </section>
              <section className="pro-panel">
                <h2>BXH nội bộ</h2>
                <div className="pro-leaderboard">
                  {ranking
                    .filter((m) => m.stats.matches > 0)
                    .map((m, i) => (
                      <div className="pro-list-row" key={m.id}>
                        <span className={"pro-rank rank-" + i}>
                          {i < 3 ? <Medal size={24} /> : i + 1}
                        </span>
                        <Avatar src={m.avatar} name={m.name} />
                        <div>
                          <strong>
                            {m.name}
                            {winners[m.id] && (
                              <Trophy size={15} aria-label="MOTM trong tuần" />
                            )}
                          </strong>
                          <p>
                            {m.stats.goals} bàn · {m.stats.assists} kiến tạo ·{" "}
                            {m.stats.matches} trận
                          </p>
                        </div>
                      </div>
                    ))}
                  {!ranking.some((m) => m.stats.matches > 0) && (
                    <p className="pro-empty">
                      Chưa có thống kê trận để xếp hạng.
                    </p>
                  )}
                </div>
              </section>
              <section className="pro-panel">
                <h2>Bầu chọn MOTM</h2>
                <p className="field-hint">
                  Người tham gia bầu trong 72 giờ từ giờ đá; mỗi người một
                  phiếu, đổi được trước khi chốt. Chốt khi đủ phiếu hoặc hết 72
                  giờ; cúp giữ 7 ngày. Hòa phiếu chưa trao cúp.
                </p>
                {matches
                  .filter((m) => m.status === "completed")
                  .map((m) => (
                    <Pressable
                      className="menu-row"
                      key={m.id}
                      disabled={
                        demo ||
                        state.awards.some((a) => a.match_id === m.id) ||
                        Date.now() - Date.parse(m.datetime) > 3 * 864e5 ||
                        !state.participation.some(
                          (p) => p.match_id === m.id && p.subject === user.id,
                        )
                      }
                      onClick={() => open("vote", { matchId: m.id })}
                    >
                      <Trophy size={18} />
                      {m.title || m.opponent || "Trận đấu"}
                      {state.votes.some(
                        (v) => v.match_id === m.id && v.own,
                      ) && <Check size={16} />}
                    </Pressable>
                  ))}
              </section>
            </>
          )}
          {section === "finance" && (
            <>
              <section className="pro-panel pro-finance-summary">
                <p>Sinh tố lúa mạch · {leader ? "Tổng còn cần đóng" : "Khoản của bạn"}</p>
                <strong>
                  {formatCurrency(
                    ownCharges
                      .filter((c) => c.kind === "third")
                      .reduce((n, c) => n + Math.max(0,Number(c.amount)-Number(c.paid_amount||0)), 0),
                  )}
                </strong>
                {leader && (
                  <Pressable
                    className="primary-button pro-bill-action"
                    disabled={busy || demo}
                    onClick={() =>
                      onOpenFund?onOpenFund("bill"):open("bill", {
                        title: "Sinh tố lúa mạch",
                        total: "",
                        participants: [],
                      })
                    }
                  >
                    <Plus size={18} />
                    Chia bill Sinh tố lúa mạch
                  </Pressable>
                )}
                <p className="field-hint">
                  Dùng chung nghĩa vụ và đối soát ở Quỹ đội. Chỉ xác nhận đã
                  nhận tiền.
                </p>
              </section>
              {leader && (
                <section className="pro-panel">
                  <h2>Luật phạt tự động</h2>
                  <p className="field-hint">
                    Áp dụng cho lần chốt mới sau khi bật. Đi muộn cần vi phạm đã
                    xác nhận; sát giờ là trong 2 giờ trước trận. Phạt được ghi
                    riêng, không coi là tiền đã thu.
                  </p>
                  {[
                    ["yellow", "Thẻ vàng · 50.000 đ/thẻ"],
                    ["late", "Đi muộn · 30.000 đ"],
                    ["absence", "Báo vắng sát giờ · 100.000 đ"],
                  ].map(([key, label]) => (
                    <label className="pro-toggle" key={key}>
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={state.policy[key] === true}
                        disabled={busy || demo}
                        onChange={(e) =>
                          run(
                            "policy",
                            { ...state.policy, [key]: e.target.checked },
                            false,
                          )
                        }
                      />
                    </label>
                  ))}
                </section>
              )}
              <section className="pro-panel">
                <h2>Các khoản cần đóng</h2>
                {state.charges.map((c) => (
                  <article className="pro-list-row" key={c.id}>
                    <div>
                      <strong>
                        {members.find((m) => m.id === c.subject)?.name ||
                          "Thành viên"}
                      </strong>
                      <p>{thirdChargeLabel(c.label,c.kind)}</p>
                      <small>
                        {c.kind === "fine" ? "Phạt · Quỹ đội" : "Sinh tố lúa mạch"} ·{" "}
                        {
                          {
                            owed: "Cần đóng",
                            paid: "Đã đối soát",
                            void: "Đã miễn",
                          }[c.status]
                        }
                      </small>
                    </div>
                    <div>
                      <strong className={c.kind === "fine" ? "pro-debt" : ""}>
                        {formatCurrency(Math.max(0,Number(c.amount)-Number(c.paid_amount||0)))}
                      </strong>
                      {leader && c.status === "owed" && (
                        <Pressable
                          className="text-action"
                          onClick={() =>
                            onOpenFund?onOpenFund():open("charge", {
                              chargeId: c.id,
                              kind: c.kind,
                              reason: "",
                              action:
                                c.kind === "third"
                                  ? "charge-paid"
                                  : "charge-void",
                            })
                          }
                        >
                          {c.kind === "third" ? "Đối soát" : "Miễn có lý do"}
                        </Pressable>
                      )}
                    </div>
                  </article>
                ))}
                {!state.charges.length && (
                  <p className="pro-empty">
                    Chưa phát sinh khoản Sinh tố lúa mạch hoặc phạt tự động.
                  </p>
                )}
              </section>
            </>
          )}
          {section === "media" && (
            <>
              <section className="pro-panel">
                <h2>Truyền thông đội</h2>
                <label className="form-field">
                  Trận đấu
                  <select
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                  >
                    <option value="">Chọn trận</option>
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title || m.opponent || "Trận đấu"}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <>
                    <div
                      className="pro-poster"
                      ref={poster}
                      style={
                        posterBg
                          ? {
                              backgroundImage: `linear-gradient(0deg,rgba(3,25,15,.86),rgba(3,25,15,.5)),url("${posterBg}")`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      <div className="pro-poster-lines" />
                      <p>NO OFFSIDE · MATCHDAY</p>
                      <div className="pro-poster-teams">
                        <div>
                          <Avatar src={team.logo} name={team.teamName} />
                          <strong>{team.teamName}</strong>
                        </div>
                        <b>VS</b>
                        <div>
                          <Avatar
                            src={selected.opponentLogo}
                            name={
                              selected.opponent ||
                              selected.title?.split("—").at(-1)?.trim()
                            }
                          />
                          <strong>
                            {selected.opponent ||
                              selected.title?.split("—").at(-1)?.trim()}
                          </strong>
                        </div>
                      </div>
                      <h3>
                        {new Date(selected.datetime).toLocaleString("vi-VN", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </h3>
                      <p>{selected.venue || team.venue}</p>
                    </div>
                    <label className="form-field mt-3">
                      Ảnh sân nền (tùy chọn)
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={async (e) => {
                          try {
                            setPosterBg(
                              await imageDataUrl(e.target.files?.[0]),
                            );
                          } catch (err) {
                            notify(err.message, "error");
                          }
                        }}
                      />
                    </label>
                    <Pressable
                      className="primary-button"
                      disabled={exporting}
                      onClick={async () => {
                        if (exporting) return;
                        setExporting(true);
                        try {
                          await downloadDesign(
                            poster.current,
                            "No-Offside-Matchday",
                          );
                          notify("Đã xuất poster");
                        } catch (e) {
                          notify(e.message, "error");
                        } finally {
                          setExporting(false);
                        }
                      }}
                    >
                      <Download size={18} />
                      {exporting ? "Đang xuất…" : "Xuất poster PNG"}
                    </Pressable>
                    {selected.status === "completed" && (
                      <Pressable
                        disabled={busy || demo}
                        className="choice-button"
                        onClick={() =>
                          open("media", {
                            matchId: selected.id,
                            url: "",
                            caption: "",
                          })
                        }
                      >
                        <Plus size={18} />
                        Thêm khoảnh khắc
                      </Pressable>
                    )}
                  </>
                )}
                {!selected && (
                  <p className="pro-empty">
                    Tạo hoặc chọn trận để xuất poster.
                  </p>
                )}
              </section>
              <section className="pro-panel">
                <h2>Khoảnh khắc</h2>
                <div className="pro-media-grid">
                  {state.media
                    .filter((x) => x.match_id === matchId)
                    .map((x) => (
                      <article key={x.id}>
                        {x.kind === "image" ? (
                          <img
                            src={x.url}
                            alt={x.caption || "Khoảnh khắc trận đấu"}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="pro-video">
                            <iframe
                              src={x.url}
                              title={x.caption || "Highlight bóng đá"}
                              loading="lazy"
                              allow="fullscreen; picture-in-picture"
                              referrerPolicy="no-referrer"
                              allowFullScreen
                            />
                          </div>
                        )}
                        <p>{x.caption}</p>
                        <a
                          href={x.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Mở nguồn
                        </a>
                        {(leader || x.actor === user.id) && (
                          <Pressable
                            aria-label="Ẩn khoảnh khắc"
                            disabled={busy}
                            onClick={() => open("hide", { mediaId: x.id })}
                          >
                            <Trash2 size={16} />
                          </Pressable>
                        )}
                      </article>
                    ))}
                </div>
                {!state.media.some((x) => x.match_id === matchId) && (
                  <p className="pro-empty">Chưa có khoảnh khắc của trận này.</p>
                )}
              </section>
            </>
          )}
        </>
      )}
      <ProModal
        open={!!modal && modal!=='utilities'}
        title={
          {
            offer: "Đăng kèo giao hữu",
            challenge: "Gửi lời thách đấu",
            accept: "Nhận kèo giao hữu",
            bill: "Chia bill Sinh tố lúa mạch",
            charge: "Đối soát khoản cần đóng",
            card: "Thẻ cầu thủ",
            vote: "Bầu chọn MOTM",
            media: "Thêm khoảnh khắc",
            hide: "Ẩn khoảnh khắc",
            stats: "Chốt thống kê trận",
          }[modal] || ""
        }
        onClose={() => setModal(null)}
        busy={busy}
      >
        {modal === "card" && (
          <PlayerCard
            player={ranking.find((m) => m.id === user.id) || user}
            teamName={team.teamName}
            motm={winners[user.id]}
          />
        )}
        {modal === "stats" && (
          <form
            className="security-form"
            onSubmit={(e) => {
              e.preventDefault();
              run("finalize-stats", form);
            }}
          >
            <label className="form-field">
              Trận đã kết thúc
              <select
                required
                value={form.matchId}
                onChange={(e) => {
                  const id = e.target.value;
                  setForm({
                    matchId: id,
                    players: members
                      .filter((m) =>
                        state.participation.some(
                          (p) => p.match_id === id && p.subject === m.id,
                        ),
                      )
                      .map((m) => ({
                        id: m.id,
                        goals: 0,
                        assists: 0,
                        yellow: 0,
                      })),
                  });
                }}
              >
                <option value="">Chọn trận</option>
                {matches
                  .filter(
                    (m) =>
                      m.status === "completed" &&
                      !state.stats.some((s) => s.match_id === m.id),
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title || m.opponent}
                    </option>
                  ))}
              </select>
            </label>
            <p className="field-hint">
              Chỉ người đã ghi nhận có mặt/giờ đến. Chốt một lần; thẻ vàng tính
              theo luật đang bật.
            </p>
            {form.players?.map((p, i) => (
              <fieldset className="pro-stat-row" key={p.id}>
                <legend>{members.find((m) => m.id === p.id)?.name}</legend>
                {[
                  ["goals", "Bàn", 100],
                  ["assists", "Kiến tạo", 100],
                  ["yellow", "Thẻ vàng", 2],
                ].map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={max}
                      value={p[key]}
                      onChange={(e) =>
                        field(
                          "players",
                          form.players.map((row, j) =>
                            i === j
                              ? { ...row, [key]: Number(e.target.value) }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </fieldset>
            ))}
            <Pressable
              className="primary-button"
              disabled={busy || !form.players?.length}
            >
              Chốt thống kê & tính phạt
            </Pressable>
          </form>
        )}
        {failure && (
          <p className="form-error mt-3" role="alert">
            {failure}
          </p>
        )}
      </ProModal>
    </div>
  );
}
