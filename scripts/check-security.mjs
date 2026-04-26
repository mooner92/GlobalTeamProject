#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

const targetFile = process.argv[2] || "scripts/app.js";
const resolvedPath = path.resolve(process.cwd(), targetFile);

function getLineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function createSnippet(source, index) {
  const snippet = source
    .slice(index, index + 140)
    .replace(/\s+/g, " ")
    .trim();
  if (snippet.length <= 120) {
    return snippet;
  }
  return `${snippet.slice(0, 117)}...`;
}

function runCheck(source) {
  const checks = [
    {
      message: "Interpolated template literal assigned to innerHTML",
      pattern: /\binnerHTML\s*=\s*`(?:\\.|[^`\\])*\$\{(?:\\.|[^`\\])*`/g,
    },
    {
      message: "Interpolated template literal assigned to outerHTML",
      pattern: /\bouterHTML\s*=\s*`(?:\\.|[^`\\])*\$\{(?:\\.|[^`\\])*`/g,
    },
    {
      message: "Interpolated template literal passed to insertAdjacentHTML",
      pattern:
        /\binsertAdjacentHTML\s*\([^,]+,\s*`(?:\\.|[^`\\])*\$\{(?:\\.|[^`\\])*`/g,
    },
  ];

  const findings = [];

  for (const check of checks) {
    let match = check.pattern.exec(source);
    while (match !== null) {
      findings.push({
        line: getLineNumber(source, match.index),
        message: check.message,
        snippet: createSnippet(source, match.index),
      });
      match = check.pattern.exec(source);
    }
  }

  findings.sort((a, b) => a.line - b.line);
  return findings;
}

try {
  const source = readFileSync(resolvedPath, "utf8");
  const findings = runCheck(source);

  if (findings.length > 0) {
    console.error(
      `[check:security] FAIL: ${findings.length} risky HTML sink pattern(s) found in ${targetFile}`,
    );
    findings.forEach((finding) => {
      console.error(`- ${targetFile}:${finding.line} ${finding.message}`);
      console.error(`  snippet: ${finding.snippet}`);
    });
    process.exit(1);
  }

  console.log(
    `[check:security] PASS: no interpolated HTML sink patterns detected in ${targetFile}.`,
  );
} catch (error) {
  console.error(`[check:security] ERROR: ${error.message}`);
  process.exit(1);
}
