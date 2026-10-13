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

export function useGovernance(accountId, teamId, demo, role = "owner", members = []) {
  const scope = accountId + "::" + teamId;
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
    const local = readLocalGov(teamId, accountId, roleRef.current, membersRef.current);
    setState({
      scope,
      snapshot: local,
      receivedAt: Date.now(),
      loading: false,
      error: "",
    });
  }, [teamId, accountId, scope]);

  const refresh = useCallback(async () => {
    if (demo || !supabase) {
      const local = readLocalGov(teamId, accountId, roleRef.current, membersRef.current);
      setState({
        scope,
        snapshot: local,
        loading: false,
        receivedAt: Date.now(),
        error: "",
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
    if (activeScope.current === scope) {
      if (error) {
        // Fallback to local governance snapshot so team can create & edit rules
        const local = readLocalGov(teamId, accountId, roleRef.current, membersRef.current);
        setState({
          scope,
          snapshot: local,
          receivedAt: Date.now(),
          loading: false,
          error: "",
        });
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
    let live = true;
    setState({ scope, snapshot: null, loading: true, error: "" });
    if (demo || !supabase) {
      const local = readLocalGov(teamId, accountId, roleRef.current, membersRef.current);
      setState({
        scope,
        snapshot: local,
        loading: false,
        receivedAt: Date.now(),
        error: "",
      });
      return;
    }
    supabase
      .rpc("no_gov_snapshot", { p_team_id: teamId })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) {
          const local = readLocalGov(teamId, accountId, roleRef.current, membersRef.current);
          setState({
            scope,
            snapshot: local,
            receivedAt: Date.now(),
            loading: false,
            error: "",
          });
        } else {
          setState({
            scope,
            snapshot: data,
            receivedAt: Date.now(),
            loading: false,
            error: "",
          });
        }
      })
      .catch(() => {
        if (!live) return;
        const local = readLocalGov(teamId, accountId, roleRef.current, membersRef.current);
        setState({
          scope,
          snapshot: local,
          receivedAt: Date.now(),
          loading: false,
          error: "",
        });
      });
    return () => {
      live = false;
    };
  }, [scope, teamId, demo]);

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

    if (state.snapshot?.isLocal || demo || !supabase) {
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
    ? { ...state, mutate, refresh, enableLocalMode }
    : { snapshot: null, loading: true, error: "", mutate, refresh, enableLocalMode };
}
