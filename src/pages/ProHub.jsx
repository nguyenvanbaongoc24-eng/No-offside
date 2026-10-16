import { imageDataUrl } from "../lib/images";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
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
} from "lucide-react";
import Pressable from "../components/Pressable";
import Avatar from "../components/Avatar";
import ProModal from "../components/pro/ProModal";
import PlayerCard from "../components/pro/PlayerCard";
import {
  LEVELS,
  FINANCE,
  splitBill,
  mediaLink,
  proRanking,
  weeklyAwards,
  downloadDesign,
} from "../lib/pro";
import { formatCurrency } from "../lib/formatCurrency";
import { notify } from "../lib/feedback";
const sections = [
  ["board", "Cáp kèo", Swords],
  ["stars", "Ngôi sao", Trophy],
  ["finance", "Hiệp 3", Wallet],
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
  onWorkspaceRefresh,
}) {
  const { state, loading, error, busy, demo } = pro,
    leader = ["owner", "admin"].includes(role);
  const [section, setSection] = useState(initialSection),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({}),
    [failure, setFailure] = useState(""),
    [filters, setFilters] = useState({ district: "", level: "", day: "" }),
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
  const offerSubmit = (e) => {
    e.preventDefault();
    const time = new Date(form.kickoff);
    if (!Number.isFinite(time.getTime()))
      return setFailure("Chọn ngày giờ hợp lệ.");
    run("offer", {
      ...form,
      kickoff: time.toISOString(),
      format: Number(form.format),
    });
  };
  const title = sections.find((s) => s[0] === section)?.[1];
  const ownCharges = state.charges.filter((c) => c.status === "owed");
  const visibleOffers = state.offers.filter(
    (o) =>
      (!filters.district || o.district === filters.district) &&
      (!filters.level || o.level === filters.level) &&
      (!filters.day ||
        Date.parse(o.kickoff) < Date.now() + Number(filters.day) * 864e5),
  );
  const billShares = (() => {
    try {
      return splitBill(Number(form.total), form.participants || []);
    } catch {
      return [];
    }
  })();
  return (
    <div className="pro-page">
      <header className="compact-header">
        <Pressable aria-label="Quay lại" onClick={onBack}>
          <ArrowLeft size={22} />
        </Pressable>
        <h1>No Offside Pro</h1>
        <Pressable
          aria-label="Mở Sa bàn Pro"
          onClick={() => onNavigate("lineup")}
        >
          <Network size={22} />
        </Pressable>
      </header>
      <div className="pro-sections" role="group" aria-label="Module Pro">
        {sections.map(([id, label, Icon]) => (
          <Pressable
            type="button"
            key={id}
            aria-pressed={section === id}
            onClick={() => setSection(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Pressable>
        ))}
      </div>
      {demo && (
        <p className="field-hint pro-inset">
          Bản trải nghiệm: xuất ảnh và sa bàn dùng được. Ghi dữ liệu Pro cần
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
          {section === "board" && (
            <>
              <div className="pro-toolbar">
                <h2>Sàn cáp kèo</h2>
                {leader && (
                  <Pressable
                    className="primary-button"
                    disabled={busy || demo}
                    onClick={() =>
                      open("offer", {
                        district: "",
                        venue: team.venue || "",
                        kickoff: "",
                        level: "regular",
                        format: 7,
                        finance: "split",
                      })
                    }
                  >
                    <Plus size={18} />
                    Đăng kèo
                  </Pressable>
                )}
              </div>
              <div className="pro-filters">
                {[
                  [
                    "district",
                    "Khu vực",
                    [...new Set(state.offers.map((o) => o.district))],
                  ],
                  ["level", "Trình độ", Object.keys(LEVELS)],
                ].map(([key, label, options]) => (
                  <label key={key}>
                    <span className="sr-only">{label}</span>
                    <select
                      aria-label={label}
                      value={filters[key]}
                      onChange={(e) =>
                        setFilters({ ...filters, [key]: e.target.value })
                      }
                    >
                      <option value="">{label}</option>
                      {options.map((v) => (
                        <option key={v} value={v}>
                          {LEVELS[v] || v}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <label>
                  <span className="sr-only">Thời gian</span>
                  <select
                    aria-label="Thời gian"
                    value={filters.day}
                    onChange={(e) =>
                      setFilters({ ...filters, day: e.target.value })
                    }
                  >
                    <option value="">Thời gian</option>
                    <option value="7">7 ngày tới</option>
                    <option value="30">30 ngày tới</option>
                  </select>
                </label>
              </div>
              <div className="pro-feed">
                {visibleOffers.map((o) => (
                    <article className="pro-offer" key={o.id}>
                      <header>
                        <Avatar src={o.logo} name={o.teamName} />
                        <div>
                          <h3>{o.teamName}</h3>
                          <p>{o.district}</p>
                        </div>
                        <span className={"pro-level " + o.level}>
                          {LEVELS[o.level]}
                        </span>
                      </header>
                      <p className="pro-offer-time">
                        Sân {o.format} ·{" "}
                        {new Date(o.kickoff).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                      <p>{o.venue}</p>
                      <p className="pro-money">
                        <Wallet size={16} />
                        {FINANCE[o.finance]}
                      </p>
                      {o.team_id === team.id ? (
                        <Pressable
                          className="choice-button"
                          disabled={busy}
                          onClick={() =>
                            run("close-offer", { offerId: o.id }, false)
                          }
                        >
                          Đóng kèo
                        </Pressable>
                      ) : leader ? (
                        <Pressable
                          className="pro-challenge"
                          disabled={
                            busy ||
                            state.challenges.some(
                              (c) =>
                                c.offer_id === o.id && c.team_id === team.id,
                            )
                          }
                          onClick={() =>
                            open("challenge", {
                              offerId: o.id,
                              opponent: o.teamName,
                            })
                          }
                        >
                          <Swords size={18} />
                          {state.challenges.some(
                            (c) => c.offer_id === o.id && c.team_id === team.id,
                          )
                            ? "Đã gửi lời thách đấu"
                            : "Gửi lời thách đấu"}
                        </Pressable>
                      ) : (
                        <p className="field-hint">
                          Ban quản trị đội gửi lời thách đấu.
                        </p>
                      )}
                    </article>
                  ))}
                {!state.offers.length && (
                  <p className="pro-empty">
                    Chưa có kèo được đăng. Đội của bạn có thể mở lời mời giao
                    hữu đầu tiên.
                  </p>
                )}
                {state.offers.length > 0 && !visibleOffers.length && (
                  <p className="pro-empty">Chưa có kèo phù hợp bộ lọc này.</p>
                )}
              </div>
              <section className="pro-panel">
                <h2>Lời thách đấu</h2>
                {state.challenges.map((c) => (
                  <article className="pro-list-row" key={c.id}>
                    <div>
                      <strong>{c.opponent}</strong>
                      <p>
                        {c.venue} ·{" "}
                        {new Date(c.kickoff).toLocaleString("vi-VN")}
                      </p>
                      <small>
                        {
                          {
                            pending: "Đang chờ",
                            accepted: "Đã nhận kèo",
                            declined: "Đã từ chối",
                          }[c.status]
                        }
                      </small>
                    </div>
                    {leader &&
                      c.offerTeam === team.id &&
                      c.status === "pending" &&
                      state.offers.some((o) => o.id === c.offer_id) && (
                        <div>
                          <Pressable
                            disabled={busy}
                            className="primary-button"
                            onClick={() =>
                              open("accept", {
                                challengeId: c.id,
                                opponent: c.opponent,
                              })
                            }
                          >
                            Nhận kèo
                          </Pressable>
                          <Pressable
                            disabled={busy}
                            className="choice-button"
                            onClick={() =>
                              run("decline", { challengeId: c.id }, false)
                            }
                          >
                            Từ chối
                          </Pressable>
                        </div>
                      )}
                  </article>
                ))}
                {!state.challenges.length && (
                  <p className="field-hint">Chưa có lời thách đấu.</p>
                )}
              </section>
            </>
          )}
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
                <p>Hiệp 3 · {leader ? "Tổng còn cần đóng" : "Khoản của bạn"}</p>
                <strong>
                  {formatCurrency(
                    ownCharges
                      .filter((c) => c.kind === "third")
                      .reduce((n, c) => n + Number(c.amount), 0),
                  )}
                </strong>
                {leader && (
                  <Pressable
                    className="primary-button"
                    disabled={busy || demo}
                    onClick={() =>
                      open("bill", {
                        title: "Hiệp 3",
                        total: "",
                        participants: [],
                      })
                    }
                  >
                    <Plus size={18} />
                    Chia bill Hiệp 3
                  </Pressable>
                )}
                <p className="field-hint">
                  Tách biệt với quỹ đội. Đối soát thực tế trước khi xác nhận đã
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
                      <p>{c.label}</p>
                      <small>
                        {c.kind === "fine" ? "Phạt · Quỹ đội" : "Hiệp 3"} ·{" "}
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
                        {formatCurrency(Number(c.amount))}
                      </strong>
                      {leader && c.status === "owed" && (
                        <Pressable
                          className="text-action"
                          onClick={() =>
                            open("charge", {
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
                    Chưa phát sinh khoản Hiệp 3 hoặc phạt tự động.
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
        open={!!modal}
        title={
          {
            offer: "Đăng kèo giao hữu",
            challenge: "Gửi lời thách đấu",
            accept: "Nhận kèo giao hữu",
            bill: "Chia bill Hiệp 3",
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
        {modal === "offer" && (
          <form className="security-form" onSubmit={offerSubmit}>
            {[
              ["district", "Khu vực / Quận", "text"],
              ["venue", "Sân bóng", "text"],
              ["kickoff", "Ngày giờ đá", "datetime-local"],
            ].map(([key, label, type]) => (
              <label className="form-field" key={key}>
                {label}
                <input
                  required
                  type={type}
                  maxLength={key === "district" ? 80 : 150}
                  value={form[key]}
                  onChange={(e) => field(key, e.target.value)}
                />
              </label>
            ))}
            {[
              ["level", "Trình độ", LEVELS],
              ["format", "Thể thức", { 5: "Sân 5", 7: "Sân 7", 11: "Sân 11" }],
              ["finance", "Chi phí", FINANCE],
            ].map(([key, label, values]) => (
              <label className="form-field" key={key}>
                {label}
                <select
                  value={form[key]}
                  onChange={(e) => field(key, e.target.value)}
                >
                  {Object.entries(values).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="field-hint">
              Tên/logo đội, khu vực, sân, giờ và điều kiện kèo sẽ hiển thị trên
              bảng tin cho các đội khác. Không chia sẻ thông tin liên hệ cá
              nhân.
            </p>
            <Pressable className="primary-button" disabled={busy}>
              Đăng kèo
            </Pressable>
          </form>
        )}
        {(modal === "challenge" || modal === "accept") && (
          <div className="security-form">
            <p>
              {modal === "accept"
                ? "Khi nhận, hệ thống tạo một trận duy nhất trong lịch của cả hai đội."
                : "Gửi lời mời giao hữu cho"}{" "}
              <strong>{form.opponent}</strong>.
            </p>
            <Pressable
              className="pro-challenge"
              disabled={busy}
              onClick={() =>
                run(modal === "accept" ? "accept" : "challenge", form)
              }
            >
              {busy
                ? "Đang xử lý…"
                : modal === "accept"
                  ? "Đồng ý & tạo lịch hai đội"
                  : "Gửi lời thách đấu"}
            </Pressable>
          </div>
        )}
        {modal === "bill" && (
          <form
            className="security-form"
            onSubmit={(e) => {
              e.preventDefault();
              run("third-bill", { ...form, total: Number(form.total) });
            }}
          >
            <label className="form-field">
              Nội dung
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
              />
            </label>
            <label className="form-field">
              Tổng bill (đ)
              <input
                required
                inputMode="numeric"
                type="number"
                min="1"
                max="1000000000"
                step="1"
                value={form.total}
                onChange={(e) => field("total", e.target.value)}
              />
            </label>
            <fieldset>
              <legend>
                Người tham gia · {(form.participants || []).length}
              </legend>
              {members.map((m) => (
                <label className="pro-toggle" key={m.id}>
                  <span>{m.name}</span>
                  <input
                    type="checkbox"
                    checked={(form.participants || []).includes(m.id)}
                    onChange={(e) =>
                      field(
                        "participants",
                        e.target.checked
                          ? [...form.participants, m.id]
                          : form.participants.filter((id) => id !== m.id),
                      )
                    }
                  />
                </label>
              ))}
            </fieldset>
            {billShares.length > 0 && (
              <p className="field-hint">
                {formatCurrency(billShares.at(-1).amount)}–
                {formatCurrency(billShares[0].amount)}/người. Phần dư được chia
                từng đồng; tổng luôn bằng bill.
              </p>
            )}
            <Pressable
              className="primary-button"
              disabled={busy || !billShares.length}
            >
              Chốt chia bill & thông báo
            </Pressable>
          </form>
        )}
        {modal === "charge" && (
          <form
            className="security-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(form.action, {
                chargeId: form.chargeId,
                reason: form.reason,
              });
            }}
          >
            <p>
              Chỉ xác nhận đã thu khi tiền thực sự đã nhận. Phạt Quỹ đội được
              thanh toán qua luồng đối soát hiện có.
            </p>
            {form.kind === "third" && (
              <select
                aria-label="Thao tác đối soát"
                value={form.action}
                onChange={(e) => field("action", e.target.value)}
              >
                <option value="charge-paid">Đã nhận tiền</option>
                <option value="charge-void">Miễn khoản này</option>
              </select>
            )}
            <label className="form-field">
              Ghi chú / lý do
              <input
                required
                minLength={3}
                maxLength={200}
                value={form.reason}
                onChange={(e) => field("reason", e.target.value)}
              />
            </label>
            <Pressable className="primary-button" disabled={busy}>
              Xác nhận
            </Pressable>
          </form>
        )}
        {modal === "vote" && (
          <div className="pro-vote-grid">
            {members
              .filter((m) =>
                state.participation.some(
                  (p) => p.match_id === form.matchId && p.subject === m.id,
                ),
              )
              .map((m) => (
                <Pressable
                  key={m.id}
                  disabled={busy}
                  aria-pressed={state.votes.some(
                    (v) =>
                      v.own &&
                      v.match_id === form.matchId &&
                      v.candidate === m.id,
                  )}
                  onClick={() =>
                    run("vote", { matchId: form.matchId, candidate: m.id })
                  }
                >
                  <Avatar src={m.avatar} name={m.name} />
                  <strong>{m.name}</strong>
                </Pressable>
              ))}
          </div>
        )}
        {modal === "media" && (
          <form
            className="security-form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                run("media-add", {
                  matchId: form.matchId,
                  caption: form.caption,
                  ...mediaLink(form.url),
                });
              } catch (err) {
                setFailure(err.message);
              }
            }}
          >
            <label className="form-field">
              Link YouTube / TikTok / ảnh
              <input
                type="url"
                required
                value={form.url}
                onChange={(e) => field("url", e.target.value)}
              />
            </label>
            <label className="form-field">
              Chú thích
              <input
                maxLength={200}
                value={form.caption}
                onChange={(e) => field("caption", e.target.value)}
              />
            </label>
            <p className="field-hint">
              Nhúng video có thể gửi thông tin truy cập đến nền tảng nguồn. Chỉ
              đăng nội dung đội có quyền chia sẻ.
            </p>
            <Pressable className="primary-button" disabled={busy}>
              Thêm khoảnh khắc
            </Pressable>
          </form>
        )}
        {modal === "hide" && (
          <div className="security-form">
            <p>Ẩn khỏi thư viện của đội, giữ bản ghi kiểm toán.</p>
            <Pressable
              className="choice-button"
              disabled={busy}
              onClick={() => run("media-hide", { mediaId: form.mediaId })}
            >
              Ẩn khoảnh khắc
            </Pressable>
          </div>
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
