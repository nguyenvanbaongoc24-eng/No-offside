// Realtime is a signal to fetch the authorized snapshot, never a second data store.
export function watchTeamUpdates(
  client,
  scope,
  teamId,
  refresh,
  intervalMs = 15000,
) {
  let live = true;
  const sync = () => {
    if (live && !document.hidden)
      Promise.resolve()
        .then(() => live && refresh())
        .catch(() => {});
  };
  const channel = client
    ?.channel?.("team-signal:" + scope)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "no_team_updates",
        filter: "team_id=eq." + teamId,
      },
      sync,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") sync();
    });
  const timer = setInterval(sync, intervalMs);
  window.addEventListener("focus", sync);
  window.addEventListener("online", sync);
  document.addEventListener?.("visibilitychange", sync);
  return () => {
    live = false;
    clearInterval(timer);
    window.removeEventListener("focus", sync);
    window.removeEventListener("online", sync);
    document.removeEventListener?.("visibilitychange", sync);
    if (channel) client.removeChannel(channel);
  };
}
