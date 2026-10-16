export function detectMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 255 &&
    buffer[1] === 216 &&
    buffer[2] === 255
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImage(buffer, mime) {
  if (
    !Buffer.isBuffer(buffer) ||
    !buffer.length ||
    buffer.length > 2 * 1024 * 1024
  )
    return false;
  if (mime === "image/png")
    return (
      buffer.length >= 33 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      buffer.toString("ascii", 12, 16) === "IHDR" &&
      buffer.readUInt32BE(16) > 0 &&
      buffer.readUInt32BE(20) > 0 &&
      buffer.readUInt32BE(16) <= 4096 &&
      buffer.readUInt32BE(20) <= 4096
    );
  if (mime === "image/jpeg") {
    const hasEoi =
      (buffer.at(-2) === 255 && buffer.at(-1) === 217) ||
      buffer
        .subarray(Math.max(0, buffer.length - 32))
        .includes(Buffer.from([255, 217]));
    return (
      buffer.length >= 4 &&
      buffer[0] === 255 &&
      buffer[1] === 216 &&
      buffer[2] === 255 &&
      hasEoi
    );
  }
  if (mime === "image/webp") {
    if (buffer.length < 20) return false;
    if (buffer.toString("ascii", 0, 4) !== "RIFF") return false;
    if (buffer.toString("ascii", 8, 12) !== "WEBP") return false;
    const riffLen = buffer.readUInt32LE(4) + 8;
    if (riffLen !== buffer.length && riffLen !== buffer.length - 1) return false;
    return ["VP8 ", "VP8L", "VP8X"].includes(buffer.toString("ascii", 12, 16));
  }
  return false;
}
