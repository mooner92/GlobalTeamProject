#!/usr/bin/env node

import { accessSync, constants, readFileSync } from "node:fs";

const rootDir = new URL("..", import.meta.url);
const readmePath = new URL("../ReadMe.md", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);

const readme = readFileSync(readmePath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const scripts = packageJson.scripts || {};

const issues = [];

const placeholderTokens = [
  "yourusername",
  "[contact email]",
  "[Specify your license here]",
  "TBD",
];

for (const token of placeholderTokens) {
  if (readme.includes(token)) {
    issues.push(`placeholder token found in ReadMe.md: "${token}"`);
  }
}

function pathFromRepo(token) {
  const normalized = token.replace(/^\.\//, "").replace(/^\//, "");
  return new URL(`./${normalized}`, rootDir);
}

function fileExists(token) {
  try {
    accessSync(pathFromRepo(token), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const codeBlockRegex = /```[\s\S]*?```/g;
const codeBlocks = readme.match(codeBlockRegex) || [];

for (const block of codeBlocks) {
  const lines = block.split("\n").slice(1, -1);

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith("//")
    ) {
      continue;
    }

    for (const match of trimmed.matchAll(/\bnpm run\s+([\w:-]+)/g)) {
      const scriptName = match[1];
      if (!scripts[scriptName]) {
        issues.push(`unknown npm script in README: npm run ${scriptName}`);
      }
    }

    for (const match of trimmed.matchAll(/\bnode\s+([^\s]+)/g)) {
      const arg = match[1].replace(/["']/g, "");
      if (!arg.endsWith(".mjs") && !arg.endsWith(".js")) {
        continue;
      }

      if (!fileExists(arg)) {
        issues.push(`missing referenced script path in README: ${arg}`);
      }
    }

    if (/git clone/.test(trimmed)) {
      const urlMatch = trimmed.match(/git clone\s+([^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        if (/yourusername|your_repo|your-repo|<.+>/.test(url)) {
          issues.push(`invalid clone URL placeholder in README: ${url}`);
        }
      }
    }

    const pathTokenRegex =
      /`([^`\s]+\.(?:html|xlsx|mjs|js|json|yml|yaml|css|md|txt))`/g;
    for (const match of trimmed.matchAll(pathTokenRegex)) {
      const token = match[1];
      if (token.startsWith("http://") || token.startsWith("https://")) {
        continue;
      }

      const fileToken = token.split("|")[0];
      if (!fileExists(fileToken)) {
        issues.push(`missing referenced file in README: ${fileToken}`);
      }
    }
  }
}

if (issues.length > 0) {
  console.error("[docs:check] FAILED");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  "[docs:check] PASS: README instructions and snippets are consistent.",
);
