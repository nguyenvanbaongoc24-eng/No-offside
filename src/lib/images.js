export async function imageDataUrl(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chọn ảnh JPG, PNG hoặc WebP.');
  if (file.size > 2 * 1024 * 1024) throw new Error('Ảnh cần nhỏ hơn 2 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.readAsDataURL(file);
  });
}
