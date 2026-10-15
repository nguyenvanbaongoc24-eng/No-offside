import Pressable from '../Pressable';
import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'glass', 'ghost'
  size = 'md', // 'sm', 'md', 'lg'
  icon,
  className = '',
  disabled = false,
  active = false,
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none';

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3.5 gap-2.5 font-semibold',
  };

  const variants = {
    primary: active 
      ? 'bg-primary text-slate-950 font-bold shadow-[0_0_20px_rgba(0,255,102,0.4)] scale-[1.02]' 
      : 'bg-primary hover:bg-primary_hover text-slate-950 font-semibold shadow-lg shadow-emerald-500/20',
    secondary: active
      ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10',
    danger: active
      ? 'bg-danger text-white shadow-[0_0_20px_rgba(255,76,76,0.4)] scale-[1.02]'
      : 'bg-danger/20 hover:bg-danger/30 text-rose-300 border border-rose-500/30',
    glass: active
      ? 'bg-white/25 text-white border border-white/40 shadow-lg'
      : 'bg-white/10 hover:bg-white/15 text-white/90 border border-white/15 backdrop-blur-md',
    ghost: active
      ? 'bg-white/10 text-white'
      : 'text-white/70 hover:text-white hover:bg-white/5',
  };

  return (
    <Pressable
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </Pressable>
  );
}
