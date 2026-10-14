import React, { useState } from "react";
export default function Avatar({ src, name = "", className = "" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (src && failedSrc !== src) return <img src={src} alt="" className={"person-avatar " + className} onError={() => setFailedSrc(src)} />;
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase();
  return <span className={"person-avatar avatar-fallback " + className} aria-hidden="true">{initials || "—"}</span>;
}
