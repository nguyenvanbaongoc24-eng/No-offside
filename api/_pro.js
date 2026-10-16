// Shared Sync endpoint keeps deployment within the existing function budget.
export async function proRequest(client, body) {
  if (
    typeof body.teamId !== "string" ||
    body.teamId.length > 100 ||
    typeof body.proAction !== "string" ||
    JSON.stringify(body).length > 40000
  )
    throw Object.assign(Error("Dữ liệu Pro không hợp lệ."), { status: 400 });
  const { data, error } = await client.rpc("no_pro_action", {
    p_team: body.teamId,
    p_action: body.proAction,
    p_payload: body.payload || {},
    p_key: body.proAction === "state" ? null : body.requestKey,
  });
  if (error) throw error;
  return data;
}
