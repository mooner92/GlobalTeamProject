(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.KEIDataContract = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CONTRACT_FIELDS = [
    { key: "id", header: "No.", aliases: ["no", "no."] },
    { key: "type", header: "Type", aliases: ["type"] },
    { key: "title", header: "Title", aliases: ["title"] },
    { key: "pi", header: "PI", aliases: ["pi", "principal investigator"] },
    {
      key: "primaryFocus",
      header: "Primary Focus",
      aliases: ["primary focus"],
    },
    {
      key: "secondaryFocus",
      header: "Secondary Focus",
      aliases: ["secondary focus"],
    },
    {
      key: "projectStart",
      header: "Project Start",
      aliases: ["project start", "start"],
    },
    {
      key: "projectEnd",
      header: "Project End",
      aliases: ["project end", "end"],
    },
    {
      key: "thumbnail",
      header: "Thumbnail",
      aliases: ["thumbnail", "thumb"],
      optional: true,
    },
    {
      key: "pdfPath",
      header: "PDF",
      aliases: ["pdf", "pdf path"],
      optional: true,
    },
    {
      key: "sourceUrl",
      header: "Link",
      aliases: ["link", "url", "source link", "source url"],
      optional: true,
    },
    { key: "doi", header: "DOI", aliases: ["doi"], optional: true },
    { key: "isbn", header: "ISBN", aliases: ["isbn"], optional: true },
    { key: "issn", header: "ISSN", aliases: ["issn"], optional: true },
    {
      key: "authors",
      header: "Authors",
      aliases: ["authors", "author"],
      optional: true,
    },
    {
      key: "publishedDate",
      header: "Published",
      aliases: ["published", "publish date", "발간일"],
      optional: true,
    },
    {
      key: "abstract",
      header: "Abstract",
      aliases: ["abstract", "summary", "요약"],
      optional: true,
    },
    {
      key: "source",
      header: "Source",
      aliases: ["source", "출처"],
      optional: true,
    },
    {
      key: "coverUrl",
      header: "Cover URL",
      aliases: ["cover url", "cover", "thumbnail url"],
      optional: true,
    },
    {
      key: "elibUrl",
      header: "E-library URL",
      aliases: ["e-library url", "elib", "elib url"],
      optional: true,
    },
  ];

  const REQUIRED_HEADERS = CONTRACT_FIELDS.filter(function (field) {
    return !field.optional;
  }).map(function (field) {
    return field.header;
  });

  const ERROR_CODES = {
    WORKBOOK_PARSE_FAILED: "WORKBOOK_PARSE_FAILED",
    SHEET_NOT_FOUND: "SHEET_NOT_FOUND",
    MISSING_REQUIRED_HEADERS: "MISSING_REQUIRED_HEADERS",
    INVALID_SHEET_ROWS: "INVALID_SHEET_ROWS",
    PARSER_CONFIG_INVALID: "PARSER_CONFIG_INVALID",
  };

  function DataContractError(code, message, details) {
    this.name = "DataContractError";
    this.code = code;
    this.message = message;
    this.details = details || {};
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DataContractError);
    }
  }

  DataContractError.prototype = Object.create(Error.prototype);
  DataContractError.prototype.constructor = DataContractError;
  DataContractError.prototype.toJSON = function () {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  };

  function normalizeHeaderValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim().toLowerCase().replace(/\s+/g, " ");
  }

  function normalizeDisplayValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).trim();
  }

  // Focus columns occasionally hold a literal 0 returned by upstream
  // spreadsheet formulas. Treat 0 / "0" as empty so they never seed a
  // bogus "0" focus area in the UI.
  function normalizeFocusValue(value) {
    if (value === null || value === undefined) return "";
    if (value === 0) return "";
    const trimmed = String(value).trim();
    if (trimmed === "" || trimmed === "0") return "";
    return trimmed;
  }

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function excelSerialToTimestamp(serialValue) {
    if (typeof serialValue !== "number" || !Number.isFinite(serialValue)) {
      return null;
    }
    return Math.round((serialValue - 25569) * 86400 * 1000);
  }

  function buildSortableDateKey(timestamp) {
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
      return null;
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return [
      date.getUTCFullYear(),
      padDatePart(date.getUTCMonth() + 1),
      padDatePart(date.getUTCDate()),
    ].join("-");
  }

  function parseDeterministicDateValue(rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return {
        timestamp: null,
        sortableKey: null,
      };
    }

    if (rawValue instanceof Date) {
      const timestamp = rawValue.getTime();
      if (Number.isNaN(timestamp)) {
        return { timestamp: null, sortableKey: null };
      }
      return {
        timestamp: timestamp,
        sortableKey: buildSortableDateKey(timestamp),
      };
    }

    if (typeof rawValue === "number") {
      const timestamp = excelSerialToTimestamp(rawValue);
      if (timestamp === null) {
        return { timestamp: null, sortableKey: null };
      }
      return {
        timestamp: timestamp,
        sortableKey: buildSortableDateKey(timestamp),
      };
    }

    const normalizedText = normalizeDisplayValue(rawValue);
    const ymdMatch = normalizedText.match(
      /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/,
    );
    if (ymdMatch) {
      const year = Number.parseInt(ymdMatch[1], 10);
      const month = Number.parseInt(ymdMatch[2], 10);
      const day = Number.parseInt(ymdMatch[3], 10);
      const timestamp = Date.UTC(year, month - 1, day);
      const date = new Date(timestamp);
      if (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() + 1 === month &&
        date.getUTCDate() === day
      ) {
        return {
          timestamp: timestamp,
          sortableKey: buildSortableDateKey(timestamp),
        };
      }
    }

    return {
      timestamp: null,
      sortableKey: null,
    };
  }

  function normalizeFieldKey(fieldName) {
    if (!fieldName || typeof fieldName !== "string") {
      return "";
    }
    const normalized = fieldName.trim().toLowerCase();
    return normalized.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    });
  }

  function toPositiveInteger(value, defaultValue) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return defaultValue;
    }
    return parsed;
  }

  function wrapUnknownError(error, code, fallbackMessage, details) {
    if (error instanceof DataContractError) {
      return error;
    }

    const mergedDetails = Object.assign({}, details || {});
    if (error && error.message) {
      mergedDetails.cause = error.message;
    }

    return new DataContractError(code, fallbackMessage, mergedDetails);
  }

  function resolveColumnIndex(headers, field) {
    const aliases = field.aliases || [];
    for (let i = 0; i < headers.length; i += 1) {
      const headerValue = normalizeHeaderValue(headers[i]);
      for (let j = 0; j < aliases.length; j += 1) {
        const alias = aliases[j];
        if (headerValue === alias) {
          return i;
        }
      }
    }
    return -1;
  }

  function buildColumnMap(headers) {
    const map = {};
    const missingHeaders = [];

    CONTRACT_FIELDS.forEach(function (field) {
      const index = resolveColumnIndex(headers, field);
      if (index === -1) {
        if (!field.optional) missingHeaders.push(field.header);
        return;
      }
      map[field.key] = index;
    });

    const idHeaderMissing = missingHeaders.includes("No.");
    if (idHeaderMissing && normalizeHeaderValue(headers[0]) === "") {
      map.id = 0;
      const idHeaderIndex = missingHeaders.indexOf("No.");
      missingHeaders.splice(idHeaderIndex, 1);
    }

    return {
      map: map,
      missingHeaders: missingHeaders,
    };
  }

  function findHeaderRow(rows, maxScanRows) {
    const scanLimit = Math.min(maxScanRows, rows.length);
    for (let i = 0; i < scanLimit; i += 1) {
      const row = rows[i];
      if (!Array.isArray(row)) {
        continue;
      }

      let matchedFieldCount = 0;
      CONTRACT_FIELDS.forEach(function (field) {
        if (resolveColumnIndex(row, field) !== -1) {
          matchedFieldCount += 1;
        }
      });

      if (matchedFieldCount >= 5) {
        return i;
      }
    }
    return -1;
  }

  function assertValidHeaders(headers, metadata) {
    const result = buildColumnMap(headers);
    if (result.missingHeaders.length > 0) {
      throw new DataContractError(
        ERROR_CODES.MISSING_REQUIRED_HEADERS,
        "Required headers are missing. Verify the spreadsheet column names and retry.",
        {
          requiredHeaders: REQUIRED_HEADERS,
          missingHeaders: result.missingHeaders,
          observedHeaders: headers.map(function (header) {
            return normalizeDisplayValue(header);
          }),
          headerRowIndex: metadata.headerRowIndex,
          headerRowNumber: metadata.headerRowIndex + 1,
          headerScanDepth: metadata.headerScanDepth,
        },
      );
    }
    return result.map;
  }

  function parseSpreadsheetRows(rows, options) {
    const parseOptions = options || {};
    if (!Array.isArray(rows)) {
      throw new DataContractError(
        ERROR_CODES.INVALID_SHEET_ROWS,
        "Sheet rows must be an array.",
        { rowType: typeof rows },
      );
    }

    const defaultScanDepth = 10;
    const configuredScanDepth = toPositiveInteger(
      parseOptions.headerScanLimit,
      defaultScanDepth,
    );
    const headerScanDepth = Math.min(
      configuredScanDepth,
      rows.length || configuredScanDepth,
    );
    const headerRowIndex = findHeaderRow(rows, headerScanDepth);

    if (headerRowIndex === -1) {
      throw new DataContractError(
        ERROR_CODES.MISSING_REQUIRED_HEADERS,
        "Could not find a recognizable header row in the scanned range.",
        {
          requiredHeaders: REQUIRED_HEADERS,
          missingHeaders: REQUIRED_HEADERS,
          observedHeaders: rows.slice(0, headerScanDepth).map(function (row) {
            if (!Array.isArray(row)) {
              return [];
            }
            return row.map(function (cell) {
              return normalizeDisplayValue(cell);
            });
          }),
          headerRowIndex: -1,
          headerRowNumber: null,
          headerScanDepth: headerScanDepth,
          reason: "header_row_not_found",
        },
      );
    }

    const headers = Array.isArray(rows[headerRowIndex])
      ? rows[headerRowIndex]
      : [];
    const columnMap = assertValidHeaders(headers, {
      headerRowIndex: headerRowIndex,
      headerScanDepth: headerScanDepth,
    });
    const dataRows = rows.slice(headerRowIndex + 1);

    const projects = dataRows
      .map(function (row, index) {
        if (!Array.isArray(row) || row.length === 0) {
          return null;
        }

        const title = normalizeDisplayValue(row[columnMap.title]);
        if (!title) {
          return null;
        }

        const primaryFocus = normalizeFocusValue(row[columnMap.primaryFocus]);
        const secondaryFocus = normalizeFocusValue(
          row[columnMap.secondaryFocus],
        );
        const rawId = row[columnMap.id];
        const projectStartDate = parseDeterministicDateValue(
          row[columnMap.projectStart],
        );
        const projectEndDate = parseDeterministicDateValue(
          row[columnMap.projectEnd],
        );

        const thumbnail =
          columnMap.thumbnail !== undefined
            ? normalizeDisplayValue(row[columnMap.thumbnail])
            : "";
        const pdfPath =
          columnMap.pdfPath !== undefined
            ? normalizeDisplayValue(row[columnMap.pdfPath])
            : "";
        const sourceUrl =
          columnMap.sourceUrl !== undefined
            ? normalizeDisplayValue(row[columnMap.sourceUrl])
            : "";
        const doi =
          columnMap.doi !== undefined
            ? normalizeDisplayValue(row[columnMap.doi])
            : "";
        const isbn =
          columnMap.isbn !== undefined
            ? normalizeDisplayValue(row[columnMap.isbn])
            : "";
        const issn =
          columnMap.issn !== undefined
            ? normalizeDisplayValue(row[columnMap.issn])
            : "";
        const authors =
          columnMap.authors !== undefined
            ? normalizeDisplayValue(row[columnMap.authors])
            : "";
        const publishedDate =
          columnMap.publishedDate !== undefined
            ? normalizeDisplayValue(row[columnMap.publishedDate])
            : "";
        const abstract =
          columnMap.abstract !== undefined
            ? normalizeDisplayValue(row[columnMap.abstract])
            : "";
        const source =
          columnMap.source !== undefined
            ? normalizeDisplayValue(row[columnMap.source])
            : "";
        const coverUrl =
          columnMap.coverUrl !== undefined
            ? normalizeDisplayValue(row[columnMap.coverUrl])
            : "";
        const elibUrl =
          columnMap.elibUrl !== undefined
            ? normalizeDisplayValue(row[columnMap.elibUrl])
            : "";

        return {
          id: rawId || index + 1,
          sourceRowIndex: index,
          type: normalizeDisplayValue(row[columnMap.type]),
          title: title,
          pi: normalizeDisplayValue(row[columnMap.pi]),
          primaryFocus: primaryFocus,
          secondaryFocus: secondaryFocus,
          projectStart: row[columnMap.projectStart],
          projectEnd: row[columnMap.projectEnd],
          projectStartTimestamp: projectStartDate.timestamp,
          projectStartSortableKey: projectStartDate.sortableKey,
          projectEndTimestamp: projectEndDate.timestamp,
          projectEndSortableKey: projectEndDate.sortableKey,
          primaryFocusKey: normalizeFieldKey(primaryFocus),
          secondaryFocusKey: normalizeFieldKey(secondaryFocus),
          thumbnail: thumbnail,
          pdfPath: pdfPath,
          sourceUrl: sourceUrl,
          doi: doi,
          isbn: isbn,
          issn: issn,
          authors: authors,
          publishedDate: publishedDate,
          abstract: abstract,
          source: source,
          coverUrl: coverUrl,
          elibUrl: elibUrl,
        };
      })
      .filter(function (project) {
        return project !== null;
      });

    return {
      headerRowIndex: headerRowIndex,
      headerRowNumber: headerRowIndex + 1,
      headerScanDepth: headerScanDepth,
      headers: headers,
      columnMap: columnMap,
      projects: projects,
    };
  }

  function parseWorkbookData(workbook, xlsxLib, options) {
    const parseOptions = options || {};
    const sheetName = parseOptions.sheetName || "List";

    if (!workbook || typeof workbook !== "object" || !workbook.Sheets) {
      throw new DataContractError(
        ERROR_CODES.WORKBOOK_PARSE_FAILED,
        "Workbook payload is unreadable. Please verify the file and try again.",
        { sheetName: sheetName },
      );
    }

    if (
      !workbook.Workbook ||
      !Array.isArray(workbook.SheetNames) ||
      workbook.SheetNames.length === 0
    ) {
      throw new DataContractError(
        ERROR_CODES.WORKBOOK_PARSE_FAILED,
        "Workbook structure is invalid. Confirm the file is a valid .xlsx workbook.",
        { sheetName: sheetName },
      );
    }

    if (
      !xlsxLib ||
      !xlsxLib.utils ||
      typeof xlsxLib.utils.sheet_to_json !== "function"
    ) {
      throw new DataContractError(
        ERROR_CODES.PARSER_CONFIG_INVALID,
        "XLSX parser utilities are unavailable.",
        { sheetName: sheetName },
      );
    }

    const listSheet = workbook.Sheets[sheetName];
    if (!listSheet) {
      throw new DataContractError(
        ERROR_CODES.SHEET_NOT_FOUND,
        "Required sheet '" + sheetName + "' was not found.",
        {
          sheetName: sheetName,
          availableSheets: Array.isArray(workbook.SheetNames)
            ? workbook.SheetNames
            : [],
        },
      );
    }

    let rows;
    try {
      rows = xlsxLib.utils.sheet_to_json(listSheet, { header: 1, raw: true });
    } catch (error) {
      throw wrapUnknownError(
        error,
        ERROR_CODES.WORKBOOK_PARSE_FAILED,
        "Failed to parse spreadsheet rows. Please verify workbook integrity.",
        { sheetName: sheetName },
      );
    }

    const parsedRows = parseSpreadsheetRows(rows, parseOptions);
    return Object.assign({}, parsedRows, {
      sheetName: sheetName,
    });
  }

  function parseWorkbookFromArrayBuffer(arrayBuffer, xlsxLib, options) {
    if (!xlsxLib || typeof xlsxLib.read !== "function") {
      throw new DataContractError(
        ERROR_CODES.PARSER_CONFIG_INVALID,
        "XLSX parser is unavailable.",
        {},
      );
    }

    let workbook;
    try {
      workbook = xlsxLib.read(arrayBuffer, { type: "array" });
    } catch (error) {
      throw wrapUnknownError(
        error,
        ERROR_CODES.WORKBOOK_PARSE_FAILED,
        "Workbook could not be opened. Confirm the file is a valid .xlsx workbook.",
        {},
      );
    }

    return parseWorkbookData(workbook, xlsxLib, options);
  }

  function parseWorkbookFromFile(filePath, xlsxLib, options) {
    if (!xlsxLib || typeof xlsxLib.readFile !== "function") {
      throw new DataContractError(
        ERROR_CODES.PARSER_CONFIG_INVALID,
        "XLSX file reader is unavailable.",
        { filePath: filePath },
      );
    }

    let workbook;
    try {
      workbook = xlsxLib.readFile(filePath, { cellDates: true });
    } catch (error) {
      throw wrapUnknownError(
        error,
        ERROR_CODES.WORKBOOK_PARSE_FAILED,
        "Workbook could not be opened. Confirm the file path and file format.",
        { filePath: filePath },
      );
    }

    return parseWorkbookData(workbook, xlsxLib, options);
  }

  return {
    CONTRACT_FIELDS: CONTRACT_FIELDS,
    REQUIRED_HEADERS: REQUIRED_HEADERS,
    ERROR_CODES: ERROR_CODES,
    DataContractError: DataContractError,
    normalizeFieldKey: normalizeFieldKey,
    parseSpreadsheetRows: parseSpreadsheetRows,
    parseWorkbookData: parseWorkbookData,
    parseWorkbookFromArrayBuffer: parseWorkbookFromArrayBuffer,
    parseWorkbookFromFile: parseWorkbookFromFile,
  };
});
