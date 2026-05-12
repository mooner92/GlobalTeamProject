#!/usr/bin/env node
// Minimal static-file server used by `npm run dev` and CI.
// Replaces the python3 dependency for Windows / lean environments.
//
// Usage:
//   node scripts/serve.mjs [port]
//   PORT=4173 node scripts/serve.mjs

import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = normalize(join(__dirname, ".."));
const port = Number.parseInt(process.argv[2] || process.env.PORT || "4173", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0].split("#")[0]);
  // Route swap: `/` serves the project catalogue (more heavily used).
  // The legacy gateway/landing remains directly reachable at `/index.html`
  // via the "Try demo landing page!" CTA in the catalogue header.
  const candidate = normalize(
    join(root, decoded === "/" ? "/all-projects.html" : decoded),
  );
  if (!candidate.startsWith(root + sep) && candidate !== root) {
    return null;
  }
  return candidate;
}

const server = http.createServer((req, res) => {
  const target = safeJoin(repoRoot, req.url || "/");
  if (!target) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  let stat;
  try {
    stat = statSync(target);
  } catch {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const filePath = stat.isDirectory() ? join(target, "index.html") : target;
  let finalStat;
  try {
    finalStat = statSync(filePath);
  } catch {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const mime =
    MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": finalStat.size,
    "Cache-Control": "no-cache",
    "Last-Modified": finalStat.mtime.toUTCString(),
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[serve] http://127.0.0.1:${port}/  root=${repoRoot}`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
