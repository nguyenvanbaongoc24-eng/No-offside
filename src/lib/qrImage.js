export function imageMime(bytes) {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  )
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return "";
}
export async function readQrImage(file) {
  if (!file || file.size > 1024 * 1024 || file.size === 0)
    throw new Error("Chọn ảnh PNG, JPEG hoặc WebP tối đa 1 MB.");
  const mime = imageMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!mime || file.type !== mime)
    throw new Error("Nội dung tệp không đúng định dạng PNG, JPEG hoặc WebP.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      Math.min(image.naturalWidth, image.naturalHeight) < 128 ||
      Math.max(image.naturalWidth, image.naturalHeight) > 4096
    )
      throw new Error("Ảnh cần từ 128 đến 4096 px mỗi chiều.");
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không đọc được ảnh."));
      reader.readAsDataURL(file);
    });
  } catch (error) {
    throw new Error(error.message || "Không giải mã được ảnh.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
