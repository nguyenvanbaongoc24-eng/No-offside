export const chatScope = (accountId, teamId) => String(accountId) + "::" + String(teamId);
export function localDay(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
export function messageGroup(messages, index) {
  const current = messages[index], previous = messages[index - 1];
  const newDay = !previous || localDay(previous.createdAt) !== localDay(current.createdAt);
  return { newDay, showSender: newDay || previous?.senderId !== current.senderId || Math.abs(new Date(current.createdAt) - new Date(previous.createdAt)) > 300000 };
}
export function dayLabel(value, now = new Date()) {
  const previous = new Date(now); previous.setDate(previous.getDate() - 1);
  if (localDay(value) === localDay(now)) return "Hôm nay";
  if (localDay(value) === localDay(previous)) return "Hôm qua";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Không rõ ngày" : date.toLocaleDateString("vi-VN");
}
