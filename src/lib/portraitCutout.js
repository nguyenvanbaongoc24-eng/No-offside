// Optional on-device portrait segmentation. No image is uploaded to a service.
export async function portraitCutout(source) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () =>
      reject(Error("Không đọc được ảnh. Hãy chọn ảnh từ thiết bị."));
  });
  image.src = source;
  await loaded;
  const max = 640,
    ratio = Math.min(
      1,
      max / Math.max(image.naturalWidth, image.naturalHeight),
    ),
    canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { FilesetResolver, ImageSegmenter } = await import(
    "@mediapipe/tasks-vision"
  );
  const runtime = await FilesetResolver.forVisionTasks("/ml-runtime");
  const response = await fetch(
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite",
    { signal: AbortSignal.timeout(20000) },
  );
  if (!response.ok) throw Error("Chưa tải được mô hình tách nền.");
  const buffer = new Uint8Array(await response.arrayBuffer());
  let segmenter;
  try {
    segmenter = await ImageSegmenter.createFromOptions(runtime, {
      baseOptions: { modelAssetBuffer: buffer, delegate: "CPU" },
      runningMode: "IMAGE",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
    const result = segmenter.segment(canvas),
      mask = result.confidenceMasks?.[0];
    if (!mask) throw Error("Không nhận diện được chân dung.");
    try {
      const categories = mask.getAsFloat32Array(),
        maskCanvas = document.createElement("canvas");
      maskCanvas.width = mask.width;
      maskCanvas.height = mask.height;
      const maskCtx = maskCanvas.getContext("2d"),
        pixels = maskCtx.createImageData(mask.width, mask.height);
      let foreground = 0;
      for (let i = 0; i < categories.length; i++) {
        const alpha = Math.max(
          0,
          Math.min(255, Math.round(((categories[i] - 0.2) / 0.6) * 255)),
        );
        foreground += alpha > 128 ? 1 : 0;
        pixels.data[i * 4 + 3] = alpha;
      }
      if (foreground < categories.length * 0.01)
        throw Error("Chưa nhận diện được người. Hãy thử ảnh chân dung rõ hơn.");
      maskCtx.putImageData(pixels, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      result.close();
    }
  } finally {
    segmenter?.close();
  }
}
