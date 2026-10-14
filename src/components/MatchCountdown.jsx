import React,{useEffect,useState} from 'react';
export default function MatchCountdown({deadline}) {
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer);},[deadline]);
  const seconds=Math.max(0,Math.floor((new Date(deadline).getTime()-now)/1000));
  if(!Number.isFinite(seconds))return <span>—</span>;
  const pad=n=>String(n).padStart(2,'0');
  return <span>{(seconds>=86400 ? Math.floor(seconds/86400)+' ngày ' : '')+pad(Math.floor(seconds/3600)%24)+':'+pad(Math.floor(seconds/60)%60)+':'+pad(seconds%60)}</span>;
}
