import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const {
  parseWorkbookFromFile,
  DataContractError,
  REQUIRED_HEADERS,
} = require("./data/contract.js");

function parseCliArgs(argv) {
  const options = {
    inputPath: null,
    sheetName: "List",
    headerScanDepth: 20,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--sheet") {
      const value = argv[index + 1];
      if (!value) {
        throw new DataContractError(
          "INVALID_CLI_ARGUMENT",
          "Missing value for --sheet.",
          {},
        );
      }
      options.sheetName = value;
      index += 1;
      continue;
    }

    if (arg === "--header-scan-depth") {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isNaN(value) || value <= 0) {
        throw new DataContractError(
          "INVALID_CLI_ARGUMENT",
          "Expected positive integer for --header-scan-depth.",
          { providedValue: argv[index + 1] },
        );
      }
      options.headerScanDepth = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new DataContractError(
        "INVALID_CLI_ARGUMENT",
        `Unknown argument: ${arg}`,
        {},
      );
    }

    if (!options.inputPath) {
      options.inputPath = arg;
      continue;
    }

    throw new DataContractError(
      "INVALID_CLI_ARGUMENT",
      `Unexpected positional argument: ${arg}`,
      {},
    );
  }

  return options;
}

function resolveInputPath(inputArg) {
  const relativeInput = inputArg || path.join("data", "projects.xlsx");
  if (path.isAbsolute(relativeInput)) {
    return relativeInput;
  }
  return path.resolve(process.cwd(), relativeInput);
}

const DOI_REGEX = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i;
const SOURCE_WHITELIST = new Set([
  "research",
  "elibrary",
  "journal",
  "working-paper",
]);

function isSafeUrl(value) {
  return value.startsWith("https://") || value.startsWith("data/");
}

function validateSpreadsheet(filePath, options) {
  const parsed = parseWorkbookFromFile(filePath, XLSX, {
    sheetName: options.sheetName,
    headerScanLimit: options.headerScanDepth,
  });

  return {
    filePath,
    sheetName: parsed.sheetName,
    projectCount: parsed.projects.length,
    headerRowIndex: parsed.headerRowIndex,
    headerRowNumber: parsed.headerRowNumber,
    headerScanDepth: parsed.headerScanDepth,
    requiredHeaders: REQUIRED_HEADERS,
    normalizedFocusKeys: parsed.projects.reduce((acc, project) => {
      if (project.primaryFocusKey) acc.add(project.primaryFocusKey);
      if (project.secondaryFocusKey) acc.add(project.secondaryFocusKey);
      return acc;
    }, new Set()).size,
    deterministicDateModel: {
      projectStartTimestampPresent: parsed.projects.every((project) =>
        Object.prototype.hasOwnProperty.call(project, "projectStartTimestamp"),
      ),
      projectStartSortableKeyPresent: parsed.projects.every((project) =>
        Object.prototype.hasOwnProperty.call(
          project,
          "projectStartSortableKey",
        ),
      ),
      validProjectStartTimestampCount: parsed.projects.reduce(
        (count, project) => {
          return Number.isFinite(project.projectStartTimestamp)
            ? count + 1
            : count;
        },
        0,
      ),
    },
    projects: parsed.projects,
  };
}

function formatError(error) {
  if (error instanceof DataContractError) {
    return error.toJSON();
  }
  return {
    name: error.name || "Error",
    code: "UNEXPECTED_VALIDATION_ERROR",
    message: error.message,
    details: {},
  };
}

try {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  const inputPath = resolveInputPath(cliOptions.inputPath);
  const result = validateSpreadsheet(inputPath, cliOptions);

  // Post-pass: emit warnings (non-fatal) for optional field value issues.
  for (const project of result.projects) {
    const id = project.id;

    if (project.doi && !DOI_REGEX.test(project.doi)) {
      console.warn(
        `[DATA_VALIDATION_WARN] id=${id} field=doi value="${project.doi}"`,
      );
    }

    if (project.coverUrl && !isSafeUrl(project.coverUrl)) {
      console.warn(
        `[DATA_VALIDATION_WARN] id=${id} field=coverUrl value="${project.coverUrl}"`,
      );
    }

    if (project.elibUrl && !isSafeUrl(project.elibUrl)) {
      console.warn(
        `[DATA_VALIDATION_WARN] id=${id} field=elibUrl value="${project.elibUrl}"`,
      );
    }

    if (project.source && !SOURCE_WHITELIST.has(project.source.toLowerCase())) {
      console.warn(
        `[DATA_VALIDATION_WARN] id=${id} field=source value="${project.source}"`,
      );
    }
  }

  // Remove internal projects array from printed JSON (it's large and not part of the contract summary).
  // eslint-disable-next-line no-unused-vars
  const { projects: _projects, ...summary } = result;
  console.log("[DATA_VALIDATION_OK]");
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  const formatted = formatError(error);
  console.error("[DATA_VALIDATION_ERROR]");
  console.error(JSON.stringify(formatted, null, 2));
  process.exitCode = 1;
}
