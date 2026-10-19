import React, { useEffect, useState } from "react";
import Pressable from "./Pressable";
import ProModal from "./pro/ProModal";
import QrPreview from "./QrPreview";
import { Bell, Calendar, Wallet, Beer, Users2, Shield, Plus } from "./icons";
import { formatCurrency } from "../lib/formatCurrency";
import {
  remainingCharge,
  collectionSummary,
  allocateBill,
  vndInput,
  scheduleDueDate,
  nextMonthlyStart,
} from "../lib/fundCollections";
import {
  localTransactionTime,
  transactionInstant,
} from "../lib/transactionTime";
import { qrUrl } from "../lib/teamModel";
import { notify } from "../lib/feedback";

const zone = "Asia/Ho_Chi_Minh";
const nowInput = () => localTransactionTime(Date.now(), zone);
function Money({ label, value, onChange, ...props }) {
  return (
    <label className="form-field">
      {label}
      <input
        {...props}
        inputMode="numeric"
        value={value ? Number(value).toLocaleString("vi-VN") : ""}
        onChange={(e) => onChange(vndInput(e.target.value))}
      />
    </label>
  );
}
export default function FundOperations({
  fund,
  mode = "collections",
  intent,
  onIntentUsed,
  qr = {},
  accountId,
  permissions = [],
  matchId,
}) {
  const { data, busy, error, loading, mutate } = fund;
  const [modal, setModal] = useState(null),
    [draft, setDraft] = useState({}),
    [failure, setFailure] = useState(""),
    [detail, setDetail] = useState(null),
    [filter, setFilter] = useState("all");
  const members = data.members || [],
    name = (id) =>
      members.find((m) => m.id === id)?.name ||
      permissions.find((m) => m.id === id)?.name ||
      data.collections.flatMap((c) => c.roster).find((m) => m.id === id)
        ?.name ||
      "Thành viên";
  const open = (kind, value = {}) => {
    setFailure("");
    setDraft(value);
    setModal(kind);
  };
  const openSchedule = (immediate = false, s, defaultTitle = "", defaultDueDate = "") =>
    open(
      "schedule",
      s
        ? {
            id: s.id,
            title: s.title,
            amount: Number(s.amount),
            recipients: s.recipients,
            repeat: s.repeat,
            day: s.send_day,
            sendAt: localTransactionTime(s.next_run, zone),
            dueDate: scheduleDueDate(s),
            note: s.note,
          }
        : {
            title: defaultTitle || (immediate ? `Quỹ tháng ${Number(nowInput().slice(5, 7))}/${nowInput().slice(0, 4)}` : "Quỹ định kỳ hằng tháng"),
            amount: 100000,
            recipients: "all",
            repeat: immediate ? "once" : "monthly",
            day: Number(nowInput().slice(8, 10)),
            sendAt: localTransactionTime(Date.now() + 60000, zone),
            dueDate: defaultDueDate || nowInput().slice(0, 10),
            note: "",
            immediate,
          },
    );
  const openBill = () =>
    open("bill", {
      title: "Sinh tố lúa mạch",
      occurredAt: nowInput(),
      total: 0,
      support: 0,
      participants: [],
      payerKind: "member",
      payerId: accountId,
      allocations: [],
      custom: false,
      confirmed: false,
      matchId,
    });
  useEffect(() => {
    if (!intent) return;
    if (intent.action === "reminder") openSchedule(false, null, intent.title, intent.dueDate);
    if (intent.action === "collection") openSchedule(true, null, intent.title, intent.dueDate);
    if (intent.action === "bill") openBill();
    onIntentUsed?.();
  }, [intent?.id]);
  const field = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const run = async (action, payload, close = true) => {
    setFailure("");
    try {
      await mutate(action, payload);
      notify(
        action === "payment_request"
          ? "Đã gửi yêu cầu · Chờ Thủ quỹ duyệt."
          : "Đã lưu thay đổi quỹ.",
      );
      if (close) setModal(null);
      return true;
    } catch (e) {
      setFailure(e.message);
      notify(e.message, "error");
      return false;
    }
  };
  const toggle = (id) => {
    const ids = draft.participants.includes(id)
      ? draft.participants.filter((x) => x !== id)
      : [...draft.participants, id];
    setDraft((d) => ({
      ...d,
      participants: ids,
      allocations: ids.map(
        (id) => d.allocations.find((x) => x.id === id) || { id, amount: 0 },
      ),
    }));
  };
  let shares = [];
  try {
    shares = draft.custom
      ? draft.allocations
      : allocateBill(
          draft.total || 0,
          draft.support || 0,
          draft.participants || [],
        );
  } catch {}
  const collection = data.collections.find((c) => c.id === detail);
  const charges = detail
    ? data.charges.filter((c) => c.collection_id === detail)
    : mode === "bills"
      ? data.charges.filter((c) => c.kind === "third" && (!matchId || data.bills.some(b=>b.id===c.bill_id && b.details?.matchId===matchId && b.details?.purpose!=="match")))
      : data.charges;
  const pendingFor = (id) =>
    (data.pendingRequests || []).find((p) => p.chargeId === id);
  const rejectedFor = (id) =>
    (data.rejectedRequests || [])
      .filter(
        (p) =>
          p.chargeId === id &&
          Date.parse(p.reviewedAt || p.createdAt) >
            Date.parse(
              data.charges.find((c) => c.id === id)?.resolved_at ||
                "1970-01-01",
            ),
      )
      .sort(
        (a, b) =>
          Date.parse(b.reviewedAt || b.createdAt) -
          Date.parse(a.reviewedAt || a.createdAt),
      )[0];
  const shown = charges.filter(
    (c) =>
      filter === "all" ||
      (filter === "paid" && c.status !== "void" && remainingCharge(c) === 0) ||
      (filter === "partial" &&
        Number(c.paid_amount) > 0 &&
        remainingCharge(c) > 0) ||
      (filter === "pending" && !!pendingFor(c.id)) ||
      (filter === "unpaid" && remainingCharge(c) > 0 && !Number(c.paid_amount)),
  );
  const paymentCharge = data.charges.find((c) => c.id === draft.chargeId),
    paymentBill = data.bills.find((b) => b.id === paymentCharge?.bill_id),
    personalPayment = paymentBill?.details.payerKind === "member";
  const payment = (charge) =>
    open("payment", { chargeId: charge.id, amount: remainingCharge(charge) });
  const chargeRows = (
    <>
      <div className="fund-status-filters">
        {[
          ["all", "Tất cả"],
          ["paid", "Đã đủ"],
          ["partial", "Một phần"],
          ["unpaid", "Chưa đóng"],
          ["pending", "Chờ duyệt"],
        ].map(([id, label]) => (
          <Pressable
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </Pressable>
        ))}
      </div>
      {shown.length ? (
        shown.map((c) => (
          <article className="fund-charge-row" key={c.id}>
            <div>
              <strong>{name(c.subject)}</strong>
              <p>{c.label}</p>
              {pendingFor(c.id) && (
                <p role="status">
                  Chờ Thủ quỹ duyệt ·{" "}
                  {formatCurrency(Number(pendingFor(c.id).amount))}
                </p>
              )}
              {!pendingFor(c.id) &&
                rejectedFor(c.id) &&
                remainingCharge(c) > 0 && (
                  <p className="form-error">
                    Bị từ chối: {rejectedFor(c.id).reason}. Bạn có thể gửi lại.
                  </p>
                )}
              <small>
                {pendingFor(c.id)
                  ? "Chờ duyệt"
                  : c.status === "void"
                    ? "Đã hủy nghĩa vụ"
                    : remainingCharge(c) === 0
                      ? "Đã đủ"
                      : Number(c.paid_amount) > 0
                        ? "Đã đóng một phần"
                        : "Chưa đóng"}{" "}
                · Đã đóng {formatCurrency(Number(c.paid_amount))}
              </small>
            </div>
            <div>
              <strong>{formatCurrency(remainingCharge(c))}</strong>
              {remainingCharge(c) > 0 &&
                (data.canManage || c.subject === accountId) && (
                  <Pressable
                    className="choice-button"
                    disabled={busy || !!pendingFor(c.id)}
                    onClick={() => payment(c)}
                  >
                    {pendingFor(c.id)
                      ? "Chờ duyệt"
                      : data.canManage
                        ? "Ghi nhận"
                        : "Đã chuyển tiền"}
                  </Pressable>
                )}
            </div>
          </article>
        ))
      ) : (
        <p className="panel-empty">Không có khoản đóng trong nhóm này.</p>
      )}
    </>
  );
  return (
    <section className="fund-operations">
      {loading && <p role="status">Đang tải đợt thu…</p>}
      {error && (
        <div role="alert" className="form-error">
          <p>{error}</p>
          <Pressable onClick={fund.refresh}>Thử lại</Pressable>
        </div>
      )}
      {fund.demo && (
        <p className="field-hint">
          Đợt thu và lịch nhắc cần máy chủ xác nhận; không tạo dữ liệu minh họa.
        </p>
      )}
      {failure && !modal && (
        <p role="alert" className="form-error">
          {failure}
        </p>
      )}
      {mode === "collections" && (
        <>
          <div className="section-toolbar">
            <h2>Đợt thu</h2>
            {data.canManage && (
              <Pressable
                className="text-action"
                onClick={() => openSchedule(true)}
              >
                <Plus size={20} />
                Tạo đợt
              </Pressable>
            )}
          </div>
          {!data.collections.length && (
            <p className="panel-empty">Chưa có đợt thu.</p>
          )}
          {data.collections.map((c) => {
            const s = collectionSummary(c, data.charges);
            return (
              <article className="fund-collection" key={c.id}>
                <Pressable
                  className="fund-collection-open"
                  onClick={() => {
                    setDetail(c.id);
                    setFilter("all");
                    open("detail");
                  }}
                >
                  <Calendar size={22} />
                  <div>
                    <strong>
                      {c.title} · Hạn{" "}
                      {c.due_date.split("-").reverse().join("/")}
                    </strong>
                    <p>
                      Đã đủ: {s.paid}/{s.people} người · Còn thiếu:{" "}
                      {formatCurrency(s.remaining)}
                    </p>
                    {c.status === "cancelled" && (
                      <small>Đợt đã hủy · giữ nguyên giao dịch đã nhận</small>
                    )}
                  </div>
                </Pressable>
                {data.canManage && c.status === "open" && c.schedule_id && (
                  <div className="fund-inline-actions">
                    <Pressable
                      disabled={busy}
                      onClick={() =>
                        run(
                          "remind",
                          { scheduleId: c.schedule_id, collectionId: c.id },
                          false,
                        )
                      }
                    >
                      <Bell size={18} />
                      Nhắc người còn thiếu
                    </Pressable>
                    <Pressable
                      className="danger-action"
                      onClick={() =>
                        open("cancel", { id: c.id, title: c.title })
                      }
                    >
                      Hủy đợt
                    </Pressable>
                  </div>
                )}
              </article>
            );
          })}
        </>
      )}
      {mode === "charges" && chargeRows}
      {mode === "schedules" && (
        <>
          <div className="section-toolbar">
            <h2>Nhắc thu quỹ</h2>
            {data.canManage && (
              <Pressable className="text-action" onClick={() => openSchedule()}>
                <Plus size={20} />
                Tạo lịch nhắc
              </Pressable>
            )}
          </div>
          <p className="field-hint">
            Giờ Việt Nam · Ngày 29–31 không có trong tháng sẽ dùng ngày cuối
            tháng. Sửa lịch chỉ tác động kỳ tương lai.
          </p>
          {data.schedulerConfigured === false && (
            <p role="status" className="form-error">
              Lịch nhắc tự động chưa được bật. Lịch lưu được nhưng chưa thể tự
              chạy; đợt thu ngay vẫn dùng được.
            </p>
          )}
          {data.schedules.map((s) => {
            const nextRunTime = localTransactionTime(s.next_run, zone);
            const isMonthly = s.repeat === "monthly";
            const nextMonth = nextRunTime.slice(5, 7);
            const nextYear = nextRunTime.slice(0, 4);
            return (
              <article className="fund-collection" key={s.id}>
                <div className="flex justify-between items-start gap-2">
                  <strong>{s.title}</strong>
                  {isMonthly && (
                    <span className="text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded shrink-0">
                      Lặp hằng tháng
                    </span>
                  )}
                </div>
                {isMonthly && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                    Kỳ thu lần tới: Tháng {parseInt(nextMonth, 10)}/{nextYear} (Ngày {s.send_day} hằng tháng)
                  </p>
                )}
                <p>
                  {formatCurrency(Number(s.amount))}/người ·{" "}
                  {isMonthly
                    ? `Ngày ${s.send_day} hằng tháng`
                    : "Một lần"}{" "}
                  · {s.send_time.slice(0, 5)}
                </p>
                <p>
                  {s.status === "active"
                    ? "Đang hoạt động"
                    : s.status === "paused"
                      ? "Tạm dừng"
                      : s.status === "finished"
                        ? "Đã chạy"
                        : "Đã hủy"}{" "}
                  · Lần chạy tiếp: {nextRunTime.replace("T", " · ")}
                </p>
              {["active", "paused"].includes(s.status) && (
                <div className="fund-inline-actions">
                  <Pressable onClick={() => openSchedule(false, s)}>
                    Sửa lịch
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onClick={() =>
                      run(
                        "schedule_status",
                        {
                          id: s.id,
                          status: s.status === "active" ? "paused" : "active",
                        },
                        false,
                      )
                    }
                  >
                    {s.status === "active" ? "Tạm dừng" : "Tiếp tục"}
                  </Pressable>
                  <Pressable
                    className="danger-action"
                    onClick={() =>
                      open("cancelSchedule", { id: s.id, title: s.title })
                    }
                  >
                    Hủy lịch
                  </Pressable>
                </div>
              )}
            </article>
          );
        })}
        </>
      )}
      {mode === "bills" && (
        <>
          <div className="section-toolbar">
            <h2>Sinh tố lúa mạch</h2>
            {data.canManage && (
              <Pressable className="text-action" onClick={openBill}>
                <Plus size={20} />
                Thêm buổi
              </Pressable>
            )}
          </div>
          {data.bills.filter(b=>b.details?.purpose!=='match' && (!matchId || b.details?.matchId===matchId)).map((b) => (
            <article className="fund-collection" key={b.id}>
              <strong>{b.title}</strong>
              <p>
                {formatCurrency(Number(b.total))} ·{" "}
                {b.details.payerKind === "fund"
                  ? "Quỹ đội đã chi"
                  : b.details.payerKind === "member"
                    ? `${name(b.details.payerId)} ứng tiền cá nhân`
                    : "Hóa đơn cũ · chưa xác định nguồn chi"}
              </p>
              {b.details.payerKind === "member" &&
                Number(b.details.support) > 0 && (
                  <p>
                    Quỹ hỗ trợ {formatCurrency(Number(b.details.support))} ·{" "}
                    {b.details.subsidyPaid ? "Đã hoàn" : "Chưa hoàn"}
                  </p>
                )}
              {data.canManage &&
                b.details.payerKind === "member" &&
                Number(b.details.support) > 0 &&
                !b.details.subsidyPaid && (
                  <Pressable
                    className="choice-button"
                    disabled={busy}
                    onClick={() =>
                      open("support", {
                        id: b.id,
                        title: b.title,
                        amount: Number(b.details.support),
                      })
                    }
                  >
                    Xác nhận quỹ đã hoàn hỗ trợ
                  </Pressable>
                )}
            </article>
          ))}
          {chargeRows}
        </>
      )}
      {mode === "permissions" && data.owner && (
        <>
          <h2>Phân quyền quỹ và thông báo</h2>
          <p className="field-hint">
            Quyền này không cấp thêm quyền quản trị đội hoặc thành viên.
          </p>
          {members
            .filter((m) => m.registered)
            .map((m) => {
              const flags = permissions.find((p) => p.id === m.id) || {};
              return (
                <div className="fund-collection" key={m.id}>
                  <strong>{m.name}</strong>
                  <label className="notification-option">
                    <input
                      type="checkbox"
                      checked={!!flags.canManageFunds}
                      disabled={busy}
                      onChange={(e) =>
                        run(
                          "permission",
                          {
                            userId: m.id,
                            canManageFunds: e.target.checked,
                            receiveAttendance: !!flags.receiveAttendance,
                          },
                          false,
                        )
                      }
                    />
                    Thủ quỹ · quản lý quỹ
                  </label>
                  <label className="notification-option">
                    <input
                      type="checkbox"
                      checked={!!flags.receiveAttendance}
                      disabled={busy}
                      onChange={(e) =>
                        run(
                          "permission",
                          {
                            userId: m.id,
                            canManageFunds: !!flags.canManageFunds,
                            receiveAttendance: e.target.checked,
                          },
                          false,
                        )
                      }
                    />
                    Nhận thông báo điểm danh
                  </label>
                </div>
              );
            })}
        </>
      )}
      <ProModal
        busy={busy}
        open={!!modal}
        title={
          {
            schedule: draft.immediate ? "Tạo đợt thu ngay" : "Nhắc thu quỹ",
            bill: "Sinh tố lúa mạch",
            payment: data.canManage
              ? "Ghi nhận thực nhận"
              : "Báo đã chuyển khoản",
            detail: collection?.title,
            cancel: "Hủy phần chưa thu",
            cancelSchedule: "Hủy lịch nhắc",
            support: "Xác nhận quỹ thực chi",
          }[modal] || "Quỹ đội"
        }
        onClose={() => {
          if (!busy) setModal(null);
        }}
      >
        {modal === "detail" && (
          <>
            <p className="field-hint">
              Danh sách được chụp tại thời điểm tạo đợt; người gia nhập sau
              không bị truy thu.
            </p>
            {chargeRows}
          </>
        )}
        {["cancel", "cancelSchedule", "support"].includes(modal) && (
          <>
            <p>{draft.title}</p>
            <p className="field-hint">
              {modal === "support"
                ? `Chỉ xác nhận khi quỹ đã thực chuyển ${formatCurrency(draft.amount)} cho người ứng tiền.`
                : "Giữ nguyên các giao dịch và lịch sử đã phát sinh."}
            </p>
            <Pressable
              disabled={busy}
              className="primary-button"
              onClick={() =>
                run(
                  modal === "cancel"
                    ? "collection_cancel"
                    : modal === "cancelSchedule"
                      ? "schedule_status"
                      : "bill_support",
                  modal === "cancelSchedule"
                    ? { id: draft.id, status: "cancelled" }
                    : { id: draft.id },
                )
              }
            >
              Xác nhận
            </Pressable>
          </>
        )}
        {modal === "payment" && (
          <form
            className="security-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(data.canManage ? "payment" : "payment_request", {
                chargeId: draft.chargeId,
                amount: Number(draft.amount),
                note: draft.note || "",
              });
            }}
          >
            <p>
              {paymentCharge?.label} · Còn thiếu:{" "}
              {formatCurrency(remainingCharge(paymentCharge || { amount: 0 }))}
            </p>
            <Money
              label="Số tiền thực nhận / chuyển khoản (đ)"
              required
              value={draft.amount}
              onChange={(value) => field("amount", value)}
            />
            {!data.canManage && (
              <label className="form-field">
                Ghi chú (không bắt buộc)
                <textarea
                  maxLength={1000}
                  value={draft.note || ""}
                  onChange={(e) => field("note", e.target.value)}
                />
              </label>
            )}
            <p className="field-hint">
              {data.canManage
                ? "Chỉ xác nhận số tiền đã thực nhận. Khoản trả người ứng cá nhân không cộng vào số dư quỹ."
                : "Báo đã chuyển chỉ tạo yêu cầu chờ đối soát, chưa làm tăng số dư quỹ."}
            </p>
            {personalPayment && (
              <p className="field-hint">
                Hoàn trực tiếp cho{" "}
                {paymentBill.details.payerName ||
                  name(paymentBill.details.payerId)}
                . Liên hệ người ứng tiền để lấy tài khoản; không dùng QR quỹ
                đội.
              </p>
            )}
            {!personalPayment && qr.accountNumber && (
              <>
                <p>
                  {qr.bankName} · {qr.accountNumber} · {qr.accountHolder}
                </p>
                <QrPreview
                  src={
                    qr.qrMode === "uploaded"
                      ? qr.uploadedQrImage
                      : qrUrl(qr, draft.amount, "NO OFFSIDE DONG QUY")
                  }
                />
              </>
            )}
            <Pressable type="submit" className="primary-button" disabled={busy}>
              {busy
                ? "Đang lưu…"
                : data.canManage
                  ? "Xác nhận đã nhận"
                  : "Tôi đã chuyển khoản"}
            </Pressable>
          </form>
        )}
        {modal === "schedule" && (
          <form
            className="security-form"
            onSubmit={(e) => {
              e.preventDefault();
              const sendAt = draft.immediate
                ? new Date().toISOString()
                : transactionInstant(draft.sendAt, zone);
              run("schedule_save", {
                id: draft.id,
                title: draft.title,
                amount: Number(draft.amount),
                recipients: draft.recipients,
                repeat: draft.repeat,
                day: Number(draft.day),
                sendAt,
                dueDate: draft.dueDate,
                note: draft.note,
              });
            }}
          >
            <label className="form-field">
              Tiêu đề
              <input
                required
                maxLength={120}
                placeholder={draft.repeat === "monthly" ? "Ví dụ: Quỹ định kỳ hằng tháng" : "Ví dụ: Quỹ tháng 10/2026"}
                value={draft.title}
                onChange={(e) => field("title", e.target.value)}
              />
              {draft.repeat === "monthly" && (
                <small className="field-hint text-xs text-slate-500 mt-1 block">
                  💡 Lịch lặp hằng tháng sẽ tự động tạo đợt thu mới cho các kỳ tiếp theo (Tháng 11, Tháng 12...). Nên đặt tên dạng "Quỹ định kỳ" để tránh hiểu nhầm chỉ thu cho một tháng cụ thể.
                </small>
              )}
            </label>
            <Money
              required
              label="Số tiền mỗi người (đ)"
              value={draft.amount}
              onChange={(value) => field("amount", value)}
            />
            <label className="form-field">
              Đối tượng
              <select
                value={draft.recipients === "all" ? "all" : "selected"}
                onChange={(e) =>
                  field("recipients", e.target.value === "all" ? "all" : [])
                }
              >
                <option value="all">Toàn đội đang hoạt động</option>
                <option value="selected">Chọn thành viên</option>
              </select>
            </label>
            {Array.isArray(draft.recipients) && (
              <fieldset className="fund-member-picker">
                <legend>Người cần đóng</legend>
                {members.map((m) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      checked={draft.recipients.includes(m.id)}
                      onChange={(e) =>
                        field(
                          "recipients",
                          e.target.checked
                            ? [...draft.recipients, m.id]
                            : draft.recipients.filter((id) => id !== m.id),
                        )
                      }
                    />
                    {m.name}
                  </label>
                ))}
              </fieldset>
            )}
            <label className="form-field">
              Ngày đến hạn
              <input
                required
                type="date"
                value={draft.dueDate}
                onChange={(e) => field("dueDate", e.target.value)}
                onInput={(e) => field("dueDate", e.currentTarget.value)}
              />
            </label>
            {!draft.immediate && (
              <>
                <label className="form-field">
                  Thời gian gửi nhắc · giờ Việt Nam
                  <input
                    required
                    type="datetime-local"
                    value={draft.sendAt}
                    onChange={(e) => field("sendAt", e.target.value)}
                    onInput={(e) => field("sendAt", e.currentTarget.value)}
                  />
                </label>
                <label className="form-field">
                  Lặp lại
                  <select
                    value={draft.repeat}
                    onChange={(e) => field("repeat", e.target.value)}
                  >
                    <option value="once">Không lặp</option>
                    <option value="monthly">Hằng tháng</option>
                  </select>
                </label>
                {draft.repeat === "monthly" && (
                  <label className="form-field">
                    Ngày thu hằng tháng
                    <select
                      value={draft.day}
                      onChange={(e) => {
                        const day = Number(e.target.value),
                          sendAt = nextMonthlyStart(
                            day,
                            draft.sendAt.slice(11, 16),
                          );
                        setDraft((d) => ({
                          ...d,
                          day,
                          sendAt,
                          dueDate:
                            d.dueDate < sendAt.slice(0, 10)
                              ? sendAt.slice(0, 10)
                              : d.dueDate,
                        }));
                      }}
                    >
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Ngày {i + 1}
                        </option>
                      ))}
                    </select>
                    <small>
                      Tháng không có ngày đã chọn: dùng ngày cuối tháng. Lần đầu
                      theo thời gian gửi phía trên; hạn đến sẽ theo ngày đã chọn
                      ở tháng tương ứng.
                    </small>
                  </label>
                )}
              </>
            )}
            <label className="form-field">
              Ghi chú
              <textarea
                maxLength={1000}
                value={draft.note}
                onChange={(e) => field("note", e.target.value)}
              />
            </label>
            <p className="field-hint">
              Tài khoản nhận:{" "}
              {qr.accountNumber
                ? `${qr.bankName} · ${qr.accountNumber} · ${qr.accountHolder}`
                : "Chưa cấu hình tài khoản quỹ. Chủ đội có thể cập nhật ở menu Quỹ đội."}
            </p>
            <p className="field-hint">
              Tạo nghĩa vụ đóng, không ghi tiền đã thu hoặc tăng số dư.
            </p>
            <Pressable type="submit" className="primary-button" disabled={busy}>
              {busy
                ? "Đang lưu…"
                : draft.immediate
                  ? "Tạo đợt thu"
                  : "Lưu lịch nhắc"}
            </Pressable>
          </form>
        )}
        {modal === "bill" && (
          <form
            className="security-form"
            onSubmit={(e) => {
              e.preventDefault();
              run("bill", {
                title: draft.title,
                total: Number(draft.total),
                support: Number(draft.support),
                payerKind: draft.payerKind,
                payerId: draft.payerId,
                occurredAt: transactionInstant(draft.occurredAt, zone),
                allocations: shares,
                confirmed: draft.confirmed,
                matchId: draft.matchId,
              });
            }}
          >
            <label className="form-field">
              Tên buổi
              <input
                required
                maxLength={120}
                value={draft.title}
                onChange={(e) => field("title", e.target.value)}
              />
            </label>
            <label className="form-field">
              Ngày giờ
              <input
                required
                type="datetime-local"
                value={draft.occurredAt}
                onChange={(e) => field("occurredAt", e.target.value)}
                onInput={(e) => field("occurredAt", e.currentTarget.value)}
              />
            </label>
            <Money
              required
              label="Tổng hóa đơn (đ)"
              value={draft.total}
              onChange={(v) => field("total", v)}
            />
            <Money
              label="Quỹ hỗ trợ (đ)"
              value={draft.support}
              onChange={(v) => field("support", v)}
            />
            <label className="form-field">
              Ai đã trả hóa đơn?
              <select
                value={draft.payerKind}
                onChange={(e) => field("payerKind", e.target.value)}
              >
                <option value="member">Thành viên ứng tiền cá nhân</option>
                <option value="fund">Quỹ đội đã trả</option>
              </select>
            </label>
            {draft.payerKind === "member" ? (
              <label className="form-field">
                Người ứng tiền
                <select
                  value={draft.payerId}
                  onChange={(e) => field("payerId", e.target.value)}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="notification-option">
                <input
                  required
                  type="checkbox"
                  checked={draft.confirmed}
                  onChange={(e) => field("confirmed", e.target.checked)}
                />
                Tôi xác nhận quỹ đã thực trả hóa đơn
              </label>
            )}
            <fieldset className="fund-member-picker">
              <legend>Người tham gia</legend>
              {members.map((m) => (
                <label key={m.id}>
                  <input
                    type="checkbox"
                    checked={draft.participants.includes(m.id)}
                    onChange={() => toggle(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </fieldset>
            <label className="notification-option">
              <input
                type="checkbox"
                checked={draft.custom}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    custom: e.target.checked,
                    allocations: shares,
                  }))
                }
              />
              Chỉnh phần đóng từng người
            </label>
            <p className="field-hint">
              Chia đều theo VND nguyên; phần dư 1 đ phân bổ theo thứ tự mã thành
              viên, hiển thị rõ từng phần.
            </p>
            {shares.map((s, i) =>
              draft.custom ? (
                <Money
                  key={s.id}
                  label={name(s.id)}
                  value={s.amount}
                  onChange={(v) =>
                    field(
                      "allocations",
                      shares.map((x, j) => (i === j ? { ...x, amount: v } : x)),
                    )
                  }
                />
              ) : (
                <p key={s.id}>
                  {name(s.id)} · {formatCurrency(s.amount)}
                </p>
              ),
            )}
            <p className="field-hint">
              Tổng phân bổ:{" "}
              {formatCurrency(shares.reduce((n, s) => n + s.amount, 0))} / cần
              thu {formatCurrency(Math.max(0, draft.total - draft.support))}
            </p>
            <Pressable
              className="primary-button"
              disabled={
                busy ||
                !shares.length ||
                shares.reduce((n, s) => n + s.amount, 0) !==
                  draft.total - draft.support
              }
            >
              {busy
                ? "Đang lưu…"
                : draft.payerKind === "fund"
                  ? "Ghi nhận quỹ đã chi & chia phần đóng"
                  : "Theo dõi khoản hoàn cá nhân"}
            </Pressable>
          </form>
        )}
        {failure && modal && (
          <p role="alert" className="form-error">
            {failure}
          </p>
        )}
      </ProModal>
    </section>
  );
}
