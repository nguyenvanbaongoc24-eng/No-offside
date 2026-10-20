import { attendanceReadiness } from '../lib/matchWorkflow';
import React,{useEffect,useState} from 'react';
import {useMatchDetails} from '../hooks/useMatchDetails';
import {lifecycle,actualCounts,matchDraft,MATCH_ZONE} from '../lib/matchLifecycle';
import {matchTimeLabel} from '../lib/matchTime';
import {localTransactionTime,transactionInstant} from '../lib/transactionTime';
import {formatCurrency} from '../lib/formatCurrency';
import {allocateBill} from '../lib/fundCollections';
import {notify} from '../lib/feedback';
import Pressable from '../components/Pressable';
import ProModal from '../components/pro/ProModal';
import MatchFormSheet from '../components/MatchFormSheet';
import LateArrivalPanel from '../components/LateArrivalPanel';
import MatchLateReview from '../components/MatchLateReview';
import FundOperations from '../components/FundOperations';
import {ArrowLeft,Users2,Wallet,Beer,MoreHorizontal} from '../components/icons';

const actualLabel={ontime:'Có mặt đúng giờ',late:'Đến muộn',absent:'Vắng',unknown:'Chưa xác nhận'};
const registrationLabel={attending:'Tham gia',absent:'Không tham gia',maybe:'Chưa chắc'};
export default function MatchDetail({team,matchId,accountId,token,demo,fund,governance,onUpdated,onBack,onSaveMatch,onDuplicate,onOpenFund,onOpenRules,onOpenTactics,onRegistration}) {
 const detail=useMatchDetails({teamId:team.id,matchId,accountId,token,demo,onUpdated});
 const [now,setNow]=useState(Date.now()),[modal,setModal]=useState(null),[error,setError]=useState('');
 const [result,setResult]=useState({home:'',away:'',note:''}),[reason,setReason]=useState(''),[entries,setEntries]=useState({});
 const [edit,setEdit]=useState(null),[fines,setFines]=useState([]),[busy,setBusy]=useState(false),[ownBusy,setOwnBusy]=useState(false);
 const [cost,setCost]=useState({total:'',support:0,payerKind:'',payerId:'',confirmed:false,ids:[],shares:null});
 const [finishStep,setFinishStep]=useState('input');
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 const data=detail.data;
 const open=kind=>{setError('');setReason('');setEntries({});setFinishStep('input');setModal(kind);};
 const run=async(action,payload)=>{
  if(busy||detail.busy)return;setBusy(true);setError('');
  try{
    const saved=await detail.mutate(action,payload);setModal(null);
    if(action==='finish'){
      notify('Đã chuyển trận đấu vào Lịch sử','success',{text:'Xem lịch sử',onClick:()=>detail.refresh()});
    }else{
      notify(saved.notificationPending?'Đã lưu trận; thông báo đang chờ gửi.':'Đã lưu cập nhật trận.');
    }
  }
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 if(detail.loading&&!data)return <div className="match-detail-page"><header><Pressable aria-label="Quay lại" onClick={onBack}><ArrowLeft/></Pressable><h1>Chi tiết trận</h1></header><p role="status">Đang tải trận đấu…</p></div>;
 if(!data)return <div className="match-detail-page"><header><Pressable aria-label="Quay lại" onClick={onBack}><ArrowLeft/></Pressable><h1>Chi tiết trận</h1></header><p role="alert">{detail.error||'Không tìm thấy trận trong đội đang chọn.'}</p><Pressable className="primary-button" onClick={detail.refresh}>Thử lại</Pressable></div>;
 const {match,record,roster,actual,registration,finance}=data;
 const effectiveNow=Date.parse(data.serverNow||new Date().toISOString())+Math.max(0,now-(detail.receivedAt||now));
 const status=lifecycle(match,effectiveNow);
 const ended=match.status==='completed',cancelled=status.key==='cancelled';
 const counts=actualCounts(roster,actual),registered=roster.filter(p=>registration[p.id]==='attending').length;
 const readiness=attendanceReadiness({match,record,roster,actual,accountId,events:governance.error?null:governance.snapshot?.events,fines:modal==='finalize'?fines:[]});
 const rowsFund={...fund,data:{...fund.data,collections:fund.data.collections.filter(c=>c.id===finance?.collectionId),charges:fund.data.charges.filter(c=>c.collection_id===finance?.collectionId)}};
 let allocations=[];try{allocations=cost.shares||allocateBill(cost.total,cost.support,cost.ids);}catch{}
 const allocated=allocations.reduce((n,p)=>n+Number(p.amount),0),required=Number(cost.total||0)-Number(cost.support||0);
 const offset=Number(finance?.offset||0),paid=Number(finance?.paid||0),remaining=Math.max(0,Number(finance?.required||0)-paid);
 const startFinalize=async()=>{setBusy(true);setError('');try{const preview=await detail.mutate('preview_fines');setFines(preview.fines||[]);open('finalize');}catch(e){setError(e.message);}finally{setBusy(false);}};
 const costChange=(key,value)=>setCost(c=>key==='total'&&value!==''&&Number(value)===0
  ? {...c,total:value,support:0,payerKind:'',payerId:'',ids:[],shares:null,confirmed:false}
  : {...c,confirmed:false,[key]:value});
 return <div className="match-detail-page">
  <header className="match-detail-header"><Pressable aria-label="Quay lại" onClick={onBack}><ArrowLeft size={23}/></Pressable><h1>Chi tiết trận</h1>
   {data.canManage&&<details className="action-menu"><summary aria-label="Tùy chọn trận"><MoreHorizontal/></summary><div className="menu-popover">
    {!ended&&!cancelled&&<Pressable onClick={()=>{setError('');setEdit(matchDraft(match,team));}}>Sửa lịch / thông tin trận</Pressable>}
    <Pressable onClick={()=>onDuplicate(match)}>Nhân bản thông tin trận</Pressable>
    {!ended&&!cancelled&&<Pressable className="danger-action" onClick={()=>open('cancel')}>Hủy trận</Pressable>}
   </div></details>}
  </header>
  {(detail.error||(!modal&&error))&&<p role="alert" className="form-error">{detail.error||error}<Pressable onClick={detail.refresh}>Lấy dữ liệu mới</Pressable></p>}
  <section className="match-result-card"><span className="match-status">{status.label}</span><div className="match-scoreline"><strong>{team.teamName}</strong><strong className="match-score">{ended&&record.score_home!=null?`${record.score_home} : ${record.score_away}`:'—'}</strong><strong>{match.matchType==='internal'?'Nội bộ':match.opponent||match.title?.split(' — ').at(-1)||'Đang tìm đối'}</strong></div>
   {ended&&record.score_home==null&&<p>Chưa cập nhật kết quả</p>}
   <p>{matchTimeLabel(match.datetime)} · {match.venue||'Chưa chốt sân'}</p>
   {match.endsAt?<p>Kết thúc dự kiến: {matchTimeLabel(match.endsAt)}</p>:<p>Chưa cập nhật giờ kết thúc dự kiến</p>}
   {match.address&&<p>{match.address}</p>}{match.mapUrl&&<a href={match.mapUrl} target="_blank" rel="noreferrer noopener">Xem bản đồ sân</a>}
   {!ended&&!cancelled&&data.canManage&&<Pressable className="choice-button" disabled={effectiveNow<Date.parse(match.datetime)} onClick={()=>{setResult({home:'',away:'',note:''});open('finish');}}>Kết thúc trận</Pressable>}
   {ended&&!cancelled&&data.canManage&&<Pressable className="choice-button" onClick={()=>{setResult({home:record.score_home??'',away:record.score_away??'',note:record.post_note||''});open('result');}}>Cập nhật kết quả & ghi chú</Pressable>}
   {cancelled&&<p>{match.cancelReason||match.archiveReason||'Lịch sử trận được giữ lại.'}</p>}
  </section>
  {ended&&!cancelled&&<section className="match-v2-card match-workflow" aria-label="Tiến độ sau trận">
   <h2>Các bước sau trận</h2>
   <p className="field-hint">Trận đã ở Lịch sử. Điểm danh, vi phạm và thu chi được xác nhận riêng.</p>
   <ol>
    <li><strong>Kết quả trận</strong><span>{record.score_home==null?'Chưa cập nhật · có thể bổ sung sau':'Đã cập nhật'}</span></li>
    <li><strong>Điểm danh & vi phạm</strong><span>{record.finalized_at?'Đã chốt':`${roster.length-counts.unknown}/${roster.length} người đã xác nhận thực tế · chưa chốt`}</span></li>
    <li><strong>Chi phí & thu tiền</strong><span>{!finance?'Chưa xác nhận chi phí':finance.zero?'Đã xác nhận không phát sinh chi phí':remaining>0?`Còn phải thu ${formatCurrency(remaining)}`:'Đã đối soát đủ chi phí trận'}</span></li>
   </ol>
   <p className="field-hint">Khoản phạt theo cấu hình đội chỉ được ghi khi xác nhận chốt; tiền đã nộp chờ duyệt chưa được tính là đã thu.</p>
  </section>}
  {!ended&&!cancelled&&<>
   <section className="match-v2-card"><h2>Đăng ký trước trận</h2><p>Trạng thái của bạn: <strong>{registrationLabel[registration[accountId]]||'Chưa phản hồi'}</strong></p><p className="field-hint">Hạn đăng ký: {matchTimeLabel(match.deadline)}. Đăng ký tham gia chưa phải xác nhận có mặt thực tế.</p>
    <div className="late-review-actions">{[['attending','Tham gia'],['absent','Không tham gia']].map(([value,label])=><Pressable key={value} className={registration[accountId]===value?'primary-button':'choice-button'} disabled={ownBusy||effectiveNow>=Date.parse(match.deadline)} aria-pressed={registration[accountId]===value} onClick={async()=>{setOwnBusy(true);setError('');try{await onRegistration(value);await detail.refresh();}catch(e){setError(e.message);}finally{setOwnBusy(false);}}}>{label}</Pressable>)}</div>
    <p>{registered}/{roster.length} người đăng ký tham gia</p><details><summary>Xem danh sách đăng ký</summary>{roster.map(p=><p key={p.id}>{p.name} · {registrationLabel[registration[p.id]]||'Chưa phản hồi'}</p>)}</details>
    <LateArrivalPanel governance={governance} matchId={matchId} userId={accountId}/>
    <MatchLateReview governance={governance} matchId={matchId} members={roster} attendance={registration} canManage={data.canManage}/>
   </section>
   <section className="match-v2-card"><h2>Ghi chú & chiến thuật</h2><p className="match-note">{match.note||'Chưa có ghi chú cho trận.'}</p><Pressable className="choice-button" onClick={onOpenTactics}>Mở Chiến thuật</Pressable></section>
  </>}
  <section className="match-v2-card"><h2><Users2 size={22}/>Tham gia thực tế</h2>
   <div className="match-actual-counts">{Object.entries(actualLabel).map(([key,label])=><div key={key}><strong>{counts[key]}</strong><span>{label}</span></div>)}</div>
   <Pressable className="choice-button w-full" onClick={()=>open('actual')}>Xem danh sách{data.canManage&&!record.finalized_at&&!cancelled?' & xác nhận':''}</Pressable>
   {record.finalized_at?<p className="field-hint">Đã chốt: {matchTimeLabel(record.finalized_at)} · {roster.find(p=>p.id===record.finalized_by)?.name||'Ban quản lý'}</p>:<div className="match-unfinished"><strong>{cancelled?'Điểm danh chưa chốt · chỉ xem lịch sử':'Điểm danh chưa chốt'}</strong>{data.canManage&&!cancelled&&<Pressable className="choice-button" disabled={busy||detail.busy} onClick={startFinalize}>Kiểm tra & chốt</Pressable>}</div>}
   {!record.finalized_at&&!cancelled&&<ul className="match-workflow-blockers" aria-label="Điều kiện chốt điểm danh">{readiness.blockers.map(message=><li key={message}>{message}</li>)}</ul>}
   <p className="field-hint">Xin đến muộn và đăng ký tham gia không tự xác nhận có mặt.</p>
   {ended&&!cancelled&&!record.finalized_at&&<MatchLateReview governance={governance} matchId={matchId} members={roster} attendance={registration} canManage={data.canManage}/>}
  </section>
  <section className="match-v2-card"><h2><Wallet size={22}/>Chi phí trận</h2>
   {!finance?<><p>Chưa cập nhật chi phí</p>{match.modelVersion===2&&<p className="field-hint">Dự toán: {formatCurrency(Number(match.expectedPitch||0)+Number(match.expectedOther||0))} · chưa ghi thu/chi.</p>}{data.canManageFunds&&!cancelled&&<Pressable className="choice-button w-full" onClick={()=>{setCost({total:'',support:0,payerKind:'',payerId:'',confirmed:false,ids:[],shares:null});open('cost');}}>Cập nhật chi phí thực tế & tạo khoản thu</Pressable>}</>:
    <>{finance.zero&&<p className="field-hint">Đã xác nhận không phát sinh chi phí. Không tạo khoản thu.</p>}<dl className="match-finance-rows"><div><dt>Tổng chi thực tế</dt><dd>{formatCurrency(finance.bill?.total||0)}</dd></div><div><dt>Quỹ hỗ trợ</dt><dd>{formatCurrency(finance.bill?.details.support||0)}</dd></div><div><dt>Cần thu từ thành viên</dt><dd>{formatCurrency(finance.required)}</dd></div><div><dt>Đã thu được duyệt</dt><dd>{formatCurrency(Math.max(0,paid-offset))}</dd></div>{offset>0&&<div><dt>Đối trừ phần người ứng tự chịu</dt><dd>{formatCurrency(offset)}</dd></div>}<div><dt>Còn thiếu</dt><dd>{formatCurrency(remaining)}</dd></div></dl>
     {Number(finance.required)>0&&<progress aria-label="Tiến độ đối soát chi phí trận" value={paid} max={Number(finance.required)}/>}
     {finance.bill?.details.payerKind==='member'&&<p className="field-hint">{finance.bill.details.payerName} ứng tiền cá nhân; khoản hoàn trực tiếp cho người ứng không cộng vào số dư quỹ.</p>}
     {finance.bill?.details.payerKind==='member'&&Number(finance.bill.details.support)>0&&!finance.bill.details.subsidyPaid&&data.canManageFunds&&<Pressable className="choice-button" onClick={onOpenFund}>Quỹ chưa hoàn hỗ trợ · đối soát trong Quỹ đội</Pressable>}
     {finance.collectionId&&<Pressable className="choice-button w-full" onClick={()=>open('charges')}>{data.canManageFunds?'Xem khoản thu liên kết trận':'Xem nghĩa vụ đóng của tôi'}</Pressable>}
    </>}
   {!cancelled&&<Pressable className="match-third-button" onClick={()=>open('third')}><Beer size={22}/>Sinh tố lúa mạch</Pressable>}
  </section>
  {(ended||cancelled)&&<section className="match-v2-card"><h2>Ghi chú & lịch sử</h2><p className="match-note">{record.post_note||match.note||'Chưa có ghi chú sau trận.'}</p>{data.history.map((event,i)=><p className="field-hint" key={i}>{({finish:'Kết thúc trận',result:'Cập nhật kết quả',cancel:'Hủy trận',actual:'Xác nhận thực tế',finalize:'Chốt điểm danh',cost:'Xác nhận chi phí',schedule_change:'Đổi lịch / sân'})[event.action]||event.action} · {matchTimeLabel(event.created_at)} · {roster.find(p=>p.id===event.actor)?.name||'Ban quản lý'}</p>)}</section>}
  {edit&&<MatchFormSheet editing draft={edit} onChange={setEdit} error={error} venues={[team.venue,...(team.venues||[])]} onClose={()=>setEdit(null)} onSubmit={async e=>{e.preventDefault();try{await onSaveMatch(edit,matchId);setEdit(null);await detail.refresh();}catch(err){setError(err.message);}}}/>}
  <ProModal open={!!modal} title={modal==='finish'&&finishStep==='confirm'?'Kết thúc và lưu vào lịch sử?':({finish:'Kết thúc trận',result:'Cập nhật kết quả',actual:'Tham gia thực tế',finalize:'Kiểm tra & chốt điểm danh',cost:'Chi phí trận thực tế',charges:'Khoản thu của trận',third:'Sinh tố lúa mạch',cancel:'Hủy trận'})[modal]||''} busy={busy||detail.busy} onClose={()=>setModal(null)}>
   {modal==='finish'&&finishStep==='input'&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();setFinishStep('confirm');}}>
    <p>Để trống cả hai ô nếu chưa cập nhật kết quả. Trận nội bộ có thể không cần tỷ số.</p><div className="match-v2-grid">{[['home',team.teamName],['away',match.opponent||'Đối thủ / nội bộ']].map(([key,label])=><label className="form-field" key={key}>{label}<input type="number" min="0" max="999" step="1" value={result[key]} onChange={e=>setResult({...result,[key]:e.target.value})}/></label>)}</div>
    <label className="form-field">Ghi chú sau trận<textarea maxLength={4000} value={result.note} onChange={e=>setResult({...result,note:e.target.value})}/></label>
    <details><summary>Kiểm tra danh sách thực tế</summary>{roster.map(p=><p key={p.id}>{p.name} · {actualLabel[actual[p.id]?.status]||'Chưa xác nhận'}</p>)}</details><p className="field-hint">Kết thúc trận không chốt điểm danh, không tạo phạt và không ghi chi phí. Bạn có thể xác nhận thực tế riêng sau bước này.</p>
    <Pressable className="primary-button w-full" type="submit">Tiếp tục</Pressable>
   </form>}
   {modal==='finish'&&finishStep==='confirm'&&<div className="space-y-4">
    <p className="text-sm text-slate-700 dark:text-slate-300">Trận đấu sẽ được chuyển sang tab Lịch sử và không còn hiển thị trong danh sách trận trên dashboard. Bạn vẫn có thể xem kết quả, xử lý điểm danh và thu chi tại đó.</p>
    {(!record.finalized_at||!finance||(!finance.bill&&!finance.zero)||(finance&&remaining>0))&&<div className="unfinished-tasks-box p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
     <p className="font-bold">Các việc chưa hoàn tất:</p>
     <ul className="list-disc pl-4 space-y-0.5">
      {!record.finalized_at&&<li>Điểm danh chưa chốt.</li>}
      {(!finance||(!finance.bill&&!finance.zero))&&<li>Chi phí chưa cập nhật.</li>}
      {finance&&remaining>0&&<li>Còn khoản phải thu.</li>}
     </ul>
    </div>}
    <div className="flex gap-2 pt-2">
     <Pressable type="button" className="choice-button flex-1" disabled={busy||detail.busy} onClick={()=>setFinishStep('input')}>Quay lại</Pressable>
     <Pressable type="button" className="primary-button flex-1" disabled={busy||detail.busy} onClick={()=>run('finish',{home:result.home===''?null:Number(result.home),away:result.away===''?null:Number(result.away),note:result.note})}>
      {busy||detail.busy?'Đang lưu trữ…':'Kết thúc & lưu trữ'}
     </Pressable>
    </div>
   </div>}
   {modal==='result'&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();run('result',{reason,home:result.home===''?null:Number(result.home),away:result.away===''?null:Number(result.away),note:result.note});}}>
    <p>Để trống cả hai ô nếu chưa cập nhật kết quả. Trận nội bộ có thể không cần tỷ số.</p><div className="match-v2-grid">{[['home',team.teamName],['away',match.opponent||'Đối thủ / nội bộ']].map(([key,label])=><label className="form-field" key={key}>{label}<input type="number" min="0" max="999" step="1" value={result[key]} onChange={e=>setResult({...result,[key]:e.target.value})}/></label>)}</div>
    <label className="form-field">Ghi chú sau trận<textarea maxLength={4000} value={result.note} onChange={e=>setResult({...result,note:e.target.value})}/></label>
    <label className="form-field">Lý do cập nhật<textarea required minLength={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <details><summary>Kiểm tra danh sách thực tế</summary>{roster.map(p=><p key={p.id}>{p.name} · {actualLabel[actual[p.id]?.status]||'Chưa xác nhận'}</p>)}</details>
    <Pressable className="primary-button w-full" disabled={busy||detail.busy} type="submit">{busy?'Đang lưu…':'Lưu kết quả & lý do'}</Pressable>
   </form>}
   {modal==='actual'&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();try{const changed=Object.entries(entries).map(([id,v])=>({...v,id,arrivedAt:v.status==='present'&&v.arrivedAt?transactionInstant(v.arrivedAt):null}));if(!changed.length){setError('Chọn thành viên cần xác nhận.');return;}run('actual',{entries:changed,reason});}catch(err){setError(err.message);}}}>
    <p>Chỉ ghi nhận điều đã kiểm chứng tại sân. Giờ đến quyết định nhóm đúng giờ/đến muộn; không lấy giờ xin phép làm giờ đến thật.</p>
    {roster.map(p=>{const a=actual[p.id],v=entries[p.id]||{status:a?.status==='ontime'||a?.status==='late'?'present':a?.status||'unknown',arrivedAt:a?.arrivedAt?localTransactionTime(a.arrivedAt):''};const disabled=!data.canManage||!!record.finalized_at||cancelled||p.id===accountId||!!a?.arrivedAt;return <article key={p.id} className="match-actual-row"><strong>{p.name}{p.number!=null?` · #${p.number}`:''}</strong><p className="field-hint">Đăng ký: {registrationLabel[registration[p.id]]||'Chưa phản hồi'} · Thực tế: {actualLabel[a?.status]||'Chưa xác nhận'}</p>
      {disabled?<p>{p.id===accountId&&(!a||a.status==='unknown')?'Cần Chủ đội hoặc Quản trị viên khác xác nhận thực tế cho bạn.':a?.arrivedAt?`Đã ghi nhận giờ đến: ${matchTimeLabel(a.arrivedAt)}. Điều chỉnh có lý do trong Nội quy.`:''}</p>:<><label className="form-field">Thực tế của {p.name}<select value={v.status} onChange={e=>setEntries({...entries,[p.id]:{...v,status:e.target.value}})}><option value="unknown">Chưa xác nhận</option><option value="present">Có mặt · nhập giờ đến</option><option value="absent">Vắng</option></select></label>{v.status==='present'&&<label className="form-field">Giờ đến thực tế của {p.name}<input type="datetime-local" required value={v.arrivedAt} onChange={e=>setEntries({...entries,[p.id]:{...v,arrivedAt:e.target.value}})}/></label>}</>}
     </article>;})}
    {data.canManage&&!record.finalized_at&&!cancelled&&<><label className="form-field">Ghi chú xác nhận<textarea required minLength={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><Pressable type="submit" disabled={busy||detail.busy} className="primary-button w-full">Lưu xác nhận thực tế</Pressable></>}
    {data.canManage&&(record.finalized_at||roster.some(p=>actual[p.id]?.arrivedAt))&&<Pressable className="choice-button" onClick={onOpenRules}>Điều chỉnh có lý do trong Nội quy</Pressable>}
   </form>}
   {modal==='finalize'&&<div className="space-y-4"><p>Chỉ chốt khi đã kiểm tra thực tế tất cả thành viên và xử lý các đơn xin muộn. Không chốt dựa trên đăng ký.</p>{fines.map((p,i)=><article key={p.id+':'+i}><strong>{p.name}</strong><p className="field-hint">Nội quy đến muộn: {formatCurrency(p.fine||0)}{p.ruleVersion?` · bản ${p.ruleVersion}`:''}</p><p className="field-hint">Khoản quỹ tự động theo cấu hình đội: {formatCurrency(Number(p.fundFine||0)+Number(p.unvotedFine||0)+Number(p.absenceFine||0))}</p></article>)}<p className="field-hint">Mức vi phạm theo nội quy và khoản quỹ tự động là hai cấu hình hiện có, không cộng hai số này thành một khoản thu. Giữ nguyên cấu hình của đội. Không tự chốt vi phạm của chính mình; cần quản trị viên khác xử lý nếu có.</p><Pressable className="primary-button w-full" disabled={busy||detail.busy||!readiness.ready} onClick={()=>run('finalize',{})}>Xác nhận chốt điểm danh & vi phạm</Pressable><ul className="match-workflow-blockers" aria-label="Điều kiện chốt điểm danh">{readiness.blockers.map(message=><li key={message}>{message}</li>)}</ul></div>}
   {modal==='cancel'&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();run('cancel',{reason});}}><p>Giữ lịch sử trận, điểm danh và thanh toán. Các lời nhắc cũ không còn phù hợp sẽ dừng.</p><label className="form-field">Lý do hủy<textarea required minLength={3} value={reason} onChange={e=>setReason(e.target.value)}/></label><Pressable type="submit" className="primary-button w-full" disabled={busy||detail.busy}>Xác nhận hủy trận</Pressable></form>}
   {modal==='cost'&&<form className="space-y-4" onSubmit={e=>{e.preventDefault();if(Number(cost.total)>0&&(allocated!==required||!cost.ids.length)){setError('Chọn người đóng và phân bổ đủ tổng cần thu.');return;}run('cost',{total:Number(cost.total),support:Number(cost.support),payerKind:cost.payerKind,payerId:cost.payerId,confirmed:cost.confirmed,allocations,occurredAt:new Date().toISOString()});}}>
    <p>Chỉ nhập chi phí thực tế đã xác nhận. Chi phí đã lưu không được tạo lại; điều chỉnh có lịch sử trong Quỹ đội.</p>
    {[['total','Tổng chi thực tế (đ)'],['support','Phần quỹ hỗ trợ (đ)']].map(([key,label])=><label key={key} className="form-field">{label}<input type="number" min="0" max="1000000000" step="1" required value={cost[key]} onChange={e=>costChange(key,e.target.value)}/></label>)}
    {Number(cost.total)>0&&<><label className="form-field">Ai đã thanh toán chi phí?<select required value={cost.payerKind} onChange={e=>costChange('payerKind',e.target.value)}><option value="">Chọn nguồn đã chi</option><option value="fund">Quỹ đội đã trả</option><option value="member">Thành viên ứng tiền cá nhân</option></select></label>
    {cost.payerKind==='member'&&<label className="form-field">Người đã ứng tiền<select required value={cost.payerId} onChange={e=>costChange('payerId',e.target.value)}><option value="">Chọn người ứng</option>{(fund.data.members.length?fund.data.members:roster).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <fieldset className="fund-member-picker"><legend>Người phải đóng · chọn riêng theo thực tế</legend>{roster.map(p=><label key={p.id}><input type="checkbox" checked={cost.ids.includes(p.id)} onChange={e=>setCost(c=>({...c,ids:e.target.checked?[...c.ids,p.id]:c.ids.filter(id=>id!==p.id),shares:null}))}/>{p.name} · {actualLabel[actual[p.id]?.status]||'Chưa xác nhận'}</label>)}</fieldset>
    <Pressable className="choice-button" type="button" onClick={()=>costChange('shares',null)}>Chia đều lại · phần dư 1đ theo thứ tự mã thành viên</Pressable>
    {allocations.map((p,i)=><label className="form-field" key={p.id}>Phần đóng của {roster.find(m=>m.id===p.id)?.name}<input type="number" min="0" step="1" value={p.amount} onChange={e=>costChange('shares',allocations.map((a,j)=>j===i?{...a,amount:Number(e.target.value)}:a))}/></label>)}
    <p>Cần thu: {formatCurrency(required)} · Đã phân bổ: {formatCurrency(allocated)}</p>
    </>}
    {cost.total!==''&&Number(cost.total)===0&&<p className="field-hint">Xác nhận không phát sinh chi phí: không ghi giao dịch và không tạo khoản thu.</p>}
    <label className="notification-option"><input type="checkbox" required checked={cost.confirmed} onChange={e=>costChange('confirmed',e.target.checked)}/>{cost.total!==''&&Number(cost.total)===0?'Tôi xác nhận trận này không phát sinh chi phí.':'Tôi xác nhận đây là chi phí đã phát sinh; quỹ chỉ ghi chi khi chọn quỹ đã trả.'}</label>
    <Pressable className="primary-button w-full" type="submit" disabled={busy||detail.busy}>{cost.total!==''&&Number(cost.total)===0?'Xác nhận không phát sinh chi phí':'Xác nhận chi phí & tạo khoản thu liên kết'}</Pressable>
   </form>}
   {modal==='charges'&&<>{!finance?.collectionId?<p>Chưa có đợt thu liên kết.</p>:<FundOperations key={finance.collectionId} fund={rowsFund} mode="charges" accountId={accountId} qr={team.treasurerQr}/>}<Pressable className="choice-button" onClick={onOpenFund}>Mở sổ quỹ</Pressable></>}
   {modal==='third'&&<><p>Chọn người tham gia buổi giao lưu riêng; không gộp tiền này vào chi phí sân.</p><FundOperations fund={fund} mode="bills" accountId={accountId} qr={team.treasurerQr} matchId={matchId}/></>}
   {error&&<p role="alert" className="form-error">{error}</p>}
  </ProModal>
 </div>;
}
