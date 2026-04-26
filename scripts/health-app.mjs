#!/usr/bin/env node

const defaultBaseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:4173";
const defaultTargets = ["/index.html", "/data/projects.xlsx"];

function normalizeTarget(baseUrl, target) {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  if (target.startsWith("/")) {
    return `${baseUrl}${target}`;
  }

  return `${baseUrl}/${target}`;
}

function parseArgs(args) {
  const targets = [];
  let baseUrl = defaultBaseUrl;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--base-url") {
      const value = args[i + 1];
      if (!value) {
        console.error("[health:app] Missing value for --base-url");
        process.exit(1);
      }
      baseUrl = value.replace(/\/$/, "");
      i += 1;
      continue;
    }

    targets.push(arg);
  }

  return {
    baseUrl,
    targets: targets.length > 0 ? targets : defaultTargets,
  };
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) {
      return {
        ok: false,
        message: `[health:app] ${url} -> HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      message: `[health:app] ${url} -> HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `[health:app] ${url} -> request failed (${error.message})`,
    };
  }
}

async function main() {
  const { baseUrl, targets } = parseArgs(process.argv.slice(2));
  const urls = targets.map((target) => normalizeTarget(baseUrl, target));

  let hasFailure = false;

  for (const url of urls) {
    const result = await checkUrl(url);
    if (!result.ok) {
      hasFailure = true;
      console.error(result.message);
      continue;
    }

    console.log(result.message);
  }

  if (hasFailure) {
    console.error(
      "[health:app] FAILED: required app endpoint(s) are unreachable.",
    );
    process.exit(1);
  }

  console.log("[health:app] PASS: required app endpoints are reachable.");
}

main();
