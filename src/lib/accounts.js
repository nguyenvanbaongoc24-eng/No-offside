export function maskedIdentifier(identifier = "") {
  if (identifier.includes("@")) {
    const [name, domain] = identifier.split("@");
    return name.slice(0, 2) + "•••@" + domain;
  }
  return identifier
    ? identifier.slice(0, 3) + "••••" + identifier.slice(-2)
    : "Phiên trải nghiệm trên thiết bị";
}
export function accountCacheKey(accountId, teamId) {
  return accountId + "::" + teamId;
}
