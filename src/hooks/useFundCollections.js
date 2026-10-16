import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { serverRequest } from "../lib/serverRequest";
import { withPendingWrite } from "../lib/pendingWrites";
const empty = {
  schedules: [],
  collections: [],
  charges: [],
  bills: [],
  members: [],
  history: [],
  canManage: false,
  treasurer: false,
};
export function useFundCollections({
  teamId,
  accountId,
  token,
  demo = false,
  enabled = true,
  onUpdated,
}) {
  const scope = accountId + "::" + teamId,
    current = useRef(scope);
  current.current = scope;
  const [bundle, setBundle] = useState({
    scope,
    data: empty,
    error: "",
    loading: false,
  });
  const [busyScope, setBusyScope] = useState(null),
    lock = useRef(null),
    retry = useRef(null),
    sequence = useRef(0),
    updated = useRef(onUpdated);
  updated.current = onUpdated;
  const request = useCallback(
    async (action, payload = {}, requestKey) => {
      if (!enabled || demo || !token)
        throw Error(
          "Chức năng này cần dữ liệu và quyền được máy chủ xác nhận.",
        );
      const { response, data } = await serverRequest("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "fund",
          teamId,
          fundAction: action,
          payload,
          requestKey,
        }),
      });
      if (!response.ok || !data.success)
        throw Error(data.error || "Chưa tải được đợt thu quỹ.");
      return data;
    },
    [teamId, token, demo, enabled],
  );
  const refresh = useCallback(async () => {
    if (demo || !enabled || !token) return;
    const n = ++sequence.current;
    try {
      const data = await request("state");
      if (current.current === scope && n === sequence.current)
        setBundle({ scope, data, error: "", loading: false });
    } catch (e) {
      if (current.current === scope && n === sequence.current)
        setBundle({ scope, data: empty, error: e.message, loading: false });
    }
  }, [request, scope, demo, enabled, token]);
  useEffect(() => {
    ++sequence.current;
    setBundle({
      scope,
      data: empty,
      error: "",
      loading: !demo && enabled && !!token,
    });
    retry.current = null;
    refresh();
    if (demo || !enabled || !token) return;
    const onFocus = () => {
      if (!document.hidden) refresh();
    };
    const timer = setInterval(onFocus, 15000);
    window.addEventListener("focus", onFocus);
    const channel = supabase
      ?.channel?.("fund-updates:" + scope)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "no_team_updates",
          filter: "team_id=eq." + teamId,
        },
        onFocus,
      )
      .subscribe();
    return () => {
      ++sequence.current;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [scope, refresh, demo, enabled, token, teamId]);
  const mutate = async (action, payload = {}) => {
    if (lock.current === scope) throw Error("Đang xử lý thao tác trước.");
    const signature = JSON.stringify([scope, action, payload]);
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    const key = retry.current.key;
    lock.current = scope;
    setBusyScope(scope);
    ++sequence.current;
    try {
      const data = await withPendingWrite(() => request(action, payload, key));
      if (current.current === scope) {
        setBundle({ scope, data, error: "", loading: false });
        retry.current = null;
        try {
          await updated.current?.();
        } catch {}
      }
      return data;
    } finally {
      if (lock.current === scope) lock.current = null;
      setBusyScope((old) => (old === scope ? null : old));
    }
  };
  return {
    ...(bundle.scope === scope
      ? bundle
      : { data: empty, error: "", loading: true }),
    busy: busyScope === scope,
    refresh,
    loadHistory: (id) => request("history", { id }),
    mutate,
    demo,
  };
}
