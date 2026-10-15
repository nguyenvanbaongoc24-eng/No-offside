let pending = 0;
export function pendingWriteCount() {
  return pending;
}
export function beginPendingWrite() {
  pending++;
  if (typeof window !== "undefined") window.__no_offside_busy_saving = true;
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    pending--;
    if (typeof window !== "undefined")
      window.__no_offside_busy_saving = pending > 0;
  };
}
export async function withPendingWrite(task) {
  const finish = beginPendingWrite();
  try {
    return await task();
  } finally {
    finish();
  }
}
