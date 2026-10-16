import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Eraser, Move, Undo2 } from "lucide-react";
import Pressable from "../Pressable";
export default function Chalkboard({
  strokes = [],
  onChange,
  editable = false,
  toolbarHost = null,
}) {
  const canvas = useRef(null),
    draft = useRef(null),
    saved = useRef(strokes),
    modeRef = useRef("move"),
    [mode, setMode] = useState("move");
  saved.current = strokes;
  modeRef.current = mode;
  const paint = () => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d"),
      r = c.getBoundingClientRect(),
      ratio = Math.min(devicePixelRatio || 1, 2);
    if (
      c.width !== Math.round(r.width * ratio) ||
      c.height !== Math.round(r.height * ratio)
    ) {
      c.width = Math.round(r.width * ratio);
      c.height = Math.round(r.height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    for (const stroke of [
      ...saved.current,
      ...(draft.current ? [draft.current] : []),
    ]) {
      const points = stroke.points;
      if (!points?.length) continue;
      ctx.strokeStyle = stroke.color === "red" ? "#fb7185" : "#67b7ff";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      points.forEach(([x, y], i) =>
        i
          ? ctx.lineTo(x * r.width, y * r.height)
          : ctx.moveTo(x * r.width, y * r.height),
      );
      ctx.stroke();
      if (points.length > 1) {
        const a = points.at(-2),
          b = points.at(-1),
          angle = Math.atan2((b[1] - a[1]) * r.height, (b[0] - a[0]) * r.width);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(b[0] * r.width, b[1] * r.height);
        ctx.lineTo(
          b[0] * r.width - 11 * Math.cos(angle - 0.45),
          b[1] * r.height - 11 * Math.sin(angle - 0.45),
        );
        ctx.lineTo(
          b[0] * r.width - 11 * Math.cos(angle + 0.45),
          b[1] * r.height - 11 * Math.sin(angle + 0.45),
        );
        ctx.fill();
      }
    }
  };
  useEffect(() => {
    paint();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(paint) : null;
    if (canvas.current) observer?.observe(canvas.current);
    return () => observer?.disconnect();
  }, []);
  useEffect(paint, [strokes]);
  const point = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    ];
  };
  const finish = (e) => {
    if (draft.current?.points.length > 1) {
      onChange([...saved.current, draft.current]);
    }
    draft.current = null;
    paint();
    if (canvas.current?.hasPointerCapture(e.pointerId))
      canvas.current.releasePointerCapture(e.pointerId);
    window.dispatchEvent(
      new CustomEvent("lineup-drag", { detail: { active: false } }),
    );
  };
  return (
    <>
      <canvas
        className={
          "pro-chalkboard " +
          (mode === "move" || !editable ? "is-passive" : "is-drawing")
        }
        ref={canvas}
        aria-label="Nét vẽ chiến thuật"
        onPointerDown={(e) => {
          if (!editable || mode === "move") return;
          e.preventDefault();
          const p = point(e);
          if (mode === "erase") {
            const index = saved.current.findLastIndex((s) =>
              s.points.some(
                (a) => Math.hypot(a[0] - p[0], a[1] - p[1]) < 0.035,
              ),
            );
            if (index >= 0)
              onChange(saved.current.filter((_, i) => i !== index));
            return;
          }
          if (strokes.length >= 80) return;
          canvas.current.setPointerCapture(e.pointerId);
          draft.current = { color: mode, points: [p] };
          window.dispatchEvent(
            new CustomEvent("lineup-drag", { detail: { active: true } }),
          );
          paint();
        }}
        onPointerMove={(e) => {
          if (!draft.current) return;
          const p = point(e),
            last = draft.current.points.at(-1);
          if (
            draft.current.points.length < 400 &&
            Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.003
          ) {
            draft.current.points.push(p);
            paint();
          }
        }}
        onPointerUp={finish}
        onPointerCancel={(e) => {
          draft.current = null;
          finish(e);
        }}
      />
      {editable && toolbarHost && createPortal(
        <div
          className="pro-drawing-tools"
          role="group"
          aria-label="Công cụ sa bàn"
        >
          {[
            ["move", "Di chuyển cầu thủ", Move],
            ["red", "Bút đỏ: tấn công", Pencil],
            ["blue", "Bút xanh: chuyền bóng", Pencil],
            ["erase", "Tẩy nét", Eraser],
          ].map(([id, label, Icon]) => (
            <Pressable
              key={id}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={mode === id}
              className={"ink-" + id}
              onClick={() => setMode(id)}
            >
              <Icon size={19} />
            </Pressable>
          ))}
          <Pressable
            aria-label="Hoàn tác nét"
            disabled={!strokes.length}
            onClick={() => onChange(strokes.slice(0, -1))}
          >
            <Undo2 size={19} />
          </Pressable>
        </div>, toolbarHost
      )}
    </>
  );
}
