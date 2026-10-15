export function normalizeMemberSearch(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}
export function matchesMemberSearch(member, query) {
  const search = normalizeMemberSearch(query);
  if (!search) return true;
  if (/^#\s*\d+$/.test(search))
    return Number(member.number) === Number(search.replace(/[#\s]/g, ""));
  return [member.name, member.number, member.role, member.customTitle].some(
    (value) => normalizeMemberSearch(value).includes(search),
  );
}
