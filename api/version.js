export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || "";
  const version = commitSha ? commitSha.slice(0, 10) : (process.env.VERCEL_DEPLOYMENT_ID || "dev");

  return res.status(200).json({
    version,
    buildTime: new Date().toISOString(),
    commit: commitSha || "local",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null
  });
}
