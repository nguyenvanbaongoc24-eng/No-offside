import {proRequest} from './_pro.js';
import {dispatchAfterCommit} from './_push.js';
import {
  getUserClient,
  getAuthUser,
  apiError,
  bearerToken,
  setCorsHeaders,
} from "./_storageHelper.js";
import { snapshot } from "./_workspace.js";
export default async function handler(req, res) {
  setCorsHeaders(res);
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if(req.method==='GET'&&new URL(req.url,'http://localhost').searchParams.get('public')==='matchmaking'){
    try{const result=await getUserClient({headers:{}}).rpc('no_mm_state',{p_team:null});if(result.error)throw result.error;return res.status(200).json(result.data);}
    catch(error){return apiError(res,error);}
  }
  if (!bearerToken(req))
    return res
      .status(401)
      .json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  try {
    const client = getUserClient(req),
      user = await getAuthUser(req, client);
    if (!user)
      return res
        .status(401)
        .json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    if (req.method === "GET") {
      const teamId = new URL(req.url, "http://localhost").searchParams.get(
        "teamId",
      );
      if (!teamId) return res.status(400).json({ error: "Thiếu teamId." });
      return res.status(200).json(await snapshot(client, teamId));
    }
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
    let body;try{body=typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};}catch{return res.status(400).json({error:'Dữ liệu không hợp lệ.'});}
    if(!body || typeof body!=='object' || Array.isArray(body))return res.status(400).json({error:'Dữ liệu không hợp lệ.'});
    if(body.action==='matchmaking'){
      if(typeof body.teamId!=='string'||body.teamId.length>100||typeof body.matchmakingAction!=='string'||JSON.stringify(body).length>24000)return res.status(400).json({error:'Dữ liệu Tìm đối không hợp lệ.'});
      const result=await client.rpc('no_mm_action',{p_team:body.teamId,p_action:body.matchmakingAction,p_payload:body.payload||{},p_key:body.requestKey||null});if(result.error)throw result.error;
      const dispatch=body.matchmakingAction!=='state'?await dispatchAfterCommit():null;return res.status(200).json({...result.data,notificationPending:!!dispatch?.pending});
    }
    if (body.action === 'match') {
      if (typeof body.teamId !== 'string' || typeof body.matchId !== 'string' || typeof body.matchAction !== 'string' || JSON.stringify(body).length > 40000) return res.status(400).json({error:'Dữ liệu trận không hợp lệ.'});
      const result = await client.rpc('no_match_action', {p_team:body.teamId,p_match:body.matchId,p_action:body.matchAction,p_payload:body.payload || {},p_key:body.requestKey || null});
      if (result.error) throw result.error;
      const dispatch = !['state','preview_fines'].includes(body.matchAction) ? await dispatchAfterCommit() : null;
      return res.status(200).json({...result.data,notificationPending:!!dispatch?.pending});
    }
    if (body.action === 'fund') {
      if (typeof body.teamId !== 'string' || body.teamId.length > 100 || typeof body.fundAction !== 'string' || JSON.stringify(body).length > 40000) return res.status(400).json({error:'Dữ liệu quỹ không hợp lệ.'});
      const result = await client.rpc('no_fund_action',{p_team:body.teamId,p_action:body.fundAction,p_payload:body.payload || {},p_key:body.fundAction==='state'?null:body.requestKey});
      if(result.error)throw result.error;
      if(!['state','history'].includes(body.fundAction))await dispatchAfterCommit();
      return res.status(200).json(result.data);
    }
    if (body.action === 'governance') {
      if(typeof body.teamId!=='string'||typeof body.governanceAction!=='string'||JSON.stringify(body).length>40000)return res.status(400).json({error:'Dữ liệu điểm danh không hợp lệ.'});
      const result=await client.rpc('no_gov_mutate',{p_team_id:body.teamId,p_action:body.governanceAction,p_payload:body.payload||{},p_key:body.requestKey});
      if(result.error)throw result.error;
      await dispatchAfterCommit();return res.status(200).json(result.data);
    }
    if(body.action==='pro'){const data=await proRequest(client,body);if(body.proAction!=='state')await dispatchAfterCommit();return res.status(200).json(data);}
    if (body.action === "save-profile") {
      const p = body.profile || {};
      const { data, error } = await client.rpc("no_app_save_profile", {
        p_profile: p,
      });
      if (error) throw error;
      return res.status(200).json({ success: true, profile: data });
    }
    if (body.action === "payment" && body.teamId && body.requestKey) {
      const { data, error } = await client.rpc("no_app_payment", {
        p_team_id: body.teamId,
        p_action: body.paymentAction,
        p_payment_id: body.paymentId || "",
        p_reason: body.reason || "",
        p_key: body.requestKey,
      });
      if (error) throw error;
      const dispatch = await dispatchAfterCommit();
      return res.status(200).json({...data,notificationPending:!!dispatch?.pending});
    }
    if (
      body.action === "read-notices" &&
      body.teamId &&
      Array.isArray(body.ids)
    ) {
      const { data, error } = await client.rpc("no_app_read_notices", {
        p_team_id: body.teamId,
        p_ids: body.ids,
      });
      if (error) throw error;
      await dispatchAfterCommit();
      return res.status(200).json(data);
    }
    if (body.action === "settings" && body.teamId && body.updates) {
      const { data, error } = await client.rpc("no_app_settings", {
        p_team_id: body.teamId,
        p_updates: body.updates,
      });
      if (error) throw error;
      return res.status(200).json(await snapshot(client, body.teamId));
    }
    if (
      body.action === "commit" &&
      body.teamId &&
      Number.isInteger(body.revision) &&
      body.requestKey &&
      body.patch &&
      !body.data &&
      !body.teamSettingsUpdates
    ) {
      const { data, error } = await client.rpc("no_app_commit", {
        p_team_id: body.teamId,
        p_revision: body.revision,
        p_key: body.requestKey,
        p_patch: body.patch,
      });
      if (error?.code === "40001")
        return res.status(409).json({ error: error.message });
      if (error) throw error;
      const dispatch = await dispatchAfterCommit();
      return res.status(200).json({...data,notificationPending:!!dispatch?.pending});
    }
    return res
      .status(400)
      .json({
        error:
          "Phiên bản ghi dữ liệu cũ không còn được hỗ trợ. Vui lòng cập nhật ứng dụng.",
      });
  } catch (error) {
    return apiError(res, error);
  }
}
