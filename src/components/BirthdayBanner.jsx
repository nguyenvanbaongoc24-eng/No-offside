import React,{useEffect} from 'react';
import {PartyPopper} from "./icons";
import {useReducedMotion} from 'framer-motion';
export default function BirthdayBanner({members=[],accountId,celebrate=false}){
  const reduced=useReducedMotion();
  const signature=members.map(m=>m.id).join(':');
  useEffect(()=>{
    if(!celebrate || reduced || !members.length)return;
    const key=`no_offside_birthday_fx_${accountId}_${new Date().toDateString()}`;
    try{if(sessionStorage.getItem(key))return;}catch{}
    let live=true;
    import('canvas-confetti').then(({default:confetti})=>{if(!live)return;try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'true');}catch{}confetti({particleCount:44,spread:58,startVelocity:24,origin:{y:0.35},disableForReducedMotion:true,zIndex:180});}).catch(()=>{});
    return()=>{live=false;};
  },[signature,celebrate,reduced,accountId]);
  if(!members.length)return null;
  return <aside className="birthday-banner" aria-label="Sinh nhật hôm nay"><PartyPopper size={24} aria-hidden="true"/><p>Chúc mừng sinh nhật <strong>{members.map(m=>m.name).join(', ')}</strong>!</p></aside>;
}
