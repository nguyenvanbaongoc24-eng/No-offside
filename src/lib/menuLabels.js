// Translate known system labels only; never rewrite team names or chat content.
export const menuLabels = Object.freeze({lineup:'Chiến thuật',board:'Tìm đối',finance:'Sinh tố lúa mạch'});
export function systemNoticeTitle(title) {
  return ({'Khoản chia Hiệp 3':'Khoản chia Sinh Tố Lúa Mạch','Đã cáp kèo':'Đã tìm được đối thủ'})[title] || title;
}
export function thirdChargeLabel(label, kind) {
  return kind==='third' && /^(hiệp 3|hiệp ba)$/iu.test(label || '') ? menuLabels.finance : label;
}
