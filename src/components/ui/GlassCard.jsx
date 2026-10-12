import React from 'react';

export default function GlassCard({ 
  children, 
  className = '', 
  glow = false, 
  glowColor = 'primary', 
  hover = true,
  onClick 
}) {
  const glowStyles = glow 
    ? glowColor === 'danger' 
      ? 'border-red-500/30 shadow-[0_0_25px_-5px_rgba(255,76,76,0.25)]' 
      : 'border-emerald-400/30 shadow-[0_0_25px_-5px_rgba(0,255,102,0.25)]'
    : 'border-white/10 shadow-2xl';

  const hoverStyles = hover 
    ? 'hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300' 
    : '';

  return (
    <div 
      onClick={onClick}
      className={`relative backdrop-blur-xl bg-white/[0.06] rounded-2xl border p-4.5 text-white ${glowStyles} ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
}
