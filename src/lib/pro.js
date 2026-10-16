export const LEVELS = {
  beginner: "Mới chơi",
  regular: "Khá cứng",
  advanced: "Chuyên nghiệp",
};
export const FINANCE = {
  split: "Cưa đôi 50/50",
  loser: "Đội thua trả tiền sân",
};
export function splitBill(total, ids) {
  const unique = [...new Set(ids)].sort();
  if (
    !Number.isSafeInteger(total) ||
    total < unique.length ||
    total > 1e9 ||
    !unique.length
  )
    throw Error("Tổng bill và người tham gia không hợp lệ.");
  return unique.map((id, i) => ({
    id,
    amount:
      Math.floor(total / unique.length) + (i < total % unique.length ? 1 : 0),
  }));
}
export function mediaLink(value) {
  let u;
  try {
    u = new URL(value.trim());
  } catch {
    throw Error("Nhập liên kết đầy đủ.");
  }
  if (u.protocol !== "https:" || u.username || u.password)
    throw Error("Chỉ dùng liên kết HTTPS.");
  let id;
  if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtube-nocookie.com",
    ].includes(u.hostname)
  ) {
    id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") || u.pathname.split("/").filter(Boolean)[1];
    if (!/^[\w-]{11}$/.test(id || ""))
      throw Error("Link YouTube không hợp lệ.");
    return {
      kind: "youtube",
      url: "https://www.youtube-nocookie.com/embed/" + id,
    };
  }
  if (["www.tiktok.com", "tiktok.com"].includes(u.hostname)) {
    id = u.pathname.match(/\/(?:video|v1)\/(\d{10,25})/)?.[1];
    if (!id)
      throw Error(
        "Dùng link TikTok đầy đủ có /video/; link rút gọn chưa hỗ trợ.",
      );
    return { kind: "tiktok", url: "https://www.tiktok.com/player/v1/" + id };
  }
  if (
    /^[a-z][a-z0-9.-]*\.[a-z]{2,63}$/i.test(u.hostname) &&
    /\.(png|jpe?g|webp)$/i.test(u.pathname) &&
    !u.search &&
    !u.hash &&
    !u.port &&
    !/localhost|\.local$/i.test(u.hostname)
  )
    return { kind: "image", url: u.href };
  throw Error("Hỗ trợ YouTube/Shorts, TikTok và link ảnh PNG/JPG/WebP.");
}
export function proRanking(members = [], stats = [], reports = {}) {
  return members
    .filter((m) => m.membershipStatus !== "removed")
    .map((m) => {
      const matchIds = new Set([
        ...Object.keys(reports[m.id] || {}),
        ...stats.filter((s) => s.subject === m.id).map((s) => s.match_id),
      ]);
      let goals = 0,
        assists = 0;
      for (const id of matchIds) {
        const r =
          stats.find((s) => s.subject === m.id && s.match_id === id) ||
          reports[m.id]?.[id];
        goals += Number(r?.goals) || 0;
        assists += Number(r?.assists) || 0;
      }
      return { ...m, stats: { goals, assists, matches: matchIds.size } };
    })
    .sort(
      (a, b) =>
        b.stats.goals - a.stats.goals ||
        b.stats.assists - a.stats.assists ||
        a.name.localeCompare(b.name, "vi"),
    );
}
export function motmWinners(votes = [], matches = [], now = Date.now()) {
  const result = {};
  for (const match of matches) {
    const time = Date.parse(match.datetime);
    if (
      match.status !== "completed" ||
      !Number.isFinite(time) ||
      time > now ||
      now - time > 7 * 864e5
    )
      continue;
    const counts = {};
    votes
      .filter((v) => v.match_id === match.id)
      .forEach((v) => (counts[v.candidate] = (counts[v.candidate] || 0) + 1));
    const sorted = Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    if (sorted.length && (sorted.length === 1 || sorted[0][1] > sorted[1][1]))
      result[sorted[0][0]] = true;
  }
  return result;
}
export async function downloadDesign(node, name) {
  await document.fonts?.ready;
  await Promise.all(
    [...node.querySelectorAll("img")].map((img) =>
      img.decode?.().catch(() => {}),
    ),
  );
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  });
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw Error("Không xuất được ảnh.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function weeklyAwards(awards = [], now = Date.now()) {
  return Object.fromEntries(
    awards
      .filter((a) => Date.parse(a.valid_until) > now)
      .map((a) => [a.winner, true]),
  );
}
