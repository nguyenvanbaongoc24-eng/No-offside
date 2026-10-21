import React,{useEffect,useRef,useState,useId} from 'react';
import {useMatchmaking} from '../hooks/useMatchmaking';
import {estimatedTeamShare,blankConditions,conditionsDraft,normalizeConditions,matchFilter,overlappingItems,sharedResult,MM_LEVELS,MM_VENUES,MM_SHARING,MM_STATUS} from '../lib/matchmaking';
import {localTransactionTime} from '../lib/transactionTime';
import {matchTimeLabel} from '../lib/matchTime';
import {formatCurrency} from '../lib/formatCurrency';
import {notify} from '../lib/feedback';
import Pressable from '../components/Pressable';
import Avatar from '../components/Avatar';
import ProModal from '../components/pro/ProModal';
import {Plus,ArrowLeft,ChevronRight,ChevronDown,Send,Sliders,Check,Swords,Clock,MapPin,Calendar,Users} from '../components/icons';
import '../styles/matchmaking.css';

function Conditions({value,home,away}){
 const t=value||{};
 const perTeam=t.cost!=null&&t.sharing==='split'?Number(t.cost)/2:null;
 return <dl className="mm-conditions">
  {home&&<div><dt>Hai đội</dt><dd>{home} · {away||'Chưa chọn đối'}</dd></div>}
  <div><dt>Lịch dự kiến</dt><dd>{matchTimeLabel(t.kickoff)}<br/>Đến {matchTimeLabel(t.endsAt)} · Sân {t.format}</dd></div>
  <div><dt>Khu vực / trình độ</dt><dd>{t.district} · {MM_LEVELS[t.level]}<small>Tự đánh giá, không phải chứng nhận.</small></dd></div>
  <div><dt>Sân bóng</dt><dd>{MM_VENUES[t.venueStatus]}{t.venue&&` · ${t.venue}`}{t.address&&<small>{t.address}</small>}{t.mapUrl&&/^https:\/\//i.test(t.mapUrl)&&<a href={t.mapUrl} target="_blank" rel="noopener noreferrer">Xem bản đồ</a>}</dd></div>
  <div><dt>Chi phí dự kiến</dt><dd>{t.cost==null?'Chưa xác định':formatCurrency(t.cost)} · {MM_SHARING[t.sharing]}
   {perTeam!=null&&<small>Mỗi đội dự kiến {estimatedTeamShare(t.cost)}</small>}
   {t.sharing==='support'&&t.cost!=null&&<small>Đội đăng hỗ trợ {formatCurrency(t.support)} · phần còn lại {formatCurrency(Math.max(0,Number(t.cost)-Number(t.support||0)))} cần thỏa thuận.</small>}
   <small>Chưa tạo nghĩa vụ đóng tiền hay giao dịch quỹ.</small></dd></div>
  {t.shirt&&<div><dt>Màu áo</dt><dd>{t.shirt}</dd></div>}
  {t.note&&<div><dt>Ghi chú</dt><dd>{t.note}</dd></div>}
  {t.requirements&&<div><dt>Yêu cầu phù hợp</dt><dd>{t.requirements}</dd></div>}
  {t.expiresAt&&<div><dt>Hạn nhận đề nghị</dt><dd>{matchTimeLabel(t.expiresAt)}</dd></div>}
 </dl>;
}
function ConditionsFields({draft,onChange}){
 const field=(key,label,type='text',props={})=><label className="form-field" key={key}>{label}<input type={type} value={draft[key]??''} onChange={e=>onChange({...draft,[key]:e.target.value})} {...props}/></label>;
 const select=(key,label,options)=><label className="form-field" key={key}>{label}<select value={draft[key]} onChange={e=>onChange({...draft,[key]:e.target.value})}>{Object.entries(options).map(([id,text])=><option key={id} value={id}>{text}</option>)}</select></label>;
 return <>
  <fieldset><legend>Thông tin chính</legend><div className="mm-grid">
   {select('format','Loại sân',{5:'Sân 5',7:'Sân 7',11:'Sân 11'})}{select('level','Trình độ tự đánh giá',MM_LEVELS)}
   {field('kickoff','Ngày / giờ bắt đầu','datetime-local',{required:true})}{field('endsAt','Ngày / giờ kết thúc','datetime-local',{required:true})}
  </div>{field('district','Khu vực / Quận','text',{required:true,minLength:2,maxLength:80,placeholder:'Ví dụ: Thủ Đức, TP.HCM'})}
  <p className="field-hint">Giờ Việt Nam. Nếu đá qua đêm, chọn ngày kết thúc tiếp theo. Trình độ do đội tự đánh giá.</p></fieldset>
  <fieldset><legend>Sân bóng</legend>{select('venueStatus','Tình trạng sân',MM_VENUES)}
   {draft.venueStatus!=='unknown'&&<>{field('venue','Tên sân','text',{required:true,maxLength:150})}{field('address','Địa chỉ sân','text',{maxLength:500})}{field('mapUrl','Liên kết bản đồ (tùy chọn)','url',{maxLength:2000,placeholder:'https://…'})}</>}
  </fieldset>
  <details><summary>Chi phí dự kiến & thông tin bổ sung</summary>
   <div className="mm-grid">{field('cost','Tổng tiền sân dự kiến (đ)','number',{min:0,max:1e9,step:1})}{select('sharing','Cách chia chi phí',MM_SHARING)}</div>
   {draft.sharing==='support'&&field('support','Phần đội đăng hỗ trợ (đ)','number',{min:0,max:Number(draft.cost||0),step:1})}
   <p className="field-hint">{draft.cost!==''&&draft.sharing==='split'?`Mỗi đội dự kiến ${estimatedTeamShare(draft.cost)}. `:''}Chỉ là dự kiến, không tạo khoản thu.</p>
   {field('shirt','Màu áo','text',{maxLength:80})}
   <label className="form-field">Ghi chú giao hữu<textarea maxLength={2000} value={draft.note} onChange={e=>onChange({...draft,note:e.target.value})}/></label>
   <label className="form-field">Yêu cầu phù hợp<textarea maxLength={1000} value={draft.requirements} onChange={e=>onChange({...draft,requirements:e.target.value})}/></label>
  </details>
  {field('expiresAt','Hạn nhận đề nghị','datetime-local',{required:true})}
 </>;
}
export default function Matchmaking({team,user,token,demo=false,matches=[],memberships=[],onSwitchTeam,onOpenMatch,onUpdated,onRequireTeam,initialFocus,benefits=false}){
 const teamId=team?.id,accountId=user?.id;
 const tabsId=useId();
 const tabItems=[['discover','Khám phá'],['mine','Tin của đội'],['proposals','Lời đề nghị']];
 const openFilters=()=>{setFilterDraft({...filters});setFilterError('');setFilterOpen(true);};
 const changeFilter=(key,value)=>{setFilterDraft(current=>({...current,[key]:value}));setFilterError('');};
 const {data,loading,error,busy,refresh,mutate}=useMatchmaking({teamId,accountId,token,demo});
 const [tab,setTab]=useState('discover'),[filters,setFilters]=useState({}),[filterOpen,setFilterOpen]=useState(false),[filterDraft,setFilterDraft]=useState({}),[filterError,setFilterError]=useState(''),[history,setHistory]=useState(false);
 const [selected,setSelected]=useState(null),[proposalId,setProposalId]=useState(null),[modal,setModal]=useState(null),[draft,setDraft]=useState(blankConditions),[sourceMatch,setSourceMatch]=useState(''),[originAsset,setOriginAsset]=useState(null);
 const [failure,setFailure]=useState(''),[allowConflict,setAllowConflict]=useState(false),[reason,setReason]=useState(''),[body,setBody]=useState(''),[asset,setAsset]=useState({kind:'filters',name:'',note:''}),[score,setScore]=useState({home:'',away:''});
 const hasFilters=Object.values(filters).some(v=>v!==''&&v!=null);
 const activeScope=useRef(teamId);activeScope.current=teamId;
 const scrollThread=useRef(null),nearBottom=useRef(true),lastMessage=useRef(null);
 const offer=data.offers.find(o=>o.id===selected),proposal=data.proposals.find(c=>c.id===proposalId);
 const currentTerms=data.terms.find(t=>t.challenge_id===proposalId&&t.version===proposal?.current_version);
 const link=data.links.find(l=>l.offer_id===selected);
 const messages=data.messages.filter(m=>m.challenge_id===proposalId),lastId=messages.at(-1)?.id;
 const canManage=data.canManage,pro=data.entitlement.enabled;
 const canUse=kind=>pro&&data.entitlement.features?.includes(kind);
 const owns=offer?.team_id===teamId;
 const openOffer=(id,cid=null)=>{setFailure('');setSelected(id);setProposalId(cid);setAllowConflict(false);};
 useEffect(()=>{activeScope.current=teamId;setSelected(null);setProposalId(null);setModal(null);setFilterOpen(false);setFailure('');setBody('');return()=>{activeScope.current=null;};},[teamId,accountId]);
 useEffect(()=>{if(initialFocus?.offerId){setSelected(initialFocus.offerId);setProposalId(initialFocus.proposalId||null);}},[initialFocus]);
 useEffect(()=>{nearBottom.current=true;lastMessage.current=null;setBody('');},[proposalId]);
 useEffect(()=>{if(lastId&&lastId!==lastMessage.current&&nearBottom.current)scrollThread.current?.scrollTo({top:scrollThread.current.scrollHeight,behavior:'auto'});lastMessage.current=lastId;},[lastId,proposalId]);
 const run=async(action,payload,close=true)=>{const scope=teamId;setFailure('');try{const saved=await mutate(action,payload);if(activeScope.current!==scope)return null;if(close)setModal(null);notify(saved.notificationPending?'Đã lưu; thông báo đang chờ gửi.':'Đã cập nhật Tìm đối.');if(['confirm','cancel'].includes(action)){try{await onUpdated?.();}catch{notify('Đã lưu; mở lại lịch đội để tải dữ liệu mới.');}}return saved;}catch(e){if(activeScope.current===scope)setFailure(e.message);return null;}};
 const startPost=(value=blankConditions(),assetRef=null)=>{setDraft(value);setSourceMatch('');setOriginAsset(assetRef);setAllowConflict(false);setFailure('');setModal('publish');};
 const termsPayload=()=>normalizeConditions(draft);
 let overlaps=[];try{overlaps=overlappingItems(termsPayload(),data.offers.filter(o=>o.team_id===teamId),matches,sourceMatch,selected);}catch{}
 const archiveStatuses=['accepted','declined','withdrawn','closed'];
 const proposalList=data.proposals.filter(p=>history?archiveStatuses.includes(p.status):!archiveStatuses.includes(p.status));
 const visible=data.offers.filter(o=>(tab==='mine'?o.team_id===teamId:o.status==='open'&&o.team_id!==teamId)&&matchFilter(o,filters));
 const activeProposal=proposal&&['pending','discussing','confirming','accepted'].includes(proposal.status);
 const mineConfirmation=proposal&&data.confirmations.some(c=>c.challenge_id===proposal.id&&c.version===proposal.current_version&&c.team_id===teamId);
 const goBack=()=>{setSelected(null);setProposalId(null);setFailure('');};
 const saveAsset=(kind,options={})=>{setAsset({kind,name:'',note:'',...options});setFailure('');setModal('asset');};
 const useAsset=async item=>{const result=await run('asset_use',{assetId:item.id},false);if(!result)return;if(item.kind==='filters')setFilters(result.asset.data);else startPost(conditionsDraft(item.kind==='templates'?result.asset.data:{},true),item);};
 if(benefits&&(loading||error))return <section className="mm-page"><h2>No Offside Pro</h2><p role={error?'alert':'status'}>{error||'Đang tải quyền lợi của đội…'}</p>{error&&<Pressable className="choice-button" onClick={refresh}>Thử lại</Pressable>}</section>;
 if(benefits)return <section className="mm-page mm-benefits"><h2>No Offside Pro</h2><p className="mm-intro">Tìm đối thuận tiện hơn, quản lý đội gọn hơn.</p><section className="mm-card"><h3>Nâng cấp theo đội</h3><p>Quyền lợi thuộc đội. Mỗi người dùng theo quyền hiện có; Pro không cấp thêm quyền quản trị hoặc xem dữ liệu riêng.</p><p><strong>{pro?'Pro đang hoạt động':data.entitlement.plan==='pro'?'Pro đã hết hạn hoặc đang tạm dừng':'Gói miễn phí'}</strong>{data.entitlement.ends_at&&` · Hết hạn ${matchTimeLabel(data.entitlement.ends_at)}`}</p><p className="mm-muted">Chưa mở bán. Chưa tích hợp thanh toán.</p></section>
  <ul className="mm-benefit-list"><li><Check/>Mẫu tin tìm đối: lưu thông tin thường dùng, chọn lại ngày giờ khi đăng.</li><li><Check/>Bộ lọc đã lưu theo người dùng và đội.</li><li><Check/>Đối thủ quen và ghi chú riêng của ban quản lý.</li></ul><p>Đăng tin, gửi đề nghị, trao đổi, xác nhận hai bên và lịch sử hiện miễn phí.</p><p className="mm-muted">Hết Pro vẫn giữ dữ liệu, xem lịch sử và tiếp tục trận đang xử lý.</p>{error&&<p role="alert">{error}</p>}</section>;
 return <div className="mm-page">
  <header className="mm-team-header">
   <div className="mm-team-picker"><Users size={20}/>{memberships.length>1?<><select aria-label="Đổi đội đại diện" value={teamId} disabled={busy} onChange={e=>onSwitchTeam?.(e.target.value)}>{memberships.map(m=><option key={m.teamId||m.team_id||m.id} value={m.teamId||m.team_id||m.id}>{m.teamName||m.team_name||m.name||m.team?.name}</option>)}</select><ChevronDown size={18}/></>:<strong title={team?.teamName}>{team?.teamName||'Chưa chọn đội'}</strong>}</div>
   {canManage?<Pressable className="primary-button mm-post" disabled={busy} onClick={()=>startPost()}><Plus size={18}/>Đăng tìm đối</Pressable>:!teamId&&<Pressable className="primary-button mm-post" onClick={onRequireTeam}>Gia nhập đội</Pressable>}
  </header>
  <div className="mm-heading"><h2>Tìm đối giao hữu</h2><p>Chọn kèo phù hợp với đội bạn.</p></div>
  <div className="mm-tabs" role="tablist" aria-label="Mục Tìm đối">{tabItems.map(([id,label],index)=><Pressable role="tab" id={tabsId+'-'+id} aria-controls={tabsId+'-panel'} aria-selected={tab===id} tabIndex={tab===id?0:-1} key={id} onKeyDown={e=>{const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();setTab(tabItems[next][0]);goBack();e.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();}}} onClick={()=>{setTab(id);goBack();}}>{label}</Pressable>)}</div>
  <div key={tab} role="tabpanel" id={tabsId+'-panel'} aria-labelledby={tabsId+'-'+tab} className="mm-panel" tabIndex={0}>
  {error&&<div role="alert" className="mm-error">{error}<Pressable className="choice-button" onClick={refresh}>Thử lại</Pressable></div>}
  {!modal&&failure&&<p role="alert" className="mm-error">{failure}</p>}
  {loading&&<p role="status" className="mm-empty">Đang tải tin tìm đối…</p>}
  {!loading&&!error&&selected&&!offer&&<section className="mm-card"><p>Tin không còn khả dụng hoặc bạn không có quyền xem. Chuyển đúng đội đại diện rồi tải lại.</p><Pressable className="choice-button" onClick={goBack}>Về danh sách</Pressable></section>}
  {!loading&&offer?<section className="mm-detail">
   <Pressable className="choice-button" onClick={goBack}><ArrowLeft size={18}/>Về danh sách</Pressable>
   <article className="mm-card"><header className="mm-offer-head"><Avatar name={offer.teamName} src={offer.logo}/><div><h2>{offer.teamName}</h2><p>{MM_STATUS[offer.status]}</p></div></header>
    <Conditions value={currentTerms?.conditions||offer.conditions} home={offer.teamName} away={proposal?.teamName}/>
    {!teamId&&<Pressable className="primary-button" onClick={onRequireTeam}>Tạo / gia nhập đội để gửi đề nghị</Pressable>}
    {teamId&&!canManage&&<p className="mm-muted">Bạn được xem tin. Chủ đội hoặc người quản lý trận gửi đề nghị và xác nhận.</p>}
    {canManage&&!owns&&!proposal&&offer.status==='open'&&!data.proposals.some(p=>p.offer_id===offer.id&&p.team_id===teamId)&&<Pressable className="primary-button" disabled={busy} onClick={async()=>{const saved=await run('propose',{offerId:offer.id},false);if(saved)setProposalId(saved.proposalId);}}>Gửi đề nghị · {team.teamName}</Pressable>}
    {canManage&&!owns&&!proposal&&data.proposals.filter(p=>p.offer_id===offer.id&&p.team_id===teamId).map(p=><Pressable className="choice-button" key={p.id} onClick={()=>setProposalId(p.id)}>Mở đề nghị · {MM_STATUS[p.status]}</Pressable>)}
    {canManage&&owns&&!proposal&&data.proposals.filter(p=>p.offer_id===offer.id).map(p=><Pressable className="mm-row" key={p.id} onClick={()=>setProposalId(p.id)}><span>{p.teamName}<small>{MM_STATUS[p.status]}</small></span><ChevronRight size={20}/></Pressable>)}
    {canManage&&owns&&<div className="mm-actions"><Pressable className="choice-button" disabled={!canUse('templates')} onClick={()=>saveAsset('templates',{offerId:offer.id,name:'Mẫu '+offer.district})}>Lưu mẫu tin</Pressable>{!link&&['open','confirming'].includes(offer.status)&&<Pressable className="choice-button danger-action" onClick={()=>{setReason('');setModal('cancel');}}>Hủy tin</Pressable>}</div>}
    {canManage&&!owns&&<Pressable className="choice-button" disabled={!canUse('opponents')} onClick={()=>saveAsset('opponents',{opponentId:offer.team_id,name:offer.teamName})}>Lưu đối thủ quen</Pressable>}
   </article>
   {proposal&&canManage&&<>
    <section className="mm-card"><h3>Điều kiện & xác nhận hai bên</h3><p>Đề nghị: {MM_STATUS[proposal.status]} · Phiên bản {proposal.current_version||'cũ'}</p>{proposal.closed_reason&&<p>{proposal.closed_reason}</p>}
     {currentTerms&&<><p className="mm-muted">Mỗi đội xác nhận cùng một phiên bản. Đổi điều kiện sẽ yêu cầu cả hai xác nhận lại.</p><div className="mm-confirmations">{[offer.team_id,proposal.team_id].map(id=><p key={id}><Check size={17}/>{id===offer.team_id?offer.teamName:proposal.teamName}: {data.confirmations.some(c=>c.challenge_id===proposal.id&&c.version===proposal.current_version&&c.team_id===id)?'Đã xác nhận':'Chưa xác nhận'}</p>)}</div></>}
     {activeProposal&&currentTerms&&<div className="mm-actions">
      {proposal.status!=='accepted'&&<><label className="mm-check"><input type="checkbox" checked={allowConflict} onChange={e=>setAllowConflict(e.target.checked)}/>Tôi đã kiểm tra lịch đội; chấp nhận nếu khung giờ chồng lấn.</label><Pressable className="primary-button" disabled={busy||mineConfirmation} onClick={()=>{setFailure('');setModal('confirm');}}>{mineConfirmation?'Đội bạn đã xác nhận':`Xác nhận điều kiện v${proposal.current_version}`}</Pressable></>}
      <Pressable className="choice-button" disabled={busy} onClick={()=>{setDraft(conditionsDraft(currentTerms.conditions));setAllowConflict(false);setModal('terms');setFailure('');}}>Đề xuất điều kiện mới</Pressable>
     </div>}
     {!link&&['pending','discussing','confirming'].includes(proposal.status)&&<Pressable className="choice-button danger-action" onClick={()=>{setReason('');setModal(owns?'decline':'withdraw');}}>{owns?'Từ chối đề nghị':'Rút đề nghị'}</Pressable>}
     {!link&&['withdrawn','declined'].includes(proposal.status)&&!owns&&offer.status==='open'&&<Pressable className="choice-button" disabled={busy} onClick={async()=>{const result=await run('propose',{offerId:offer.id},false);if(result)setProposalId(result.proposalId);}}>Gửi lại đề nghị mới · giữ lịch sử cũ</Pressable>}
    </section>
    <section className="mm-card"><h3>Trao đổi riêng · {offer.teamName} & {proposal.teamName}</h3><p className="mm-muted">Chỉ đại diện có quyền của hai đội được đọc. Nội dung chat nội bộ và quỹ riêng không được chia sẻ.</p>
     <div className="mm-thread" role="log" aria-label="Trao đổi giao hữu" ref={scrollThread} onScroll={e=>{const n=e.currentTarget;nearBottom.current=n.scrollHeight-n.scrollTop-n.clientHeight<80;}}>
      {messages.map(m=><article className={m.team_id===teamId?'mm-message is-own':'mm-message'} key={m.id}><strong>{m.team_id===offer.team_id?offer.teamName:proposal.teamName}</strong><p>{m.body}</p><time>{matchTimeLabel(m.created_at)}</time></article>)}
      {!messages.length&&<p className="mm-muted">Chưa có trao đổi. Gửi lời chào để thống nhất điều kiện trận.</p>}
     </div>
     {activeProposal&&<form className="mm-composer" onSubmit={async e=>{e.preventDefault();const sent=body;if(await run('message',{proposalId,body:sent},false)){setBody(current=>current===sent?'':current);nearBottom.current=true;}}}><label className="sr-only" htmlFor="mm-message-input">Tin nhắn giao hữu</label><textarea id="mm-message-input" placeholder="Trao đổi với đại diện đội…" required maxLength={2000} value={body} onChange={e=>setBody(e.target.value)}/><Pressable aria-label="Gửi tin nhắn giao hữu" type="submit" className="primary-button" disabled={busy||!body.trim()}><Send size={20}/></Pressable></form>}
    </section>
    {link&&<section className="mm-card"><h3>Trận đã liên kết</h3><p>Mỗi đội quản lý điểm danh, chiến thuật, vi phạm và quỹ của mình.</p><Pressable className="primary-button" onClick={()=>onOpenMatch?.(teamId===link.home_team?link.home_match:link.away_match)}>Mở trận của {team.teamName}</Pressable>
     <p>{sharedResult(data.reports,offer.id)}</p>{data.reports.filter(r=>r.offer_id===offer.id).map(r=><p key={r.team_id}>{r.team_id===offer.team_id?offer.teamName:proposal.teamName} báo cáo: {r.home} – {r.away} (theo phía đội báo cáo)</p>)}
     {!link.cancelled_at&&<div className="mm-actions"><Pressable className="choice-button" onClick={()=>{setScore({home:'',away:''});setModal('report');}}>Báo cáo kết quả đã thi đấu</Pressable><Pressable className="choice-button danger-action" onClick={()=>{setReason('');setModal('cancel');}}>Hủy giao hữu hai đội</Pressable></div>}
     {link.cancelled_at&&<p>Đã hủy: {link.cancel_reason} · {matchTimeLabel(link.cancelled_at)}</p>}
    </section>}
    <details className="mm-card"><summary>Lịch sử đề nghị & điều kiện</summary>{data.terms.filter(t=>t.challenge_id===proposal.id).map(t=><details key={t.id}><summary>Điều kiện v{t.version} · {matchTimeLabel(t.created_at)}</summary><Conditions value={t.conditions}/></details>)}{data.history.filter(e=>e.challenge_id===proposal.id).map(e=><p className="mm-muted" key={e.id}>{({propose:'Gửi đề nghị',confirm:'Xác nhận điều kiện',terms:'Đổi điều kiện',withdraw:'Rút đề nghị',decline:'Từ chối',cancel:'Hủy giao hữu',message:'Gửi tin nhắn',report:'Báo cáo kết quả'})[e.action]||e.action} · {matchTimeLabel(e.created_at)}</p>)}</details>
   </>}
  </section>:!loading&&!selected&&(!error||data.offers.length>0||data.proposals.length>0)&&<>
   {tab!=='proposals'&&<>
   <section className="mm-filter-bar" aria-label="Bộ lọc tìm đối">
    <Pressable className="mm-area-button" onClick={openFilters} aria-haspopup="dialog"><MapPin size={20}/><span>{filters.district||'Chọn khu vực'}</span><ChevronDown size={18}/></Pressable>
    <div className="mm-filter-chips">
     <Pressable onClick={openFilters} aria-haspopup="dialog" title={filters.day?filters.day.split('-').reverse().join('/'):undefined} aria-label={filters.day?'Ngày đá '+filters.day.split('-').reverse().join('/'):undefined}><Calendar size={18}/><span>{filters.day?filters.day.split('-').slice(1).reverse().join('/'):'Ngày đá'}</span></Pressable>
     <Pressable onClick={openFilters} aria-haspopup="dialog"><Users size={18}/><span>{filters.format?'Sân '+filters.format:'Loại sân'}</span></Pressable>
     <Pressable onClick={openFilters} aria-haspopup="dialog"><Sliders size={18}/><span>Bộ lọc{hasFilters?' •':''}</span></Pressable>
    </div>
    {hasFilters&&<div className="mm-filter-summary"><span>Đang lọc{filters.from||filters.to?` · ${filters.from||'00:00'}–${filters.to||'23:59'}`:''}</span><Pressable onClick={()=>setFilters({})}>Xóa bộ lọc</Pressable></div>}
   </section>
   <header className="mm-results-heading"><h3>{tab==='mine'?'Tin của đội':'Kèo phù hợp'}</h3><span>{visible.length} kết quả</span></header>
   <div className="mm-feed">{visible.map(o=><article className="mm-card mm-match-card" key={o.id}>
    <div className="mm-card-tags"><span className="mm-status">{MM_STATUS[o.status]}</span><span>Sân {o.format} · {MM_LEVELS[o.level]}</span></div>
    <header className="mm-offer-head"><Avatar name={o.teamName} src={o.logo}/><h3>{o.teamName}</h3></header>
    <p className="mm-card-line"><Calendar size={20}/><strong>{matchTimeLabel(o.kickoff)}{o.endsAt&&<> – {localTransactionTime(o.endsAt).slice(0,10)!==localTransactionTime(o.kickoff).slice(0,10)?matchTimeLabel(o.endsAt):localTransactionTime(o.endsAt).slice(11,16)}</>}</strong></p>
    <p className="mm-card-line"><MapPin size={20}/><span>{o.conditions.venue||MM_VENUES[o.conditions.venueStatus]}<small>{o.district} · {MM_VENUES[o.conditions.venueStatus]}</small></span></p>
    <p className="mm-muted">{o.conditions.cost==null?'Chi phí dự kiến: thỏa thuận':o.conditions.sharing==='split'?`Dự kiến ${estimatedTeamShare(o.conditions.cost)}/đội`:`Tổng dự kiến ${formatCurrency(o.conditions.cost)} · ${MM_SHARING[o.conditions.sharing]}`}</p>
    {o.created_at&&<small>Đăng {matchTimeLabel(o.created_at)}</small>}
    <Pressable className="choice-button mm-view-offer" onClick={()=>openOffer(o.id)}>Xem kèo<ChevronRight size={18}/></Pressable>
   </article>)}</div>
   {!visible.length&&<section className="mm-empty"><Swords/><h3>{tab==='mine'?'Đội chưa có tin phù hợp':'Chưa có kèo phù hợp'}</h3><p>{hasFilters?'Thử khu vực, ngày khác hoặc xóa bộ lọc.':tab==='mine'?'Tin đã đăng của đội sẽ xuất hiện tại đây.':'Các tin đang tìm đối sẽ xuất hiện tại đây. Hãy quay lại sau hoặc đăng tin cho đội.'}</p>{hasFilters&&<Pressable className="choice-button" onClick={()=>setFilters({})}>Xóa bộ lọc</Pressable>}</section>}
   </>}
   {tab==='proposals'&&<><div className="mm-actions"><Pressable className="choice-button" aria-pressed={!history} onClick={()=>setHistory(false)}>Đang xử lý</Pressable><Pressable className="choice-button" aria-pressed={history} onClick={()=>setHistory(true)}><Clock size={18}/>Lịch sử ghép trận</Pressable></div>
    {!canManage&&<p className="mm-empty">Chỉ Chủ đội hoặc người quản lý trận xem đề nghị và trao đổi riêng. Hãy chuyển sang đội bạn có quyền đại diện.</p>}
    {canManage&&proposalList.map(p=><Pressable className="mm-row mm-card" key={p.id} onClick={()=>openOffer(p.offer_id,p.id)}><span><strong>{p.offerTeam===teamId?p.teamName:p.offerTeamName}</strong><small>{p.offerTeam===teamId?'Đề nghị nhận':'Đề nghị gửi'} · {MM_STATUS[p.status]} · v{p.current_version}</small><small>{p.closed_reason}</small></span><ChevronRight size={20}/></Pressable>)}
    {canManage&&!proposalList.length&&<p className="mm-empty">Chưa có {history?'lịch sử ghép trận':'đề nghị đang xử lý'}. Mở Khám phá để tìm đội phù hợp.</p>}
   </>}
   {teamId&&<details className="mm-card mm-utilities"><summary>Tiện ích của đội</summary><Pressable className="choice-button" disabled={!canUse('filters')} onClick={()=>saveAsset('filters',{name:'Bộ lọc của tôi'})}>Lưu bộ lọc hiện tại</Pressable><p className="mm-muted">{pro?'Pro đang hoạt động.':'Chưa có quyền Pro. Dữ liệu đã lưu vẫn xem được; đăng tin và chốt trận vẫn miễn phí.'}</p>{data.assets.map(item=><article className="mm-saved" key={item.id}><div><strong>{item.name}</strong><small>{({templates:'Mẫu tin',filters:'Bộ lọc',opponents:'Đối thủ quen'})[item.kind]}</small>{item.kind==='opponents'&&<><p>{item.data.note}</p><details><summary>Lịch sử giao hữu chung</summary>{data.links.filter(l=>l.home_team===item.data.teamId||l.away_team===item.data.teamId).map(l=><Pressable key={l.offer_id} className="choice-button" onClick={()=>openOffer(l.offer_id,l.challenge_id)}>Mở giao hữu · {matchTimeLabel(l.created_at)}</Pressable>)}{!data.links.some(l=>l.home_team===item.data.teamId||l.away_team===item.data.teamId)&&<p className="mm-muted">Chưa có giao hữu đã liên kết giữa hai đội trong app.</p>}</details></>}</div><div className="mm-actions"><Pressable className="choice-button" disabled={!canUse(item.kind)||(item.kind!=='filters'&&!canManage)} onClick={()=>useAsset(item)}>{item.kind==='opponents'?'Mời trận mới':'Sử dụng'}</Pressable>{item.kind==='opponents'&&canManage&&<Pressable className="choice-button" disabled={!canUse(item.kind)} onClick={()=>saveAsset('opponents',{...item.data,opponentId:item.data.teamId,name:item.name,assetId:item.id})}>Sửa ghi chú</Pressable>}</div></article>)}{!data.assets.length&&<p className="mm-muted">Chưa có mẫu tin, bộ lọc hoặc đối thủ quen đã lưu.</p>}</details>}
  </>}
  </div>
  <ProModal open={filterOpen} className="mm-sheet" title="Bộ lọc tìm đối" onClose={()=>setFilterOpen(false)}>
   <form className="mm-form" onSubmit={e=>{e.preventDefault();if(filterDraft.from&&filterDraft.to&&filterDraft.to<=filterDraft.from){setFilterError('Giờ kết thúc phải sau giờ bắt đầu.');return;}setFilters({...filterDraft,district:filterDraft.district?.trim()||''});setFilterOpen(false);}}>
    <label className="form-field">Khu vực<input placeholder="Quận / thành phố" value={filterDraft.district||''} maxLength={80} onChange={e=>changeFilter('district',e.target.value)}/><small className="mm-muted">Chọn thủ công, không cần cấp quyền vị trí.</small></label>
    <div className="mm-grid">
     <label className="form-field">Ngày đá<input type="date" value={filterDraft.day||''} onInput={e=>changeFilter('day',e.currentTarget.value)} onChange={e=>changeFilter('day',e.target.value)}/></label>
     <label className="form-field">Loại sân<select value={filterDraft.format||''} onChange={e=>changeFilter('format',e.target.value)}><option value="">Tất cả</option>{[5,7,11].map(v=><option key={v} value={v}>Sân {v}</option>)}</select></label>
     <label className="form-field">Từ giờ<input type="time" value={filterDraft.from||''} aria-invalid={!!filterError} aria-describedby={filterError?'mm-filter-error':undefined} onInput={e=>changeFilter('from',e.currentTarget.value)} onChange={e=>changeFilter('from',e.target.value)}/></label>
     <label className="form-field">Đến giờ<input type="time" value={filterDraft.to||''} aria-invalid={!!filterError} aria-describedby={filterError?'mm-filter-error':undefined} onInput={e=>changeFilter('to',e.currentTarget.value)} onChange={e=>changeFilter('to',e.target.value)}/></label>
     <label className="form-field">Tình trạng sân<select value={filterDraft.venueStatus||''} onChange={e=>changeFilter('venueStatus',e.target.value)}><option value="">Tất cả</option>{Object.entries(MM_VENUES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
     <label className="form-field">Trình độ<select value={filterDraft.level||''} onChange={e=>changeFilter('level',e.target.value)}><option value="">Tất cả</option>{Object.entries(MM_LEVELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    </div>
    <label className="form-field">Tổng dự kiến tối đa (đ)<input type="number" min="0" max="1000000000" step="1" value={filterDraft.maxCost??''} onChange={e=>changeFilter('maxCost',e.target.value)}/></label>
    {filterError&&<p id="mm-filter-error" role="alert" className="mm-error">{filterError}</p>}
    <div className="mm-filter-footer"><Pressable type="button" className="choice-button" onClick={()=>{setFilterDraft({});setFilterError('');}}>Đặt lại</Pressable><Pressable type="submit" className="primary-button">Áp dụng</Pressable></div>
   </form>
  </ProModal>
  <ProModal className="mm-sheet" open={!!modal} title={({publish:'Đăng tìm đối',terms:'Đề xuất điều kiện mới',confirm:'Xác nhận điều kiện trận',asset:'Lưu tiện ích của đội',report:'Báo cáo kết quả',cancel:'Hủy tin / giao hữu',withdraw:'Rút đề nghị',decline:'Từ chối đề nghị'})[modal]||''} busy={busy} onClose={()=>setModal(null)}>
   {['publish','terms'].includes(modal)&&<form className="mm-form" onSubmit={async e=>{e.preventDefault();try{const normalized=termsPayload();const result=await run(modal==='publish'?'publish':'terms',modal==='publish'?{conditions:normalized,sourceMatch:sourceMatch||null,allowConflict,...(originAsset?{[originAsset.kind==='templates'?'templateId':'familiarId']:originAsset.id}:{})}:{proposalId,version:proposal.current_version,conditions:normalized});if(result?.offerId)openOffer(result.offerId,result.proposalId);}catch(e){setFailure(e.message);}}}>
    <p className="mm-representing">Đang đại diện: <strong>{team?.teamName}</strong>{originAsset?.kind==='opponents'&&<> · Mời {originAsset.name}. Đội kia vẫn cần gửi đề nghị và xác nhận.</>}</p>
    {modal==='publish'&&<label className="form-field">Lấy thông tin từ trận sắp tới (tùy chọn)<select value={sourceMatch} onChange={e=>{setSourceMatch(e.target.value);setOriginAsset(null);const m=matches.find(m=>m.id===e.target.value);if(m)setDraft(conditionsDraft({...blankConditions(),kickoff:m.datetime,endsAt:m.endsAt||new Date(Date.parse(m.datetime)+54e5).toISOString(),expiresAt:m.deadline,venue:m.venue||'',venueStatus:m.venue?'planned':'unknown',address:m.address||'',mapUrl:m.mapUrl||'',format:m.format||7,note:''}));}}><option value="">Tạo tin độc lập</option>{matches.filter(m=>m.status!=='completed'&&!m.sourceOffer&&!m.archivedAt&&!m.cancelledAt&&Date.parse(m.datetime)>Date.now()).map(m=><option key={m.id} value={m.id}>{m.title} · {matchTimeLabel(m.datetime)}</option>)}</select><span className="field-hint">Đăng tin chưa tạo trận mới. Chỉ lấy lịch/sân; không sao chép ghi chú nội bộ, chiến thuật hoặc sổ quỹ. Khi chốt, cập nhật trận đã chọn.</span></label>}
    <ConditionsFields draft={draft} onChange={value=>{setDraft(value);setAllowConflict(false);}}/>
    {overlaps.length>0&&<div className="mm-warning"><p>Khung giờ chồng lấn: {overlaps.join(' · ')}</p><label className="mm-check"><input type="checkbox" checked={allowConflict} onChange={e=>setAllowConflict(e.target.checked)}/>Tôi đã kiểm tra và vẫn muốn tiếp tục.</label></div>}
    <Pressable type="submit" className="primary-button" disabled={busy||overlaps.length>0&&!allowConflict}>{modal==='publish'?'Đăng tìm đối':'Lưu phiên bản mới · yêu cầu cả hai xác nhận lại'}</Pressable>
   </form>}
   {modal==='confirm'&&<div className="mm-form"><p className="mm-representing">Đang đại diện: <strong>{team?.teamName}</strong> · Phiên bản {proposal?.current_version}</p><Conditions value={currentTerms?.conditions} home={offer?.teamName} away={proposal?.teamName}/><p>Xác nhận chỉ có hiệu lực cho phiên bản này. Trận chỉ chốt khi cả hai đội đồng ý.</p><Pressable className="primary-button" disabled={busy} onClick={()=>run('confirm',{proposalId,version:proposal.current_version,allowConflict})}>Đồng ý điều kiện v{proposal?.current_version}</Pressable></div>}
   {['cancel','withdraw','decline'].includes(modal)&&<form className="mm-form" onSubmit={e=>{e.preventDefault();run(modal,{offerId:selected,...(proposalId?{proposalId}:{}),reason});}}><p>Đang đại diện {team?.teamName}. Lịch sử trao đổi và giao dịch đã phát sinh được giữ lại. Hủy giao hữu đã chốt cập nhật cả hai đội.</p><label className="form-field">Lý do<textarea required minLength={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><Pressable type="submit" className="primary-button" disabled={busy}>Xác nhận {modal==='cancel'?'hủy':modal==='withdraw'?'rút đề nghị':'từ chối'}</Pressable></form>}
   {modal==='asset'&&<form className="mm-form" onSubmit={e=>{e.preventDefault();run('asset_save',{...asset,data:asset.kind==='filters'?filters:undefined});}}><label className="form-field">Tên dễ nhận biết<input required maxLength={80} value={asset.name} onChange={e=>setAsset({...asset,name:e.target.value})}/></label>{asset.kind==='opponents'&&<label className="form-field">Ghi chú riêng của ban quản lý<textarea maxLength={2000} value={asset.note} onChange={e=>setAsset({...asset,note:e.target.value})}/></label>}<p className="mm-muted">Mẫu tin không sao chép ngày giờ, đề nghị, chat hoặc xác nhận. Bộ lọc chỉ thuộc người lưu trong đội này.</p><Pressable type="submit" className="primary-button" disabled={busy}>Lưu</Pressable></form>}
   {modal==='report'&&<form className="mm-form" onSubmit={e=>{e.preventDefault();run('report',{proposalId,home:Number(score.home),away:Number(score.away),played:true});}}><p>Kết thúc trận trong module Trận đấu trước. Nhập tỷ số theo phía đội bạn. Báo cáo này không ghi đè kết quả của đối thủ.</p><div className="mm-grid">{[['home',team?.teamName],['away',teamId===offer?.team_id?proposal?.teamName:offer?.teamName]].map(([key,label])=><label className="form-field" key={key}>{label}<input type="number" required min={0} max={999} step={1} value={score[key]} onChange={e=>setScore({...score,[key]:e.target.value})}/></label>)}</div><label className="mm-check"><input type="checkbox" required/>Tôi xác nhận đội đã thi đấu và đã kiểm tra tỷ số.</label><Pressable className="primary-button" type="submit" disabled={busy}>Gửi báo cáo của đội</Pressable></form>}
   {modal&&failure&&<p role="alert" className="mm-error">{failure}</p>}
  </ProModal>
 </div>;
}
