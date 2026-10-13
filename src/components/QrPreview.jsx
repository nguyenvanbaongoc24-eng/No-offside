import React, { useState } from "react";
export default function QrPreview({ src, uploaded = false }) {
  const [state, setState] = useState({ src, status: "loading" });
  const status = state.src === src ? state.status : "loading";
  if (!src) return null;
  return (
    <div className="qr-preview">
      {status === "loading" && (
        <p role="status" className="field-hint">
          Đang tải ảnh QR…
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="form-error">
          Không tải được ảnh QR. Kiểm tra kết nối hoặc thay ảnh.
        </p>
      )}
      <img
        key={src}
        src={src}
        alt={
          uploaded
            ? "Ảnh QR do quản trị viên tải lên"
            : "Mã QR tạo từ thông tin tài khoản"
        }
        className="qr-image"
        onLoad={() => setState({ src, status: "ready" })}
        onError={() => setState({ src, status: "error" })}
      />
      {uploaded && (
        <p className="field-hint">
          Ảnh chưa được giải mã hoặc đối chiếu với tài khoản bên dưới. Kiểm tra
          người nhận trong ứng dụng ngân hàng.
        </p>
      )}
    </div>
  );
}
