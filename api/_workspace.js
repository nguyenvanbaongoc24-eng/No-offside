import { getAdminClient, readJson } from "./_storageHelper.js";
export const EMPTY_DATA = {
  funds: { transactions: [], pendingApprovals: [], debtors: [] },
  matches: [],
  attendance: {},
  reports: {},
  notices: [],
};
export async function snapshot(client, teamId) {
  let result = await client.rpc("no_app_snapshot", { p_team_id: teamId });
  if (result.error) throw result.error;
  if (!result.data?.initialized) {
    // Membership was verified by the RPC before any service-role legacy read.
    const admin = getAdminClient();
    const team = await readJson(admin, `teams/${teamId}.json`, {});
    const data = await readJson(admin, `team_data/${teamId}.json`, EMPTY_DATA);
    const seed = await admin.rpc("no_app_seed", {
      p_team_id: teamId,
      p_settings: team,
      p_data: { ...EMPTY_DATA, ...data },
    });
    if (seed.error) throw seed.error;
    result = await client.rpc("no_app_snapshot", { p_team_id: teamId });
    if (result.error) throw result.error;
  }
  const qr = result.data?.team?.treasurerQr;
  if (qr?.uploadedQrPath) {
    const path = qr.uploadedQrPath;
    if (!path.startsWith(teamId + "/qr/") || path.includes(".."))
      throw Object.assign(Error("Đường dẫn QR không hợp lệ."), { status: 403 });
    const signed = await getAdminClient()
      .storage.from("team_assets")
      .createSignedUrl(path, 3600);
    result.data.team.treasurerQr = {
      ...qr,
      uploadedQrImage: signed.error ? "" : signed.data.signedUrl,
    };
    if (signed.error)
      result.data.assetsError = "Chưa tải được ảnh QR. Vui lòng thử lại.";
  }
  return result.data;
}
