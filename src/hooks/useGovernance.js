import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
// No local-role fallback: only membership verified by the database enables writes.
export function useGovernance(accountId, teamId, demo) {
  const scope = accountId + "::" + teamId;
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const [state, setState] = useState({
    scope: null,
    snapshot: null,
    loading: true,
    error: "",
  });
  const refresh = useCallback(async () => {
    if (demo || !supabase) {
      setState({
        scope,
        snapshot: null,
        loading: false,
        error: demo
          ? "Nghiệp vụ này cần đội và thành viên đã kết nối server. Dữ liệu trải nghiệm không được dùng để ghi phạt thật."
          : "Chưa kết nối Supabase.",
      });
      return;
    }
    let data, error;
    try {
      ({ data, error } = await supabase.rpc("no_gov_snapshot", {
        p_team_id: teamId,
      }));
    } catch {
      error = true;
    }
    if (activeScope.current === scope)
      setState({
        scope,
        snapshot: error ? null : data,
        receivedAt: Date.now(),
        loading: false,
        error: error
          ? "Đội chưa được cấp dữ liệu nghiệp vụ trên server. Xin muộn, nội quy và xử lý vi phạm chưa được bật."
          : "",
      });
  }, [scope, teamId, demo]);
  useEffect(() => {
    let live = true;
    setState({ scope, snapshot: null, loading: true, error: "" });
    if (demo || !supabase) {
      refresh();
      return;
    }
    supabase
      .rpc("no_gov_snapshot", { p_team_id: teamId })
      .then(({ data, error }) => {
        if (live)
          setState({
            scope,
            snapshot: error ? null : data,
            receivedAt: Date.now(),
            loading: false,
            error: error
              ? "Đội chưa được cấp dữ liệu nghiệp vụ trên server. Xin muộn, nội quy và xử lý vi phạm chưa được bật."
              : "",
          });
      })
      .catch(() => {
        if (live)
          setState({
            scope,
            snapshot: null,
            loading: false,
            error: "Không kết nối được server. Thử lại khi có mạng.",
          });
      });
    return () => {
      live = false;
    };
  }, [scope, teamId, demo, refresh]);
  useEffect(() => {
    if (demo || !supabase) return;
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [demo, refresh]);
  const mutate = async (action, payload, key = crypto.randomUUID()) => {
    if (state.scope !== scope || !state.snapshot)
      throw new Error("Chưa có dữ liệu server đã xác thực.");
    const { data, error } = await supabase.rpc("no_gov_mutate", {
      p_team_id: teamId,
      p_action: action,
      p_payload: payload,
      p_key: key,
    });
    if (error) throw new Error(error.message);
    await refresh();
    return data;
  };
  return state.scope === scope
    ? { ...state, mutate, refresh }
    : { snapshot: null, loading: true, error: "", mutate, refresh };
}
