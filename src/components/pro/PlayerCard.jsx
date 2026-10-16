import React, { useRef, useState, useEffect } from "react";
import { Download, Trophy } from "../icons";
import Pressable from "../Pressable";
import Avatar from "../Avatar";
import { downloadDesign } from "../../lib/pro";
import { imageDataUrl } from "../../lib/images";
import { notify } from "../../lib/feedback";
export default function PlayerCard({ player, teamName, motm = false }) {
  const ref = useRef(null),
    file = useRef(null),
    live = useRef(true),
    [busy, setBusy] = useState(false),
    [portrait, setPortrait] = useState(player.avatar),
    [cutting, setCutting] = useState(false);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);
  return (
    <div className="pro-card-builder">
      <div className="pro-player-card" ref={ref}>
        <div className="pro-player-inner">
          <p className="pro-card-brand">NO OFFSIDE</p>
          <div className="pro-shirt">{player.number || "—"}</div>
          <Avatar src={portrait} name={player.name} />
          <h2>{player.name}</h2>
          <p>
            {player.role || "Cầu thủ"} · {teamName}
          </p>
          {motm && (
            <p className="pro-award">
              <Trophy size={18} />
              Cầu thủ xuất sắc
            </p>
          )}
          <dl>
            {[
              ["goals", "Bàn thắng"],
              ["assists", "Kiến tạo"],
              ["matches", "Trận"],
            ].map(([key, label]) => (
              <div key={key}>
                <dd>{player.stats?.[key] ?? 0}</dd>
                <dt>{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="pro-card-photo-actions">
        <input
          ref={file}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            try {
              setPortrait(await imageDataUrl(e.target.files?.[0]));
            } catch (err) {
              notify(err.message, "error");
            }
          }}
        />
        <Pressable
          className="choice-button"
          disabled={cutting || busy}
          onClick={() => file.current?.click()}
        >
          Chọn ảnh
        </Pressable>
        <Pressable
          className="choice-button"
          disabled={!portrait || cutting || busy}
          onClick={async () => {
            setCutting(true);
            try {
              const { portraitCutout } = await import(
                "../../lib/portraitCutout"
              );
              const result = await portraitCutout(portrait);
              if (live.current) {
                setPortrait(result);
                notify("Đã tách nền trên thiết bị");
              }
            } catch (e) {
              if (live.current)
                notify(e.message || "Không tách được nền.", "error");
            } finally {
              if (live.current) setCutting(false);
            }
          }}
        >
          {cutting ? "Đang tách nền…" : "Tách nền chân dung"}
        </Pressable>
      </div>
      <p className="field-hint">
        Tách nền chạy trên thiết bị; lần đầu cần mạng và tải khoảng 14 MB. Ảnh
        không gửi lên máy chủ và không đổi avatar hồ sơ. Có thể dùng PNG trong
        suốt có sẵn.
      </p>
      <Pressable
        type="button"
        className="primary-button"
        disabled={busy || cutting}
        onClick={async () => {
          setBusy(true);
          try {
            await downloadDesign(ref.current, "No-Offside-" + player.number);
            notify("Đã xuất thẻ cầu thủ");
          } catch (e) {
            notify(e.message, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={18} />
        {busy ? "Đang xuất…" : "Tải thẻ PNG"}
      </Pressable>
    </div>
  );
}
