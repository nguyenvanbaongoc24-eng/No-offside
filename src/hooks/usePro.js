import { useCallback, useEffect, useRef, useState } from "react";
import { serverRequest } from "../lib/serverRequest";
import { beginPendingWrite } from "../lib/pendingWrites";
import { notify } from "../lib/feedback";
import {thirdChargeLabel} from '../lib/menuLabels';
export const emptyPro = {
  offers: [],
  awards: [],
  challenges: [],
  policy: { yellow: false, late: false, absence: false },
  stats: [],
  votes: [],
  charges: [],
  bills: [],
  media: [],
  reports: {},
  participation: [],
};
export function usePro({
  teamId,
  accountId,
  token,
  demo = false,
  enabled = true,
  matchVersion = "",
}) {
  const scope = teamId + "::" + accountId;
  const [bundle, setBundle] = useState({ scope, data: emptyPro });
  const state = bundle.scope === scope ? bundle.data : emptyPro;
  const setState = (data) => setBundle({ scope, data });
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const epoch = useRef(0),
    lock = useRef(false),
    knownCharges = useRef(null),
    requestSeq = useRef(0),
    lastVersion = useRef(matchVersion);
  const current = useRef(scope);
  current.current = scope;
  const refresh = useCallback(async () => {
    if (!enabled || !teamId || !token || demo) return;
    const generation = epoch.current,
      sequence = ++requestSeq.current;
    const { response, data } = await serverRequest("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ teamId, action: "pro", proAction: "state" }),
    });
    if (
      sequence !== requestSeq.current ||
      generation !== epoch.current ||
      current.current !== teamId + "::" + accountId
    )
      return;
    if (!response.ok || !data.success)
      throw Error(data.error || "Không tải được No Offside Pro.");
    const own = data.charges.filter(
      (c) => c.subject === accountId && c.status === "owed",
    );
    if (knownCharges.current)
      own
        .filter((c) => !knownCharges.current.has(c.id))
        .forEach((c) => notify("Khoản cần đóng mới: " + thirdChargeLabel(c.label,c.kind)));
    knownCharges.current = new Set(own.map((c) => c.id));
    setState({ ...emptyPro, ...data });
    setError("");
  }, [teamId, accountId, token, demo, enabled]);
  useEffect(() => {
    ++epoch.current;
    knownCharges.current = null;
    setState(emptyPro);
    setError("");
    setLoading(!demo && enabled);
    let live = true;
    refresh()
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    const focus = () => {
      if (!document.hidden) refresh().catch(() => {});
    };
    window.addEventListener("focus", focus);
    const timer = demo || !enabled ? null : setInterval(focus, 15000);
    return () => {
      live = false;
      ++epoch.current;
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (lastVersion.current === matchVersion) return;
    lastVersion.current = matchVersion;
    refresh().catch(() => {});
  }, [matchVersion, refresh]);
  const mutate = async (action, payload, requestKey) => {
    if (lock.current) throw Error("Thao tác trước đang xử lý.");
    if (demo || !token)
      throw Error("Đăng nhập tài khoản thật để sử dụng chức năng này.");
    lock.current = true;
    setBusy(true);
    const finish = beginPendingWrite(),
      owner = scope;
    try {
      const { response, data } = await serverRequest("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamId,
          action: "pro",
          proAction: action,
          payload,
          requestKey: requestKey || crypto.randomUUID(),
        }),
      });
      if (!response.ok || !data.success)
        throw Error(data.error || "Không lưu được thay đổi.");
      if (current.current === owner) {
        try {
          await refresh();
          notify("Đã cập nhật thành công");
        } catch {
          setError(
            "Đã lưu thành công nhưng chưa tải lại được. Bấm Thử lại để lấy dữ liệu mới.",
          );
          notify("Đã lưu; đang chờ tải lại dữ liệu.");
        }
      }
      return data;
    } catch (e) {
      notify(e.message, "error");
      throw e;
    } finally {
      finish();
      lock.current = false;
      setBusy(false);
    }
  };
  return { state, loading, error, busy, refresh, mutate, demo };
}
