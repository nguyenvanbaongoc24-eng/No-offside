import {useLayerBack} from '../hooks/useLayerBack';
import Pressable from './Pressable';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X, Search } from "lucide-react";
import { loadBanks, searchBanks } from "../lib/banks";
export default function BankPicker({
  value,
  name,
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false),
    [banks, setBanks] = useState([]),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  useLayerBack(open,()=>setOpen(false));
  const trigger = useRef(null),
    input = useRef(null),
    sheet = useRef(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setError("");
    loadBanks()
      .then((result) => {
        if (live) {
          setBanks(result.banks);
          setStale(result.stale);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    input.current?.focus();
    return () => {
      live = false;
    };
  }, [open]);
  const results = useMemo(() => searchBanks(banks, query), [banks, query]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div className="form-field">
      <span id="bank-picker-label">Ngân hàng</span>
      <Pressable
        ref={trigger}
        type="button"
        className="select-control"
        aria-labelledby="bank-picker-label bank-picker-value"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        <span id="bank-picker-value">{name || "Chọn ngân hàng"}</span>
        <ChevronDown size={18} />
      </Pressable>
      {open && (
        <div
          className="simple-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bank-sheet-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (e.key === "Tab") {
              const controls = [
                ...sheet.current.querySelectorAll(
                  "button:not(:disabled),input",
                ),
              ];
              const first = controls[0],
                last = controls.at(-1);
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          <section ref={sheet} className="simple-sheet bank-sheet">
            <header className="section-toolbar">
              <h2 id="bank-sheet-title">Chọn ngân hàng</h2>
              <Pressable
                type="button"
                aria-label="Đóng danh sách ngân hàng"
                onClick={close}
              >
                <X size={20} />
              </Pressable>
            </header>
            <label className="form-field">
              <span className="sr-only">Tìm ngân hàng</span>
              <div className="bank-search">
                <Search size={18} />
                <input
                  ref={input}
                  placeholder="Tên ngân hàng, viết tắt hoặc mã"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </label>
            {loading && <p role="status">Đang tải danh mục VietQR…</p>}
            {stale && (
              <p role="status" className="field-hint">
                Đang dùng danh mục đã lưu. Chưa làm mới được.
              </p>
            )}
            {error && (
              <div role="alert">
                <p>{error}</p>
                <Pressable
                  type="button"
                  className="text-action"
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      const result = await loadBanks(true);
                      setBanks(result.banks);
                      setStale(result.stale);
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Thử lại
                </Pressable>
              </div>
            )}
            <div className="bank-options">
              {results.map((bank) => (
                <Pressable
                  type="button"
                  key={bank.bin}
                  className="menu-row"
                  aria-pressed={value === bank.bin}
                  onClick={() => {
                    onChange(bank);
                    close();
                  }}
                >
                  <span>
                    <strong>{bank.shortName}</strong>
                    <small>{bank.name}</small>
                  </span>
                  {value === bank.bin && <Check size={20} />}
                </Pressable>
              ))}
              {!loading && !error && !results.length && (
                <p className="panel-empty">Không tìm thấy ngân hàng hỗ trợ.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
