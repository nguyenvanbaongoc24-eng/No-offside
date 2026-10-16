import { watchTeamUpdates } from "../lib/teamUpdates";
import { serverRequest } from "../lib/serverRequest";
import { withPendingWrite } from "../lib/pendingWrites";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { defaultPolicy } from "../lib/governance";

function readLocalGov(teamId, accountId, role = "owner", members = []) {
  try {
    if (typeof window !== "undefined" && window?.localStorage?.getItem) {
      const saved = window.localStorage.getItem("no_offside_gov_v1_" + teamId);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            ...parsed,
            me: {
              ...(parsed.me || {}),
              role: role || parsed.me?.role || "owner",
              status: "active",
              user_id: accountId || parsed.me?.user_id || "usr-local",
            },
          };
        }
      }
    }
  } catch {}
  return {
    me: {
      role: role || "owner",
      status: "active",
      user_id: accountId || "usr-local",
    },
    team: {
      id: teamId,
      name: "Đội bóng",
      timezone: "Asia/Ho_Chi_Minh",
      policy: defaultPolicy,
    },
    rules: [],
    events: [],
    members:
      Array.isArray(members) && members.length > 0
        ? members.map((m) => ({
            user_id: String(m.id),
            name: m.name,
            role: m.roleType || "member",
            status: "active",
          }))
        : [
            {
              user_id: accountId || "usr-local",
              name: "Đội trưởng",
              role: role || "owner",
              status: "active",
            },
          ],
    matches: [],
    periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
    periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    isLocal: true,
  };
}

function writeLocalGov(teamId, snapshot) {
  try {
    if (typeof window !== "undefined" && window?.localStorage?.setItem) {
      window.localStorage.setItem(
        "no_offside_gov_v1_" + teamId,
        JSON.stringify(snapshot),
      );
    }
  } catch {}
}

export function useGovernance(
  accountId,
  teamId,
  demo,
  role = "owner",
  members = [],
) {
  const scope = accountId + "::" + teamId;
  const refreshSequence = useRef(0);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const roleRef = useRef(role);
  roleRef.current = role;
  const membersRef = useRef(members);
  membersRef.current = members;

  const [state, setState] = useState({
    scope: null,
    snapshot: null,
    loading: true,
    error: "",
  });

  const enableLocalMode = useCallback(() => {
    const local = readLocalGov(
      teamId,
      accountId,
      roleRef.current,
      membersRef.current,
    );
    setState({
      scope,
      snapshot: local,
      receivedAt: Date.now(),
      loading: false,
      error: "",
    });
  }, [teamId, accountId, scope]);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    if (demo) {
      const local = readLocalGov(
        teamId,
        accountId,
        roleRef.current,
        membersRef.current,
      );
      setState({
        scope,
        snapshot: local,
        loading: false,
        receivedAt: Date.now(),
        error: "",
      });
      return;
    }
    if (!supabase) {
      setState({
        scope,
        snapshot: null,
        loading: false,
        error: "Chua ket noi server quan tri.",
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
    if (activeScope.current === scope && sequence === refreshSequence.current) {
      if (error) {
        setState(previous => ({
          scope,
          snapshot: previous.scope === scope ? previous.snapshot : null,
          receivedAt: previous.scope === scope ? previous.receivedAt : Date.now(),
          loading: false,
          error: "Không tải được dữ liệu quản trị từ server. Vui lòng thử lại.",
        }));
      } else {
        setState({
          scope,
          snapshot: data,
          receivedAt: Date.now(),
          loading: false,
          error: "",
        });
      }
    }
  }, [scope, teamId, demo]);

  useEffect(() => {
    setState({ scope, snapshot: null, loading: true, error: "" });
    refresh();
    const stop =
      !demo && supabase
        ? watchTeamUpdates(supabase, "governance:" + scope, teamId, refresh)
        : null;
    return () => {
      ++refreshSequence.current;
      stop?.();
    };
  }, [scope, teamId, demo, refresh]);

  const mutate = async (action, payload, key = crypto.randomUUID()) => {
    if (state.scope !== scope || !state.snapshot)
      throw new Error("Chưa có dữ liệu server đã xác thực.");

    if (!demo && (!supabase || state.snapshot?.isLocal))
      throw Error("Chưa có server xác nhận nghiệp vụ.");
    if (demo) {
      // Local mutation execution
      const current = { ...state.snapshot };
      if (action === "rules") {
        const nextVersion =
          (current.rules || []).reduce(
            (max, r) => Math.max(max, r.version || 0),
            0,
          ) + 1;
        const newRule = {
          id: crypto.randomUUID(),
          team_id: teamId,
          version: nextVersion,
          content: (payload.content || "").trim(),
          effective_at: payload.effectiveAt || new Date().toISOString(),
          require_ack: Boolean(payload.requireAck),
          actor: accountId || "usr-local",
          created_at: new Date().toISOString(),
        };
        current.rules = [...(current.rules || []), newRule];
      } else if (action === "ack_rules") {
        current.events = [
          ...(current.events || []),
          {
            id: crypto.randomUUID(),
            action: "ack_rules",
            subject: accountId,
            actor: accountId,
            data: { ruleId: payload.ruleId, version: payload.version },
            created_at: new Date().toISOString(),
          },
        ];
      } else if (action === "policy") {
        current.team = { ...current.team, policy: payload };
      } else if (action === "sanction") {
        current.events = [
          ...(current.events || []),
          {
            id: crypto.randomUUID(),
            action: "sanction",
            subject: payload.subject,
            actor: accountId,
            data: payload,
            created_at: new Date().toISOString(),
          },
        ];
      } else if (action === "violation") {
        const latestRule = (current.rules || []).slice(-1)[0];
        current.events = [
          ...(current.events || []),
          {
            id: crypto.randomUUID(),
            action: "violation",
            subject: payload.subject,
            match_id: payload.matchId || null,
            actor: accountId || "usr-local",
            data: {
              ...payload,
              fine: Number(payload.fine || 0),
              ruleId: latestRule?.id || null,
              ruleVersion: latestRule?.version || 1,
              status: "final",
            },
            created_at: new Date().toISOString(),
          },
        ];
      } else if (action === "adjust") {
        current.events = [
          ...(current.events || []),
          {
            id: crypto.randomUUID(),
            action: "adjust",
            actor: accountId || "usr-local",
            data: payload,
            created_at: new Date().toISOString(),
          },
        ];
      }
      writeLocalGov(teamId, current);
      setState((prev) => ({ ...prev, snapshot: current }));
      return { success: true };
    }

    const { data: session } = await supabase.auth.getSession();
    const { response, data } = await withPendingWrite(() =>
      serverRequest("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session?.session?.access_token,
        },
        body: JSON.stringify({
          teamId,
          action: "governance",
          governanceAction: action,
          payload,
          requestKey: key,
        }),
      }),
    );
    if (!response.ok)
      throw Error(data.error || "Không lưu được thao tác điểm danh.");
    if (activeScope.current === scope) await refresh();
    return data;
  };

  return state.scope === scope
    ? {
        ...state,
        mutate,
        refresh,
        enableLocalMode: demo ? enableLocalMode : undefined,
      }
    : {
        snapshot: null,
        loading: true,
        error: "",
        mutate,
        refresh,
        enableLocalMode: demo ? enableLocalMode : undefined,
      };
}
