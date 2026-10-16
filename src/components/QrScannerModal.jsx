import Pressable from './Pressable';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  AlertCircle,
  KeyRound,
  RotateCw,
  Sparkles,
} from "./icons";

export default function QrScannerModal({
  isOpen = true,
  onClose,
  onScanSuccess,
  onSwitchToCode,
}) {
  const [hasCamera, setHasCamera] = useState(true);
  const [permissionError, setPermissionError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function startCamera() {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setHasCamera(false);
          setPermissionError('Trình duyệt chưa hỗ trợ quét camera trực tiếp.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setHasCamera(false);
        setPermissionError(
          'Không thể truy cập camera. Vui lòng cấp quyền hoặc nhập mã Club.',
        );
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (clean && onScanSuccess) {
      onScanSuccess(clean);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Quét mã QR gia nhập</h3>
              <p className="text-xs text-gray-400">Hướng camera về phía mã QR của đội</p>
            </div>
          </div>

          <Pressable
            aria-label="Đóng"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Pressable>
        </div>

        {/* Video stream or Fallback */}
        <div className="mt-4 flex flex-col items-center">
          {hasCamera ? (
            <div className="relative w-full aspect-square max-w-[280px] bg-slate-900 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-md flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400/90 rounded-2xl pointer-events-none animate-pulse" />
              <div className="absolute bottom-3 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-[11px] font-semibold">
                Đang tìm mã QR...
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-3 w-full">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {permissionError || 'Không thể mở camera trên thiết bị.'}
              </p>
            </div>
          )}

          {/* Quick Fallback to Club Code */}
          <div className="w-full mt-5 space-y-3">
            <Pressable
              type="button"
              onClick={() => {
                if (onSwitchToCode) onSwitchToCode();
                else onClose();
              }}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Chuyển sang Nhập mã Club</span>
            </Pressable>

            {/* Manual test code trigger for development / test */}
            <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                placeholder="Hoặc dán link / mã QR..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono uppercase bg-slate-50"
              />
              <Pressable
                type="submit"
                className="h-10 px-4 rounded-xl bg-slate-800 text-white font-bold text-xs shrink-0"
              >
                Nhập
              </Pressable>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
