// Calendar-only dates. Do not construct a UTC timestamp from a birthday.
export function localToday(now=new Date()) {return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function validBirthday(value,today=localToday()) {
 if(value==='')return true;
 if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value>today)return false;
 const [y,m,d]=value.split('-').map(Number);
 if(y<1 || m<1 || m>12 || d<1)return false;
 const leap=y%4===0 && (y%100!==0 || y%400===0);
 return d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
export function birthdayLabel(value){return validBirthday(value) && value ? value.split('-').reverse().join('/') : '';}

export function birthdayPresentation(value,birthdayToday=false,today=localToday()){
 if(!value)return birthdayToday ? {formatted:'Hôm nay',isToday:true,isThisMonth:true} : null;
 if(!validBirthday(value,today))return null;
 return {formatted:birthdayLabel(value),isToday:birthdayToday || value.slice(5)===today.slice(5),isThisMonth:value.slice(5,7)===today.slice(5,7)};
}
