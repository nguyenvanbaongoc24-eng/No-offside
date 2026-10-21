import {localTransactionTime,transactionInstant} from './transactionTime.js';
import {formatCurrency} from './formatCurrency.js';
export function estimatedTeamShare(cost){return Number(cost)%2?`${formatCurrency(Math.floor(Number(cost)/2))}–${formatCurrency(Math.ceil(Number(cost)/2))} (cần thống nhất phần lẻ)`:formatCurrency(Number(cost)/2);}
export const MM_LEVELS={beginner:'Mới chơi',regular:'Phong trào',advanced:'Khá / nâng cao'};
export const MM_VENUES={booked:'Đã có sân',planned:'Dự kiến sân',unknown:'Chưa có sân'};
export const MM_SHARING={split:'Chia đều hai đội',support:'Đội đăng hỗ trợ',agreement:'Thỏa thuận',loser:'Đội thua trả sân (tin cũ)'};
export const MM_STATUS={open:'Đang tìm đối',confirming:'Chờ xác nhận',matched:'Đã chốt',closed:'Đã đóng',cancelled:'Đã hủy',expired:'Hết hạn',pending:'Đã gửi',discussing:'Đang trao đổi',accepted:'Đã chấp nhận',declined:'Đã từ chối',withdrawn:'Đã rút'};
export const blankConditions=()=>({district:'',format:7,level:'regular',kickoff:'',endsAt:'',expiresAt:'',venueStatus:'unknown',venue:'',address:'',mapUrl:'',cost:'',sharing:'split',support:0,shirt:'',note:'',requirements:''});
export function conditionsDraft(data={},clearDates=false){const result={...blankConditions(),...data};for(const key of ['kickoff','endsAt','expiresAt'])result[key]=clearDates?'':data[key]?localTransactionTime(data[key]):'';return result;}
export function normalizeConditions(form,now=Date.now()){
 const result={...form,format:Number(form.format),support:Number(form.support||0),cost:form.cost===''||form.cost==null?null:Number(form.cost)};
 for(const key of ['kickoff','endsAt','expiresAt'])result[key]=transactionInstant(form[key]);
 if(Date.parse(result.kickoff)<=now||Date.parse(result.endsAt)<=Date.parse(result.kickoff)||Date.parse(result.endsAt)-Date.parse(result.kickoff)>864e5||Date.parse(result.expiresAt)>Date.parse(result.kickoff)||Date.parse(result.expiresAt)<=now)throw Error('Chọn giờ đá tương lai, kết thúc trong 24 giờ và hạn nhận đề nghị trước giờ đá.');
 if(!MM_LEVELS[result.level]||![5,7,11].includes(result.format)||result.district.trim().length<2)throw Error('Chọn khu vực, loại sân và trình độ.');
 if(result.venueStatus!=='unknown'&&result.venue.trim().length<2)throw Error('Nhập tên sân đã có hoặc dự kiến.');
 if(result.mapUrl&&!/^https:\/\//i.test(result.mapUrl))throw Error('Bản đồ phải dùng liên kết HTTPS.');
 if(result.cost!==null&&(!Number.isSafeInteger(result.cost)||result.cost<0||result.cost>1e9)||!Number.isSafeInteger(result.support)||result.support<0||result.support>(result.cost||0))throw Error('Chi phí là số nguyên không âm; hỗ trợ không vượt tổng dự kiến.');
 return result;
}
export function matchFilter(offer,filters){
 const t=offer.conditions||{},local=localTransactionTime(offer.kickoff),time=local.slice(11,16);
 return (!filters.district||offer.district.toLocaleLowerCase('vi').includes(filters.district.toLocaleLowerCase('vi')))&&(!filters.day||local.slice(0,10)===filters.day)&&(!filters.from||time>=filters.from)&&(!filters.to||time<=filters.to)&&(!filters.format||Number(offer.format)===Number(filters.format))&&(!filters.venueStatus||t.venueStatus===filters.venueStatus)&&(!filters.level||offer.level===filters.level)&&(!filters.maxCost||(t.cost!=null&&Number(t.cost)<=Number(filters.maxCost)));
}
export function overlappingItems(terms,offers,matches,sourceMatch,offerId){
 const overlaps=(start,end)=>Date.parse(start)<Date.parse(terms.endsAt)&&Date.parse(end||new Date(Date.parse(start)+54e5).toISOString())>Date.parse(terms.kickoff);
 return [...offers.filter(o=>o.id!==offerId&&['open','confirming'].includes(o.status)&&overlaps(o.kickoff,o.endsAt)).map(o=>o.teamName||'Tin đang tìm đối'),...matches.filter(m=>m.id!==sourceMatch&&(!offerId||m.sourceOffer!==offerId)&&!m.cancelledAt&&!m.archivedAt&&!['completed','archived','cancelled','canceled'].includes(m.status)&&overlaps(m.datetime,m.endsAt)).map(m=>m.title||'Trận đã có lịch')];
}
export function sharedResult(reports,offerId){const rows=reports.filter(r=>r.offer_id===offerId&&r.played);return rows.length<2?'Chờ hai đội xác nhận thi đấu':rows[0].home===rows[1].away&&rows[0].away===rows[1].home?'Hai đội đã xác nhận thi đấu':'Kết quả chưa thống nhất';}
