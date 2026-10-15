import { useLayoutEffect, useState } from "react";
import { readStored, writeStored } from "../lib/storage";
export const defaultAppearance = { theme: "system", fontFamily: "Be Vietnam Pro", fontSize: "medium" };
export function usePersonalAppearance(accountId) {
  const key = "no_offside_appearance_" + accountId;
  const [state, setState] = useState(() => ({
    key,
    value: readStored(key, defaultAppearance),
  }));
  const [error, setError] = useState("");
  const value =
    state.key === key ? state.value : readStored(key, defaultAppearance);
  useLayoutEffect(() => {
    setState({ key, value: readStored(key, defaultAppearance) });
    setError("");
    writeStored("no_offside_appearance_account", accountId);
  }, [key, accountId]);
  const update = (patch) => {
    const next = { ...value, ...patch };
    if (!writeStored(key, next)) {
      setError("Không lưu được tùy chọn. Giao diện vẫn giữ lựa chọn trước đó.");
      return;
    }
    setState({ key, value: next });
    setError("");
  };
  return { value, update, error };
}
