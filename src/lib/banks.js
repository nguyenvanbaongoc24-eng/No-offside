import { readStored, writeStored } from "./storage.js";
export const BANKS_ENDPOINT = "https://api.vietqr.io/v2/banks";
const CACHE = "no_offside_vietqr_banks_v1";
let request;
export const bankSearchKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
export function normalizeBanks(data) {
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  return data
    .filter(
      (bank) =>
        bank.transferSupported === 1 &&
        /^\d{6}$/.test(String(bank.bin)) &&
        !seen.has(bank.bin) &&
        seen.add(bank.bin),
    )
    .map((bank) => ({
      bin: String(bank.bin),
      name: bank.name,
      shortName: bank.shortName || bank.code,
      code: bank.code,
      transferSupported: 1,
    }))
    .sort((a, b) => a.shortName.localeCompare(b.shortName, "vi"));
}
export function searchBanks(banks, term) {
  const key = bankSearchKey(term).trim();
  return banks.filter((bank) =>
    bankSearchKey(
      `${bank.name} ${bank.shortName} ${bank.code} ${bank.bin}`,
    ).includes(key),
  );
}
export async function loadBanks(force = false) {
  const cached = readStored(CACHE, null);
  if (
    !force &&
    cached?.at > Date.now() - 86400000 &&
    normalizeBanks(cached.banks).length
  )
    return { banks: normalizeBanks(cached.banks), stale: false };
  if (!request)
    request = (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response;
        try {
          response = await fetch(BANKS_ENDPOINT, { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) throw new Error("Không tải được danh mục ngân hàng.");
        const result = await response.json();
        const banks = normalizeBanks(result.data);
        if (result.code !== "00" || !banks.length)
          throw new Error("Danh mục ngân hàng không hợp lệ.");
        writeStored(CACHE, { at: Date.now(), banks });
        return { banks, stale: false };
      } catch (error) {
        const banks = normalizeBanks(cached?.banks);
        if (banks.length) return { banks, stale: true };
        throw new Error(
          "Không tải được ngân hàng. Kiểm tra kết nối và thử lại.",
        );
      } finally {
        request = null;
      }
    })();
  return request;
}
