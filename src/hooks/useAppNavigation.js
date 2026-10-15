import {useEffect,useRef,useState} from 'react';
const allowed=new Set(['dashboard','lineup','fund','chat','profile','team-settings','create-team','invite-landing','onboarding','personal-fund','governance','appearance','login']);
export function routeState(state){return allowed.has(state?.noOffsideTab)?state.noOffsideTab:'dashboard';}
export function initialRoute(path,state){return ({'/fund':'fund','/governance':'governance','/profile':'profile'})[path] || routeState(state);}
export function internalParent(state){return state?.noOffsideApp==='v2' && allowed.has(state.noOffsideParent?.tab)?state.noOffsideParent:null;}
export function useAppNavigation(){
 const [tab,setTab]=useState(()=>window.location.pathname.startsWith('/invite/')?'invite-landing':initialRoute(window.location.pathname,window.history.state));
 const [direction,setDirection]=useState('tab');const backPending=useRef(false);const current=useRef(tab);current.current=tab;
 useEffect(()=>{
  if(window.history.state?.noOffsideApp!=='v2')window.history.replaceState({...window.history.state,noOffsideTab:tab,noOffsideApp:'v2',noOffsideParent:null},'');
  const pop=e=>{backPending.current=false;const next=routeState(e.state);if(next!==current.current)setDirection('back');setTab(next);};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);
 },[]);
 const navigate=(target,{root=false,replace=false}={})=>{
  if(!allowed.has(target) || (target===current.current && !replace))return;
  backPending.current=false;const previous=window.history.state;
  const parent=!root && !replace?{tab:current.current,detail:previous?.noOffsideDetail || null}:null;
  window.history[replace?'replaceState':'pushState']({noOffsideTab:target,noOffsideApp:'v2',noOffsideParent:parent},'',target==='invite-landing'?undefined:({fund:'/fund',governance:'/governance',profile:'/profile'}[target] || '/'));
  setDirection(root?'tab':'forward');setTab(target);
 };
 const back=(fallback='profile')=>{
  if(backPending.current)return;
  if(internalParent(window.history.state)){backPending.current=true;window.history.back();}
  else navigate(fallback,{replace:true});
 };
 return {tab,navigate,back,direction,hasParent:!!internalParent(window.history.state)};
}
