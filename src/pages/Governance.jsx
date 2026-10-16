import {Lightbulb,Zap} from '../components/icons';
import {useLayerBack} from '../hooks/useLayerBack';
import Pressable from '../components/Pressable';
import { matchTimeLabel } from '../lib/matchTime';
import React, { useId, useRef, useState } from "react";
import { ArrowLeft, BookOpen, X, ShieldCheck, Plus, Edit2 } from "../components/icons";
import {
  adjustedViolation,
  effectiveRules,
  violationCount,
} from "../lib/governance";

const STANDARD_FOOTBALL_RULES_TEMPLATE = `NỘI QUY & QUY CHẾ ĐỘI BÓNG

I. THỜI GIAN & ĐIỂM DANH
1. Điểm danh tham gia trận đấu trước giờ bóng lăn ít nhất 12 tiếng trên ứng dụng.
2. Có mặt tại sân trước giờ thi đấu ít nhất 15 phút để khởi động và chuẩn bị trang phục.

II. MỨC PHẠT VI PHẠM KỶ LUẬT
1. Đi muộn dưới 15 phút: Phạt 20.000 đ vào quỹ đội.
2. Đi muộn trên 15 phút: Phạt 50.000 đ vào quỹ đội.
3. Vắng mặt không báo trước / báo sát giờ: Phạt 100.000 đ vào quỹ đội.
4. Quên mang áo thi đấu của đội: Phạt 30.000 đ vào quỹ đội.
5. Tự ý bỏ về giữa trận không lý do: Phạt 50.000 đ vào quỹ đội.

III. TINH THẦN & VĂN HÓA SÂN CỎ
1. Tôn trọng trọng tài, đối thủ và đồng đội. Tuyệt đối không có hành vi phi thể thao hoặc bạo lực.
2. Thẻ vàng do lỗi phi thể thao tự đóng tiền phạt (50.000 đ), thẻ đỏ tự đóng tiền phạt (100.000 đ).
3. Đóng quỹ đội đầy đủ và đúng hạn theo thông báo của thủ quỹ.`;

export default function Governance({ governance, onBack }) {
  const snapshot = governance.snapshot;
  const [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useLayerBack(!!form,()=>setForm(null));
  const retry = useRef(null),
    prefix = useId();
  const leader =
    snapshot?.me.status === "active" &&
    ["owner", "admin"].includes(snapshot.me.role);
  const rules = effectiveRules(snapshot?.rules || []);
  const date = (value) =>
    matchTimeLabel(value, snapshot?.team.timezone || 'Asia/Ho_Chi_Minh');
  const name = (id) =>
    snapshot?.members.find((m) => m.user_id === id)?.name || "Thành viên";
  const open = (action, payload, title) => {
    setError("");
    setForm({ action, payload, title });
    retry.current = null;
  };
  const update = (key, value) =>
    setForm((prev) => ({
      ...prev,
      payload: { ...prev.payload, [key]: value },
    }));
  const run = async (action, payload) => {
    setBusy(true);
    setError("");
    const signature = JSON.stringify([action, payload]);
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    try {
      await governance.mutate(action, payload, retry.current.key);
      setForm(null);
      retry.current = null;
    } catch (err) {
      setError("Server từ chối: " + err.message);
    } finally {
      setBusy(false);
    }
  };
  const field = (key, label, type = "text", required = true) => (
    <div className="form-field">
      <label htmlFor={prefix + "-" + key}>{label}</label>
      {type === "textarea" ? (
        <textarea
          id={prefix + "-" + key}
          required={required}
          maxLength={20000}
          value={form.payload[key] || ""}
          onChange={(e) => update(key, e.target.value)}
        />
      ) : (
        <input
          id={prefix + "-" + key}
          type={type}
          required={required}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? 1 : undefined}
          value={form.payload[key] ?? ""}
          onInput={(e) => update(key, e.currentTarget.value)}
          onChange={(e) => update(key, e.target.value)}
        />
      )}
    </div>
  );
  const select = (key, label, choices) => (
    <div className="form-field">
      <label htmlFor={prefix + "-" + key}>{label}</label>
      <select
        id={prefix + "-" + key}
        value={form.payload[key]}
        onChange={(e) => update(key, e.target.value)}
      >
        {choices.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
  const submit = (e) => {
    e.preventDefault();
    const payload = { ...form.payload };
    for (const key of [
      "eta",
      "arrivedAt",
      "occurredAt",
      "effectiveAt",
      "until",
    ]) {
      if (payload[key]) {
        payload[key] = new Date(payload[key]).toISOString();
      } else {
        delete payload[key];
      }
    }
    for (const key of ["threshold", "fine"])
      if (payload[key] !== undefined) payload[key] = Number(payload[key]);
    run(form.action, payload);
  };
  return (
    <div className="pb-8">
      <header className="dashboard-header">
        <Pressable aria-label="Quay lại" onClick={onBack}>
          <ArrowLeft size={22} />
        </Pressable>
        <h1 className="text-xl font-semibold">Nội quy & vi phạm</h1>
      </header>
      <div className="p-4 space-y-4">
        {snapshot && (
          <Pressable
            className="choice-button text-sm"
            onClick={governance.refresh}
          >
            Lấy dữ liệu mới
          </Pressable>
        )}
        {governance.loading ? (
          <p role="status">Đang tải dữ liệu server…</p>
        ) : !snapshot ? (
          <section className="settings-card">
            <BookOpen size={24} />
            <h2 className="mt-3">Chưa kết nối nghiệp vụ</h2>
            <p className="text-sm text-slate-600 mt-3">{governance.error}</p>
            <p className="text-sm text-slate-600 mt-3">
              Nội quy, xin muộn, ghi nhận giờ đến và xử lý vi phạm cần migration
              cùng tư cách thành viên đã được xác thực trên server.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Pressable className="choice-button" onClick={governance.refresh}>
                Kiểm tra lại kết nối
              </Pressable>
              {governance.enableLocalMode && (
                <Pressable
                  className="primary-button"
                  onClick={governance.enableLocalMode}
                >
                  Tạo &amp; Quản lý nội quy trên thiết bị
                </Pressable>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="settings-card">
              <div className="flex gap-3 items-center justify-between flex-wrap">
                <div>
                  <h2>Nội quy đội</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Quy định giờ giấc, tác phong thi đấu, mức phạt vi phạm và cam kết
                  </p>
                </div>
                {leader && (
                  <div className="flex gap-2">
                    <Pressable
                      className="choice-button text-sm flex items-center gap-1.5"
                      onClick={() =>
                        open(
                          "rules",
                          {
                            content: STANDARD_FOOTBALL_RULES_TEMPLATE,
                            effectiveAt: "",
                            requireAck: true,
                          },
                          "Tạo mới nội quy",
                        )
                      }
                    >
                      <Plus size={16} />
                      Tạo mới
                    </Pressable>
                    {rules && (
                      <Pressable
                        className="choice-button text-sm flex items-center gap-1.5"
                        onClick={() =>
                          open(
                            "rules",
                            {
                              content: rules?.content || "",
                              effectiveAt: "",
                              requireAck: false,
                            },
                            "Sửa nội quy",
                          )
                        }
                      >
                        <Edit2 size={16} />
                        Sửa nội quy
                      </Pressable>
                    )}
                  </div>
                )}
              </div>
              {rules ? (
                <>
                  <p className="text-xs text-slate-500 mt-3">
                    Phiên bản {rules.version} · Hiệu lực{" "}
                    {date(rules.effective_at)} · {name(rules.actor)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap mt-4 break-words">
                    {rules.content}
                  </p>
                  {rules.require_ack &&
                    !snapshot.events.some(
                      (e) =>
                        e.action === "ack_rules" &&
                        e.subject === snapshot.me.user_id &&
                        e.data.ruleId === rules.id,
                    ) && (
                      <Pressable
                        className="primary-button w-full mt-4"
                        disabled={busy}
                        onClick={() => run("ack_rules", { ruleId: rules.id })}
                      >
                        Xác nhận đã đọc phiên bản {rules.version}
                      </Pressable>
                    )}
                </>
              ) : (
                <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-700 text-center">
                  <p className="text-sm text-slate-400">
                    Đội bóng chưa có bản nội quy chính thức.
                  </p>
                  {leader && (
                    <Pressable
                      className="primary-button mt-3 inline-flex items-center gap-2"
                      onClick={() =>
                        open(
                          "rules",
                          {
                            content: STANDARD_FOOTBALL_RULES_TEMPLATE,
                            effectiveAt: "",
                            requireAck: true,
                          },
                          "Tạo mới nội quy",
                        )
                      }
                    >
                      <Plus size={16} />
                      Tạo nội quy ngay
                    </Pressable>
                  )}
                </div>
              )}
              {snapshot.rules.length > 1 && (
                <details className="mt-4 text-sm">
                  <summary>Lịch sử phiên bản ({snapshot.rules.length})</summary>
                  {snapshot.rules.map((r) => (
                    <article key={r.id} className="py-3 border-t mt-2">
                      <strong>
                        Bản {r.version} · {date(r.effective_at)}
                      </strong>
                      <p className="whitespace-pre-wrap mt-2">{r.content}</p>
                    </article>
                  ))}
                </details>
              )}
            </section>
            <section className="settings-card">
              <div className="flex items-center justify-between gap-3">
                <h2>Giới hạn vi phạm</h2>
                {leader && (
                  <Pressable
                    className="choice-button text-sm"
                    onClick={() =>
                      open("policy", snapshot.team.policy, "Cấu hình xử lý")
                    }
                  >
                    Cấu hình
                  </Pressable>
                )}
              </div>
              <p className="text-sm mt-3">
                Kỳ {snapshot.team.policy.period === "quarter" ? "quý" : "tháng"}{" "}
                · {date(snapshot.periodStart)} đến trước{" "}
                {date(snapshot.periodEnd)}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Đạt {snapshot.team.policy.threshold}{" "}
                lần sẽ tạo việc cần duyệt. Quản trị viên duyệt xử lý; tự động
                chưa được bật.
              </p>
              <p className="text-sm mt-3">
                Vi phạm của bạn:{" "}
                <strong>
                  {violationCount(
                    snapshot.events,
                    snapshot.me.user_id,
                    snapshot.team.policy,
                    { start: snapshot.periodStart, end: snapshot.periodEnd },
                  )}
                  /{snapshot.team.policy.threshold}
                </strong>
              </p>
              {violationCount(
                snapshot.events,
                snapshot.me.user_id,
                snapshot.team.policy,
                { start: snapshot.periodStart, end: snapshot.periodEnd },
              ) >=
                snapshot.team.policy.threshold - 1 && (
                <p className="text-amber-700 text-sm mt-2">
                  Bạn đang gần hoặc đã đạt giới hạn kỳ này.
                </p>
              )}
            </section>
            {leader && (
              <section className="settings-card">
                <h2>Yêu cầu đến muộn</h2>
                {snapshot.events
                  .filter((e) => e.action === "late_request")
                  .map((e) => {
                    const decision = [...snapshot.events]
                      .reverse()
                      .find(
                        (d) =>
                          d.action === "review_late" &&
                          d.data.requestId === e.id,
                      );
                    return (
                      <article key={e.id} className="border-t py-3 mt-3">
                        <p className="font-medium text-sm">
                          {name(e.subject)} · {date(e.data.eta)}
                        </p>
                        <p className="text-sm mt-1">{e.data.reason}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {
                            {
                              pending: "Chờ duyệt",
                              approved: "Được duyệt",
                              rejected: "Từ chối",
                            }[decision?.data.status || e.data.status]
                          }
                          {decision?.data?.self_approved && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              (Chủ FC tự duyệt)
                            </span>
                          )}
                        </p>
                        {(e.subject !== snapshot.me.user_id ||
                          snapshot.me.role === "owner") &&
                          !decision &&
                          e.data.status === "pending" && (
                            <Pressable
                              className="choice-button mt-2"
                              onClick={() =>
                                open(
                                  "review_late",
                                  {
                                    requestId: e.id,
                                    status: "approved",
                                    reason:
                                      e.subject === snapshot.me.user_id
                                        ? "Chủ FC tự duyệt"
                                        : "",
                                  },
                                  e.subject === snapshot.me.user_id
                                    ? "Tự duyệt xin muộn"
                                    : "Duyệt xin muộn",
                                )
                              }
                            >
                              {e.subject === snapshot.me.user_id
                                ? "Tự duyệt yêu cầu"
                                : "Duyệt yêu cầu"}
                            </Pressable>
                          )}
                      </article>
                    );
                  })}
                {!snapshot.events.some((e) => e.action === "late_request") && (
                  <p className="text-sm text-slate-500 mt-3">
                    Chưa có yêu cầu.
                  </p>
                )}
              </section>
            )}
            {leader && (
              <section className="settings-card">
                <h2>Ghi nhận tại sân</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Pressable
                    className="choice-button"
                    onClick={() =>
                      open(
                        "arrival",
                        { subject: "", matchId: "", arrivedAt: "", reason: "" },
                        "Xác nhận giờ đến",
                      )
                    }
                  >
                    Xác nhận giờ đến
                  </Pressable>
                  <Pressable
                    className="choice-button"
                    onClick={() =>
                      open(
                        "finalize",
                        { subject: "", matchId: "" },
                        "Chốt đi muộn",
                      )
                    }
                  >
                    Chốt đi muộn
                  </Pressable>
                  <Pressable
                    className="choice-button"
                    onClick={() =>
                      open(
                        "violation",
                        {
                          subject: "",
                          matchId: "",
                          type: "other",
                          description: "",
                          occurredAt: "",
                          fine: 0,
                        },
                        "Ghi nhận vi phạm",
                      )
                    }
                  >
                    Vi phạm khác
                  </Pressable>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Giờ đến phải do người có quyền xác nhận. Chốt sẽ áp dụng nội
                  quy, dung sai và mức phạt của trận; gửi lại không tạo phạt
                  trùng.
                </p>
              </section>
            )}
            <section className="settings-card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2>Lịch sử vi phạm {leader ? "theo quyền" : "của bạn"}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Ghi nhận đi muộn, chưa điểm danh hoặc vi phạm nội quy khác
                  </p>
                </div>
                {leader && (
                  <Pressable
                    className="choice-button text-sm flex items-center gap-1.5"
                    onClick={() =>
                      open(
                        "violation",
                        {
                          subject: "",
                          matchId: "",
                          type: "late",
                          description: "",
                          occurredAt: new Date().toISOString().slice(0, 16),
                          fine: 50000,
                        },
                        "Ghi nhận vi phạm mới",
                      )
                    }
                  >
                    <Plus size={16} />
                    Ghi vi phạm
                  </Pressable>
                )}
              </div>
              {snapshot.events
                .filter((e) => e.action === "violation")
                .map((e) => {
                  const value = adjustedViolation(e, snapshot.events),
                    changes = snapshot.events.filter(
                      (a) => a.action === "adjust" && a.data.eventId === e.id,
                    );
                  return (
                    <article key={e.id} className="border-t mt-3 py-3">
                      <p className="font-medium text-sm">
                        {name(e.subject)} ·{" "}
                        {
                          {
                            late: "Đi muộn",
                            unvoted: "Chưa điểm danh",
                            other: "Khác",
                          }[e.data.type]
                        }
                      </p>
                      <p className="text-sm mt-1">{e.data.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {date(e.data.occurredAt)} · Nội quy {e.data.ruleVersion}{" "}
                        · Người ghi {name(e.actor)}
                      </p>
                      <p className="text-sm mt-2">
                        {value.status === "void"
                          ? "Đã hủy bằng điều chỉnh"
                          : "Đã chốt"}{" "}
                        · Phạt{" "}
                        {Number(
                          value.status === "void" ? 0 : value.fine || 0,
                        ).toLocaleString("vi-VN")}{" "}
                        đ
                      </p>
                      {changes.map((a) => (
                        <p className="text-xs mt-2" key={a.id}>
                          Điều chỉnh {date(a.created_at)} · {name(a.actor)}:{" "}
                          {a.data.reason}
                        </p>
                      ))}
                      {leader && e.subject !== snapshot.me.user_id && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Pressable
                            className="choice-button text-xs flex items-center gap-1"
                            onClick={() =>
                              open(
                                "adjust",
                                {
                                  eventId: e.id,
                                  status: "upheld",
                                  fine: value.fine || 0,
                                  reason: "",
                                },
                                "Sửa mức phạt vi phạm",
                              )
                            }
                          >
                            <Edit2 size={13} />
                            Sửa mức phạt
                          </Pressable>
                          <Pressable
                            className="choice-button text-xs"
                            onClick={() =>
                              open(
                                "adjust",
                                {
                                  eventId: e.id,
                                  status: "void",
                                  fine: 0,
                                  reason: "",
                                },
                                "Hủy vi phạm",
                              )
                            }
                          >
                            Hủy vi phạm
                          </Pressable>
                        </div>
                      )}
                    </article>
                  );
                })}
              {!snapshot.events.some((e) => e.action === "violation") && (
                <p className="text-sm text-slate-500 mt-3">
                  Chưa có vi phạm được ghi nhận.
                </p>
              )}
            </section>
            {leader && (
              <section className="settings-card">
                <h2>Giờ đến đã xác nhận</h2>
                {snapshot.events
                  .filter((e) => e.action === "arrival")
                  .map((e) => (
                    <article key={e.id} className="border-t py-3 mt-3 text-sm">
                      <p>
                        {name(e.subject)} · {date(e.data.arrivedAt)} ·{" "}
                        {name(e.actor)}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {e.data.reason}
                      </p>
                      {snapshot.events
                        .filter(
                          (a) =>
                            a.action === "adjust" && a.data.eventId === e.id,
                        )
                        .map((a) => (
                          <p className="text-xs mt-2" key={a.id}>
                            Điều chỉnh: {date(a.data.arrivedAt)} ·{" "}
                            {a.data.reason} · {name(a.actor)}
                          </p>
                        ))}
                      {e.subject !== snapshot.me.user_id && (
                        <Pressable
                          className="choice-button mt-2"
                          onClick={() =>
                            open(
                              "adjust",
                              { eventId: e.id, arrivedAt: "", reason: "" },
                              "Điều chỉnh giờ đến",
                            )
                          }
                        >
                          Tạo điều chỉnh
                        </Pressable>
                      )}
                    </article>
                  ))}
              </section>
            )}
            <section className="settings-card">
              <h2>Xử lý trong đội</h2>
              <p className="text-xs text-slate-500 mt-2">
                Khóa chỉ hạn chế tại đội này; loại khỏi đội vẫn giữ lịch sử.
                Quản trị viên đội không có quyền khóa tài khoản toàn hệ thống.
              </p>
              {snapshot.events
                .filter(
                  (e) =>
                    e.action === "threshold" &&
                    !snapshot.events.some(
                      (a) =>
                        a.action === "sanction" && a.data.thresholdId === e.id,
                    ),
                )
                .map((e) => (
                  <article key={e.id} className="border-t py-3 mt-3">
                    <p className="text-sm font-medium">
                      {name(e.subject)} đã đạt {e.data.count}/{e.data.threshold}{" "}
                      lần
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Kỳ {date(e.data.periodStart)} · Chờ duyệt
                    </p>
                    {leader && e.subject !== snapshot.me.user_id && (
                      <Pressable
                        className="choice-button mt-2"
                        onClick={() =>
                          open(
                            "sanction",
                            {
                              subject: e.subject,
                              thresholdId: e.id,
                              kind: "warning",
                              reason: "",
                              until: "",
                            },
                            "Xác nhận xử lý trong đội",
                          )
                        }
                      >
                        Duyệt xử lý
                      </Pressable>
                    )}
                  </article>
                ))}
              {leader && (
                <Pressable
                  className="choice-button mt-3"
                  onClick={() =>
                    open(
                      "sanction",
                      { subject: "", kind: "warning", reason: "", until: "" },
                      "Xác nhận xử lý trong đội",
                    )
                  }
                >
                  <ShieldCheck size={18} />
                  Xử lý thành viên
                </Pressable>
              )}
              {snapshot.events
                .filter((e) => e.action === "sanction")
                .map((e) => (
                  <p key={e.id} className="text-sm border-t pt-3 mt-3">
                    {name(e.subject)} ·{" "}
                    {
                      {
                        warning: "Cảnh cáo",
                        lock: "Khóa trong đội",
                        remove: "Loại khỏi đội",
                        unlock: "Gỡ khóa",
                      }[e.data.kind]
                    }{" "}
                    · {e.data.reason}
                    {e.data.until && " · đến " + date(e.data.until)} ·{" "}
                    {name(e.actor)} · {date(e.created_at)}
                  </p>
                ))}
            </section>
          </>
        )}
        {error && !form && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
      {form && (
        <div
          className="simple-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gov-form-title"
        >
          <section className="simple-sheet">
            <Pressable
              className="sheet-close"
              aria-label="Đóng"
              onClick={() => setForm(null)}
            >
              <X size={20} />
            </Pressable>
            <h2 id="gov-form-title" className="text-xl font-semibold">
              {form.title}
            </h2>
            <form onSubmit={submit} className="space-y-4 mt-4">
              {"subject" in form.payload &&
                select("subject", "Thành viên", [
                  ["", "Chọn thành viên"],
                  ...snapshot.members
                    .filter((m) => m.user_id !== snapshot.me.user_id)
                    .map((m) => [m.user_id, m.name]),
                ])}
              {"matchId" in form.payload &&
                select("matchId", "Trận đấu", [
                  [
                    "",
                    form.action === "violation"
                      ? "Không gắn trận"
                      : "Chọn trận",
                  ],
                  ...snapshot.matches
                    .filter((m) => !m.archived_at)
                    .map((m) => [m.id, m.title]),
                ])}
              {form.action === "rules" && (
                <>
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-xs space-y-2">
                    <p className="text-emerald-300 font-medium">
                      <Lightbulb size={20} /> Mẹo: Bạn có thể tự soạn nội quy hoặc bấm nút bên dưới để chèn mẫu nội quy bóng đá phong trào.
                    </p>
                    <Pressable
                      type="button"
                      className="choice-button text-xs py-1.5 px-3 w-full sm:w-auto"
                      onClick={() =>
                        update("content", STANDARD_FOOTBALL_RULES_TEMPLATE)
                      }
                    >
                      <Zap size={20} /> Chèn mẫu nội quy chuẩn bóng đá
                    </Pressable>
                  </div>
                  {field("content", "Nội dung nội quy & mức phạt", "textarea")}
                  {field(
                    "effectiveAt",
                    "Thời điểm hiệu lực (để trống: áp dụng ngay)",
                    "datetime-local",
                    false,
                  )}
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={form.payload.requireAck}
                      onChange={(e) => update("requireAck", e.target.checked)}
                    />
                    Yêu cầu tất cả thành viên xác nhận đã đọc
                  </label>
                </>
              )}
              {form.action === "policy" && (
                <>
                  {select("period", "Kỳ áp dụng", [
                    ["month", "Tháng"],
                    ["quarter", "Quý"],
                  ])}
                  {field("threshold", "Đạt bao nhiêu lần thì xử lý", "number")}
                  {select("action", "Đề xuất xử lý", [
                    ["warning", "Cảnh cáo"],
                    ["lock", "Khóa trong đội"],
                    ["remove", "Loại khỏi đội"],
                  ])}
                  <fieldset>
                    <legend>Loại vi phạm được tính</legend>
                    {[
                      ["late", "Đi muộn"],
                      ["unvoted", "Chưa điểm danh"],
                      ["other", "Khác"],
                    ].map(([key, label]) => (
                      <label key={key} className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={form.payload.types.includes(key)}
                          onChange={(e) =>
                            update(
                              "types",
                              e.target.checked
                                ? [...form.payload.types, key]
                                : form.payload.types.filter((t) => t !== key),
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <p className="text-xs text-slate-500">
                    Mặc định quản trị viên duyệt. Tự động chưa được hỗ trợ.
                  </p>
                </>
              )}
              {"arrivedAt" in form.payload &&
                field("arrivedAt", "Giờ đến thực tế", "datetime-local")}
              {"occurredAt" in form.payload &&
                field("occurredAt", "Thời điểm vi phạm", "datetime-local")}
              {"type" in form.payload &&
                select("type", "Loại vi phạm", [
                  ["other", "Khác"],
                  ["unvoted", "Chưa điểm danh"],
                  ["late", "Đi muộn"],
                ])}
              {"description" in form.payload &&
                field("description", "Mô tả", "textarea")}
              {"fine" in form.payload &&
                field("fine", "Khoản phạt (đ)", "number")}
              {"status" in form.payload &&
                select(
                  "status",
                  "Quyết định",
                  form.action === "review_late"
                    ? [
                        ["approved", "Được duyệt"],
                        ["rejected", "Từ chối"],
                      ]
                    : [
                        ["void", "Hủy vi phạm bằng điều chỉnh"],
                        ["upheld", "Giữ vi phạm, điều chỉnh phạt"],
                      ],
                )}
              {"kind" in form.payload && (
                <>
                  {select("kind", "Hình thức xử lý", [
                    ["warning", "Cảnh cáo"],
                    ["lock", "Khóa trong đội"],
                    ["remove", "Loại khỏi đội"],
                    ["unlock", "Gỡ khóa trong đội"],
                  ])}
                  {form.payload.kind === "lock" &&
                    field("until", "Khóa đến", "datetime-local")}
                  <p className="text-xs text-slate-500">
                    Xác nhận bên dưới sẽ ghi lý do và người xử lý. Hành động
                    không tác động tài khoản ở đội khác.
                  </p>
                </>
              )}
              {"reason" in form.payload && field("reason", "Lý do", "textarea")}
              {form.action === "finalize" && (
                <p className="text-sm text-slate-600">
                  Xác nhận chốt từ giờ đến đã được người có quyền ghi nhận. Bản
                  gốc và khoản phạt sẽ được bảo toàn; sai sót cần tạo điều
                  chỉnh.
                </p>
              )}
              {error && (
                <p role="alert" className="text-rose-700 text-sm">
                  {error}
                </p>
              )}
              <Pressable
                className="primary-button w-full"
                type="submit"
                disabled={busy}
              >
                {busy ? "Đang xử lý…" : "Xác nhận"}
              </Pressable>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
